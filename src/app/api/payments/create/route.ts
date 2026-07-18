import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/access";
import { getActiveProductForCheckout, getCurrentProductPrice, type Order } from "@/lib/services/billing";
import type { Profile } from "@/lib/db/types";
import { createMercadoPagoPreference, isMercadoPagoConfigured } from "@/lib/services/mercado-pago";
import { recordProductEvent } from "@/lib/services/product-events";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Supabase nao configurado." },
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

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Supabase administrativo nao configurado." },
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

  if (access.hasPlatformAccess) {
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  }

  const product = await getActiveProductForCheckout(admin);
  const amountCents = getCurrentProductPrice(product);

  await recordProductEvent({
    supabase: admin,
    userId: user.id,
    eventName: "checkout_started",
    route: "/checkout",
    metadata: { product_id: product.id },
  });

  if (!product.launch_ready) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "As vendas ainda nao estao ativas. O checkout real permanece bloqueado por launch_ready=false.",
      },
      { status: 409 },
    );
  }

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Mercado Pago ainda nao configurado no servidor." },
      { status: 503 },
    );
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
      expires_at: product.access_valid_until,
      metadata: { source: "checkout" },
    } as never)
    .select("*")
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { ok: false, message: orderError?.message ?? "Nao foi possivel criar o pedido." },
      { status: 500 },
    );
  }
  const createdOrder = order as Order;

  await recordProductEvent({
    supabase: admin,
    userId: user.id,
    eventName: "order_created",
    route: "/checkout",
    metadata: { order_id: createdOrder.id, amount_cents: createdOrder.amount_cents },
  });

  const preference = await createMercadoPagoPreference({
    product,
    order: createdOrder,
    userEmail: user.email ?? typedProfile?.email ?? "",
  });

  const { error: updateError } = await admin
    .from("orders")
    .update({
      provider_order_id: preference.providerOrderId,
      checkout_url: preference.checkoutUrl,
    } as never)
    .eq("id", createdOrder.id);

  if (updateError || !preference.checkoutUrl) {
    return NextResponse.json(
      { ok: false, message: updateError?.message ?? "Checkout sem URL de pagamento." },
      { status: 500 },
    );
  }

  await recordProductEvent({
    supabase: admin,
    userId: user.id,
    eventName: "payment_pending",
    route: "/checkout",
    metadata: { order_id: createdOrder.id },
  });

  return NextResponse.json({
    ok: true,
    orderId: createdOrder.id,
    redirectTo: preference.checkoutUrl,
  });
}
