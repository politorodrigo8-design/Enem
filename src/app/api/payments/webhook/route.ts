import { NextResponse, type NextRequest } from "next/server";
import {
  fetchMercadoPagoPayment,
  hashPayload,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/services/mercado-pago";
import type { Order, Product } from "@/lib/services/billing";
import type { Database } from "@/lib/supabase/types";
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
  const eventType = String(payload?.type ?? payload?.topic ?? payload?.action ?? "unknown");
  const dataId =
    request.nextUrl.searchParams.get("data.id") ??
    request.nextUrl.searchParams.get("data_id") ??
    getPayloadDataId(payload) ??
    request.nextUrl.searchParams.get("id");
  const providerEventId = stringify(payload?.id) ?? `${eventType}:${dataId ?? hashPayload(rawBody)}`;
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
  }

  const admin = createAdminClient();
  const { data: paymentEvent, error: eventError } = await admin
    .from("payment_events")
    .insert({
      provider: "mercado_pago",
      provider_event_id: providerEventId,
      event_type: eventType,
      payload_hash: payloadHash,
    } as never)
    .select("*")
    .single();

  if (eventError) {
    if (eventError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    return NextResponse.json({ ok: false, message: eventError.message }, { status: 500 });
  }
  const savedPaymentEvent = paymentEvent as PaymentEvent;

  try {
    if (!dataId || !eventType.includes("payment")) {
      await markProcessed(admin, savedPaymentEvent.id, null, "Evento ignorado: nao e pagamento.");
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payment = await fetchMercadoPagoPayment(dataId);
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

    await markProcessed(admin, savedPaymentEvent.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markProcessed(admin, savedPaymentEvent.id, message);
    return NextResponse.json({ ok: false, message: "processing error" }, { status: 500 });
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
  processingError?: string | null,
  note?: string,
) {
  await admin
    .from("payment_events")
    .update({
      processed: !processingError,
      processing_error: processingError ?? note ?? null,
      processed_at: new Date().toISOString(),
    } as never)
    .eq("id", eventId);
}
