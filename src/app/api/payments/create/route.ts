import { NextResponse, type NextRequest } from "next/server";
import { getAccessContext } from "@/lib/access";
import { getActiveProductForCheckout, getCurrentProductPrice, type Order } from "@/lib/services/billing";
import type { Profile } from "@/lib/db/types";
import { createMercadoPagoPreference, isMercadoPagoConfigured } from "@/lib/services/mercado-pago";
import {
  canCreateMercadoPagoCheckout,
  isPaymentSiteUrlSafe,
  isTrustedCheckoutOrigin,
} from "@/lib/services/payment-security.mjs";
import { recordProductEvent } from "@/lib/services/product-events";
import { logServerError, publicDatabaseErrorMessage } from "@/lib/security/public-errors";
import { checkRateLimit, userRateLimitIdentifier } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-config";
import {
  getSiteUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export const runtime = "nodejs";

const creditPackageSlugPattern = /^creditos-(20|50|100)$/;
const pendingCreditPackageOrderMs = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  if (
    !isTrustedCheckoutOrigin({
      origin: request.headers.get("origin"),
      secFetchSite: request.headers.get("sec-fetch-site"),
      siteUrl: getSiteUrl(),
      nodeEnv: process.env.NODE_ENV,
    })
  ) {
    return NextResponse.json(
      { ok: false, message: "Origem do checkout não autorizada." },
      { status: 403 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Supabase não configurado." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Entre na sua conta antes de iniciar a compra." },
      { status: 401 },
    );
  }

  const rateLimit = await checkRateLimit({
    operation: "payments.create",
    identifier: userRateLimitIdentifier(user.id),
    limit: 5,
    windowSeconds: 10 * 60,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Supabase administrativo não configurado." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const typedProfile = profile as Profile | null;
  const access = getAccessContext(typedProfile);
  const body = await readCheckoutBody(request);
  const productSlug = normalizeProductSlug(body.productSlug);
  if (body.productSlug && !productSlug) {
    return NextResponse.json(
      { ok: false, message: "Pacote de créditos inválido." },
      { status: 400 },
    );
  }

  if (access.hasPlatformAccess && !productSlug) {
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  }

  if (productSlug && !access.hasPlatformAccess) {
    return NextResponse.json(
      { ok: false, message: "Compre o acesso antes de adicionar créditos avulsos." },
      { status: 403 },
    );
  }

  const product = await getActiveProductForCheckout(admin, productSlug ?? undefined);
  if (productSlug && product.product_kind !== "credit_package") {
    return NextResponse.json(
      { ok: false, message: "Produto de créditos não encontrado." },
      { status: 404 },
    );
  }
  if (!productSlug && product.product_kind !== "access") {
    return NextResponse.json(
      { ok: false, message: "Produto principal não encontrado." },
      { status: 404 },
    );
  }
  if (!canCreateMercadoPagoCheckout(product)) {
    return NextResponse.json(
      { ok: false, message: "Checkout real ainda não está liberado." },
      { status: 409 },
    );
  }

  if (!isPaymentSiteUrlSafe(getSiteUrl(), process.env.NODE_ENV)) {
    return NextResponse.json(
      { ok: false, message: "URL pública do app inválida para pagamentos." },
      { status: 503 },
    );
  }

  const amountCents = getCurrentProductPrice(product);
  const checkoutRoute =
    product.product_kind === "credit_package" ? "/dashboard/creditos" : "/checkout";
  const orderExpiresAt =
    product.product_kind === "credit_package"
      ? new Date(Date.now() + pendingCreditPackageOrderMs).toISOString()
      : product.access_valid_until;

  await recordProductEvent({
    supabase: admin,
    userId: user.id,
    eventName: "checkout_started",
    route: checkoutRoute,
    metadata: {
      product_id: product.id,
      product_kind: product.product_kind,
      credit_amount: product.credit_amount,
    },
  });

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Mercado Pago ainda não configurado com segurança no servidor." },
      { status: 503 },
    );
  }

  const { data: pendingOrder } = await admin
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .eq("status", "pending")
    .not("checkout_url", "is", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const reusableOrder = pendingOrder as Order | null;

  if (reusableOrder?.checkout_url) {
    return NextResponse.json({
      ok: true,
      orderId: reusableOrder.id,
      redirectTo: reusableOrder.checkout_url,
      reused: true,
    });
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      product_id: product.id,
      amount_cents: amountCents,
      currency: "BRL",
      status: "pending",
      provider: "mercado_pago",
      expires_at: orderExpiresAt,
      metadata: {
        source: product.product_kind === "credit_package" ? "credit_package" : "checkout",
        product_kind: product.product_kind,
        credit_amount: product.credit_amount,
      },
    } as never)
    .select("*")
    .single();

  if (orderError || !order) {
    logServerError("payments.create.order", orderError, { userId: user.id });
    return NextResponse.json(
      {
        ok: false,
        message: publicDatabaseErrorMessage(
          orderError,
          "Não foi possível criar o pedido agora.",
        ),
      },
      { status: 500 },
    );
  }
  const createdOrder = order as Order;

  await recordProductEvent({
    supabase: admin,
    userId: user.id,
    eventName: "order_created",
    route: checkoutRoute,
    metadata: {
      order_id: createdOrder.id,
      amount_cents: createdOrder.amount_cents,
      product_kind: product.product_kind,
    },
  });

  let preference: Awaited<ReturnType<typeof createMercadoPagoPreference>>;
  try {
    preference = await createMercadoPagoPreference({
      product,
      order: createdOrder,
      userEmail: user.email ?? typedProfile?.email ?? "",
    });
  } catch (error) {
    logServerError("payments.create.preference", error, { orderId: createdOrder.id });
    await admin
      .from("orders")
      .update({
        status: "cancelled",
        metadata: {
          ...(isPlainObject(createdOrder.metadata) ? createdOrder.metadata : {}),
          checkout_failure: "preference_creation_failed",
        },
      } as never)
      .eq("id", createdOrder.id);

    return NextResponse.json(
      { ok: false, message: "Não foi possível iniciar o pagamento com segurança agora." },
      { status: 502 },
    );
  }

  const { error: updateError } = await admin
    .from("orders")
    .update({
      provider_order_id: preference.providerOrderId,
      checkout_url: preference.checkoutUrl,
    } as never)
    .eq("id", createdOrder.id);

  if (updateError || !preference.checkoutUrl) {
    logServerError("payments.create.update", updateError, { orderId: createdOrder.id });
    return NextResponse.json(
      { ok: false, message: "Não foi possível preparar o checkout agora." },
      { status: 500 },
    );
  }

  await recordProductEvent({
    supabase: admin,
    userId: user.id,
    eventName: "payment_pending",
    route: checkoutRoute,
    metadata: { order_id: createdOrder.id, product_kind: product.product_kind },
  });

  return NextResponse.json({
    ok: true,
    orderId: createdOrder.id,
    redirectTo: preference.checkoutUrl,
  });
}

async function readCheckoutBody(request: NextRequest): Promise<{ productSlug?: unknown }> {
  try {
    const body = (await request.json()) as { productSlug?: unknown };
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

function normalizeProductSlug(value: unknown) {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  return creditPackageSlugPattern.test(slug) ? slug : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
