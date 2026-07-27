import type { SupabaseClient } from "@supabase/supabase-js";
import type { MercadoPagoPayment } from "@/lib/services/mercado-pago";
import type { Order, Product } from "@/lib/services/billing";
import type { Database, Json } from "@/lib/supabase/types";
import {
  getMercadoPagoPaymentOrderId,
  getMercadoPagoPaymentProcessingDecision,
} from "@/lib/services/mercado-pago-processing-rules.mjs";

type OrderWithProduct = Order & { products: Product | Product[] | null };
type ProcessingSource = "webhook" | "success_reconciliation";
type ProcessingStatus = "approved" | "pending" | "rejected" | "ignored";

export type MercadoPagoApprovedPaymentProcessingResult = {
  status: ProcessingStatus;
  orderId: string | null;
  access: "granted" | "already_granted" | "not_granted";
  reason: string;
};

export class MercadoPagoPaymentProcessingError extends Error {
  reason: string;

  constructor(reason: string, message = "Pagamento Mercado Pago nao passou nas validacoes.") {
    super(message);
    this.name = "MercadoPagoPaymentProcessingError";
    this.reason = reason;
  }
}

export async function processApprovedMercadoPagoPayment({
  supabase,
  payment,
  expectedUserId,
  source,
}: {
  supabase: SupabaseClient<Database>;
  payment: MercadoPagoPayment;
  expectedUserId?: string | null;
  source: ProcessingSource;
}): Promise<MercadoPagoApprovedPaymentProcessingResult> {
  const orderId = getMercadoPagoPaymentOrderId(payment);

  logPaymentProcessing("payment status checked", {
    source,
    status: payment.status,
    hasOrderReference: Boolean(orderId),
  });

  if (payment.status === "pending" || payment.status === "in_process") {
    return { status: "pending", orderId, access: "not_granted", reason: "payment_pending" };
  }
  if (payment.status !== "approved") {
    return { status: "rejected", orderId, access: "not_granted", reason: "payment_not_approved" };
  }
  if (!orderId) {
    throw new MercadoPagoPaymentProcessingError("missing_order_reference");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, products (*)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new MercadoPagoPaymentProcessingError("order_not_found", orderError?.message);
  }

  const checkedOrder = order as OrderWithProduct;
  const product = Array.isArray(checkedOrder.products)
    ? checkedOrder.products[0]
    : checkedOrder.products;
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment,
    order: checkedOrder,
    product,
    expectedUserId: expectedUserId ?? null,
  });

  if (decision.action === "invalid") {
    throw new MercadoPagoPaymentProcessingError(decision.reason);
  }
  if (decision.action === "pending") {
    return { status: "pending", orderId: checkedOrder.id, access: "not_granted", reason: decision.reason };
  }
  if (decision.action === "rejected" || decision.action === "ignored") {
    return { status: decision.action === "rejected" ? "rejected" : "ignored", orderId: checkedOrder.id, access: "not_granted", reason: decision.reason };
  }

  logPaymentProcessing("order matched", {
    source,
    orderId: checkedOrder.id,
    userMatched: true,
    productMatched: true,
  });

  await registerProviderPaymentId({
    supabase,
    order: checkedOrder,
    payment,
    source,
  });

  if (decision.action === "already_granted") {
    logPaymentProcessing("access already granted", {
      source,
      orderId: checkedOrder.id,
    });
    return {
      status: "approved",
      orderId: checkedOrder.id,
      access: "already_granted",
      reason: decision.reason,
    };
  }

  const { error: grantError } = await supabase.rpc("grant_paid_access_for_order" as never, {
    target_order_id: checkedOrder.id,
  } as never);
  if (grantError) throw new Error(grantError.message);

  const { error: referralError } = await supabase.rpc(
    "process_referral_purchase_for_order" as never,
    {
      target_order_id: checkedOrder.id,
      input_provider_payment_id: String(payment.id),
    } as never,
  );
  if (referralError) throw new Error(referralError.message);

  const { error: pendingReferralError } = await supabase.rpc(
    "process_pending_referral_rewards" as never,
    { target_referrer_user_id: null } as never,
  );
  if (pendingReferralError) throw new Error(pendingReferralError.message);

  logPaymentProcessing("access granted", {
    source,
    orderId: checkedOrder.id,
  });

  return {
    status: "approved",
    orderId: checkedOrder.id,
    access: "granted",
    reason: decision.reason,
  };
}

async function registerProviderPaymentId({
  supabase,
  order,
  payment,
  source,
}: {
  supabase: SupabaseClient<Database>;
  order: Order;
  payment: MercadoPagoPayment;
  source: ProcessingSource;
}) {
  const metadata = isPlainObject(order.metadata) ? order.metadata : {};
  const nextMetadata: Record<string, Json> = {
    ...metadata,
    provider_payment_id: String(payment.id),
    provider_payment_status: payment.status,
    payment_processing_source: source,
  };

  const { error } = await supabase
    .from("orders")
    .update({ metadata: nextMetadata } as never)
    .eq("id", order.id);

  if (error) throw new Error(error.message);
}

function isPlainObject(value: unknown): value is Record<string, Json> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function logPaymentProcessing(message: string, context: Record<string, unknown>) {
  console.info("[payments:mercado-pago] processing", {
    message,
    ...context,
  });
}
