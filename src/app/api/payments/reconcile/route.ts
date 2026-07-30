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
  const paymentId = normalizePaymentId(body.payment_id ?? body.collection_id);

  logReconciliation("reconciliation started", {
    hasPaymentId: Boolean(body.payment_id),
    hasCollectionId: Boolean(body.collection_id),
    hasExternalReference: Boolean(body.external_reference),
    hasMerchantOrderId: Boolean(body.merchant_order_id),
    hasPreferenceId: Boolean(body.preference_id),
  });

  if (!paymentId) {
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

function logReconciliation(message: string, context: Record<string, unknown>) {
  console.info("[payments:mercado-pago] reconciliation", {
    message,
    ...context,
  });
}
