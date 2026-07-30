import { NextResponse, type NextRequest } from "next/server";
import { fetchMercadoPagoPayment } from "@/lib/services/mercado-pago";
import {
  MercadoPagoPaymentProcessingError,
  processApprovedMercadoPagoPayment,
} from "@/lib/services/mercado-pago-processing";
import { checkRateLimit, userRateLimitIdentifier } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: "Supabase nao configurado." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Entre na sua conta para confirmar o pagamento." },
      { status: 401 },
    );
  }

  const rateLimit = await checkRateLimit({
    operation: "payments.reconcile",
    identifier: userRateLimitIdentifier(user.id),
    limit: 20,
    windowSeconds: 10 * 60,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ ok: false, message: "Supabase administrativo nao configurado." }, { status: 503 });
  }

  const body = await readReconciliationBody(request);
  const orderId = normalizeOrderId(body.order ?? body.external_reference);
  // Os links "Verificar meu pagamento" do checkout e da tela de pendente levam
  // só o id do pedido — o Mercado Pago não participa dessa navegação. Sem este
  // caminho, quem pagou por Pix recebia 400 e a tela dizia que não foi possível
  // confirmar, como se o pagamento tivesse falhado.
  const paymentId =
    normalizePaymentId(body.payment_id ?? body.collection_id) ??
    (orderId ? await findProviderPaymentIdForOrder(orderId, user.id) : null);

  logReconciliation("reconciliation started", {
    hasPaymentId: Boolean(body.payment_id),
    hasCollectionId: Boolean(body.collection_id),
    hasExternalReference: Boolean(body.external_reference),
    hasOrderId: Boolean(orderId),
    hasMerchantOrderId: Boolean(body.merchant_order_id),
    hasPreferenceId: Boolean(body.preference_id),
    resolvedFromOrder: Boolean(!body.payment_id && !body.collection_id && paymentId),
  });

  if (!paymentId) {
    // Pedido conhecido e ainda sem pagamento registrado NÃO é erro: é pagamento
    // em trânsito. Boleto leva dias; Pix pode levar minutos. Devolver 400 aqui
    // fazia a tela acusar falha para quem tinha acabado de pagar.
    if (orderId) {
      logReconciliation("order without provider payment yet", { orderId });
      return NextResponse.json({
        ok: true,
        status: "pending",
        message:
          "Ainda não recebemos a confirmação do Mercado Pago. Pix costuma levar alguns minutos e boleto pode levar até 3 dias úteis. Seu acesso é liberado automaticamente.",
      });
    }

    return NextResponse.json(
      { ok: false, message: "Pagamento nao identificado no retorno do Mercado Pago." },
      { status: 400 },
    );
  }

  try {
    const payment = await fetchMercadoPagoPayment(paymentId);
    logReconciliation("payment fetched", {
      status: payment.status,
      hasExternalReference: Boolean(payment.external_reference),
      hasMetadataOrderId: Boolean(payment.metadata?.order_id),
    });
    logReconciliation(`payment ${payment.status === "approved" ? "approved" : payment.status === "pending" || payment.status === "in_process" ? "pending" : "rejected"}`, {
      status: payment.status,
    });

    const processing = await processApprovedMercadoPagoPayment({
      supabase: createAdminClient(),
      payment,
      expectedUserId: user.id,
      source: "success_reconciliation",
    });

    if (processing.status === "approved") {
      return NextResponse.json({
        ok: true,
        status: "approved",
        redirectTo: "/dashboard",
        access: processing.access,
        tiktokPurchase: processing.tiktokPurchase ?? null,
      });
    }

    if (processing.status === "pending") {
      return NextResponse.json({
        ok: true,
        status: "pending",
        message: "Confirmando pagamento",
      });
    }

    return NextResponse.json({
      ok: true,
      status: processing.status,
      message: "Pagamento ainda nao aprovado.",
    });
  } catch (error) {
    if (error instanceof MercadoPagoPaymentProcessingError) {
      logReconciliation("reconciliation rejected", {
        reason: error.reason,
      });
      return NextResponse.json(
        { ok: false, status: "invalid", message: "Pagamento nao confere com a conta logada." },
        { status: 403 },
      );
    }

    console.error("[payments:mercado-pago] reconciliation failed", {
      error: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.json(
      { ok: false, message: "Nao foi possivel confirmar o pagamento agora." },
      { status: 502 },
    );
  }
}

async function readReconciliationBody(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

function normalizePaymentId(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const paymentId = String(value).trim();
  return /^\d+$/.test(paymentId) ? paymentId : null;
}

const orderIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeOrderId(value: unknown) {
  if (typeof value !== "string") return null;
  const orderId = value.trim();
  return orderIdPattern.test(orderId) ? orderId : null;
}

/**
 * Recupera o id do pagamento que o processamento anterior gravou no pedido.
 * Filtra por user_id de propósito: o id do pedido vem da query string, então
 * sem esse filtro qualquer pessoa logada conseguiria consultar pedido alheio.
 */
async function findProviderPaymentIdForOrder(orderId: string, userId: string) {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await createAdminClient()
    .from("orders")
    .select("metadata")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const metadata = (data as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;

  return normalizePaymentId((metadata as Record<string, unknown>).provider_payment_id);
}

function logReconciliation(message: string, context: Record<string, unknown>) {
  console.info("[payments:mercado-pago] reconciliation", {
    message,
    ...context,
  });
}
