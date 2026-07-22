import { NextResponse, type NextRequest } from "next/server";
import {
  fetchMercadoPagoPayment,
  hashPayload,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/services/mercado-pago";
import type { Order, Product } from "@/lib/services/billing";
import type { Database } from "@/lib/supabase/types";
import {
  buildIgnoredPaymentProcessingError,
  getMercadoPagoWebhookDisposition,
  getSafeErrorMessage,
  summarizeMercadoPagoError,
  shouldIgnoreMercadoPagoProcessingError,
  summarizeSupabaseError,
  summarizeSupabaseResponse,
} from "@/lib/services/payment-webhook.mjs";
import { recordProductEvent } from "@/lib/services/product-events";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

type OrderWithProduct = Order & { products: Product | Product[] | null };
type PaymentEvent = Database["public"]["Tables"]["payment_events"]["Row"];

export async function POST(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const rawBody = await request.text();
  const payload = parseJson(rawBody);
  const queryTopic =
    request.nextUrl.searchParams.get("type") ??
    request.nextUrl.searchParams.get("topic");
  const eventType = String(
    payload?.type ?? payload?.topic ?? payload?.action ?? queryTopic ?? "unknown",
  );
  const dataId =
    request.nextUrl.searchParams.get("data.id") ??
    request.nextUrl.searchParams.get("data_id") ??
    getPayloadDataId(payload) ??
    request.nextUrl.searchParams.get("id");
  const providerEventId =
    dataId && eventType.includes("payment")
      ? `payment:${dataId}`
      : stringify(payload?.id) ?? `${eventType}:${dataId ?? hashPayload(rawBody)}`;
  const payloadHash = hashPayload(rawBody);
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();

  if (secret) {
    const validSignature = verifyMercadoPagoWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret,
    });

    if (!validSignature) {
      return NextResponse.json({ ok: false, message: "invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Fail-closed: sem secret em produção, qualquer POST anônimo seria aceito.
    return NextResponse.json(
      { ok: false, message: "webhook secret not configured" },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const eventInsertResult = await admin
    .from("payment_events")
    .insert({
      provider: "mercado_pago",
      provider_event_id: providerEventId,
      event_type: eventType,
      payload_hash: payloadHash,
    } as never)
    .select("*")
    .single();
  const { data: paymentEvent, error: eventError } = eventInsertResult;

  let savedPaymentEvent: PaymentEvent;
  if (eventError) {
    if (eventError.code === "23505") {
      // Evento já registrado. Se um processamento anterior falhou (processed = false),
      // reprocessa em vez de descartar como duplicado — senão o reenvio do Mercado
      // Pago nunca conclui a concessão de acesso de quem pagou.
      const existingResult = await admin
        .from("payment_events")
        .select("*")
        .eq("provider", "mercado_pago")
        .eq("provider_event_id", providerEventId)
        .maybeSingle();
      const { data: existing, error: existingError } = existingResult;

      if (existingError) {
        logSupabaseFailure("payment_events.select_duplicate", existingResult, {
          providerEventId,
          eventType,
          dataId,
        });
        return NextResponse.json({ ok: true, duplicate: true });
      }
      if (!existing || (existing as PaymentEvent).processed) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      savedPaymentEvent = existing as PaymentEvent;
    } else {
      logSupabaseFailure("payment_events.insert", eventInsertResult, {
        providerEventId,
        eventType,
        dataId,
      });
      return NextResponse.json({ ok: false, message: "event insert error" }, { status: 500 });
    }
  } else {
    savedPaymentEvent = paymentEvent as PaymentEvent;
  }

  try {
    const disposition = getMercadoPagoWebhookDisposition({ eventType, dataId });
    if (disposition.action === "ignore") {
      await markProcessed(admin, savedPaymentEvent.id, {
        processed: true,
        note: disposition.note,
        context: {
          providerEventId,
          eventType,
          dataId,
          reason: disposition.reason,
        },
      });
      return NextResponse.json({ ok: true, ignored: true, reason: disposition.reason });
    }

    const paymentId = String(dataId);
    const payment = await fetchMercadoPagoPayment(paymentId);
    const orderId = payment.external_reference ?? payment.metadata?.order_id ?? null;
    if (!orderId) {
      throw new Error("Pagamento sem external_reference/order_id.");
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("*, products (*)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message ?? "Pedido nao encontrado.");
    }

    const checkedOrder = order as OrderWithProduct;
    const product = Array.isArray(checkedOrder.products)
      ? checkedOrder.products[0]
      : checkedOrder.products;
    if (!product || payment.metadata?.product_id && payment.metadata.product_id !== product.id) {
      throw new Error("Produto do pagamento nao confere com o pedido.");
    }

    if (payment.metadata?.user_id && payment.metadata.user_id !== checkedOrder.user_id) {
      throw new Error("Usuario do pagamento nao confere com o pedido.");
    }

    const paidCents = Math.round(Number(payment.transaction_amount) * 100);
    if (payment.currency_id !== "BRL" || paidCents !== checkedOrder.amount_cents) {
      throw new Error("Valor ou moeda do pagamento nao confere com o pedido.");
    }

    await admin
      .from("payment_events")
      .update({ order_id: checkedOrder.id } as never)
      .eq("id", savedPaymentEvent.id);

    if (payment.status === "approved") {
      const { error } = await admin.rpc("grant_paid_access_for_order" as never, {
        target_order_id: checkedOrder.id,
      } as never);
      if (error) throw new Error(error.message);
      await recordProductEvent({
        supabase: admin,
        userId: checkedOrder.user_id,
        eventName: "payment_approved",
        route: "/api/payments/webhook",
        metadata: { order_id: checkedOrder.id },
      });
    } else if (payment.status === "refunded" || payment.status === "charged_back") {
      const { error } = await admin.rpc("revoke_paid_access_for_order" as never, {
        target_order_id: checkedOrder.id,
        target_status: payment.status === "charged_back" ? "charged_back" : "refunded",
      } as never);
      if (error) throw new Error(error.message);
      await recordProductEvent({
        supabase: admin,
        userId: checkedOrder.user_id,
        eventName: "payment_refunded",
        route: "/api/payments/webhook",
        metadata: { order_id: checkedOrder.id, status: payment.status },
      });
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      await admin
        .from("orders")
        .update({ status: payment.status === "cancelled" ? "cancelled" : "rejected" } as never)
        .eq("id", checkedOrder.id);
      await recordProductEvent({
        supabase: admin,
        userId: checkedOrder.user_id,
        eventName: "payment_rejected",
        route: "/api/payments/webhook",
        metadata: { order_id: checkedOrder.id, status: payment.status },
      });
    }

    await markProcessed(admin, savedPaymentEvent.id, {
      processed: true,
      context: { providerEventId, eventType, dataId },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = getSafeErrorMessage(error);
    const ignored = shouldIgnoreMercadoPagoProcessingError(error, { paymentId: dataId });

    console.error("[payments:webhook] payment processing failed", {
      providerEventId,
      eventType,
      dataId,
      paymentEventId: savedPaymentEvent.id,
      ignored,
      error: summarizeMercadoPagoError(error),
    });

    await markProcessed(admin, savedPaymentEvent.id, {
      processed: ignored,
      processingError: ignored
        ? buildIgnoredPaymentProcessingError(error)
        : message,
      context: { providerEventId, eventType, dataId },
    });

    return NextResponse.json({
      ok: true,
      queued: !ignored,
      ignored,
      message: ignored ? "payment ignored" : "payment registered for review",
    });
  }
}

function parseJson(rawBody: string): Record<string, unknown> | null {
  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function stringify(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function getPayloadDataId(payload: Record<string, unknown> | null) {
  const data = payload?.data;
  if (!data || typeof data !== "object") return null;
  return stringify((data as Record<string, unknown>).id);
}

async function markProcessed(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  {
    processed,
    processingError,
    note,
    context,
  }: {
    processed: boolean;
    processingError?: string | null;
    note?: string | null;
    context?: Record<string, unknown>;
  },
) {
  let result:
    | {
        error: unknown;
        status?: number;
        statusText?: string;
        response?: unknown;
      }
    | null = null;

  try {
    result = await admin
      .from("payment_events")
      .update({
        processed,
        processing_error: processingError ?? note ?? null,
        processed_at: processed ? new Date().toISOString() : null,
      } as never)
      .eq("id", eventId);
  } catch (error) {
    console.error("[payments:webhook] Supabase request threw", {
      operation: "payment_events.update_processing_state",
      context: {
        eventId,
        processed,
        ...context,
      },
      error: summarizeSupabaseError(error),
      message: getSafeErrorMessage(error),
    });
    return;
  }

  if (result?.error) {
    logSupabaseFailure("payment_events.update_processing_state", result, {
      eventId,
      processed,
      ...context,
    });
  }
}

function logSupabaseFailure(
  operation: string,
  result: {
    error: unknown;
    status?: number;
    statusText?: string;
    response?: unknown;
  },
  context: Record<string, unknown>,
) {
  console.error("[payments:webhook] Supabase request failed", {
    operation,
    context,
    error: summarizeSupabaseError(result.error),
    status: result.status ?? null,
    statusText: result.statusText ?? null,
    response: summarizeSupabaseResponse(result),
  });
}
