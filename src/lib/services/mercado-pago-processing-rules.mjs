export const PONTUA_ENEM_ACCESS_AMOUNT_CENTS = 9990;
export const PONTUA_ENEM_ACCESS_CURRENCY = "BRL";
export const PONTUA_ENEM_ACCESS_PRODUCT_SLUG = "pontuaenem-completo-2026";
export const PONTUA_ENEM_ACCESS_PRODUCT_NAME = "Pontua Enem Completo";

const pendingStatuses = new Set(["pending", "in_process"]);
const rejectedStatuses = new Set(["rejected", "cancelled", "refunded", "charged_back"]);

export function getMercadoPagoPaymentOrderId(payment) {
  const externalReference = stringOrNull(payment?.external_reference);
  if (externalReference) return externalReference;

  return stringOrNull(payment?.metadata?.order_id);
}

export function getMercadoPagoPaymentAmountCents(payment) {
  const amount = Number(payment?.transaction_amount);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export function getMercadoPagoPaymentProcessingDecision({
  payment,
  order,
  product,
  expectedUserId,
}) {
  const status = stringOrNull(payment?.status);
  if (pendingStatuses.has(status ?? "")) {
    return { action: "pending", reason: "payment_pending" };
  }
  if (rejectedStatuses.has(status ?? "")) {
    return { action: "rejected", reason: "payment_not_approved" };
  }
  if (status !== "approved") {
    return { action: "ignored", reason: "payment_not_approved" };
  }

  const orderId = getMercadoPagoPaymentOrderId(payment);
  if (!orderId) return { action: "invalid", reason: "missing_order_reference" };
  if (!order) return { action: "invalid", reason: "order_not_found" };
  if (!product) return { action: "invalid", reason: "product_not_found" };

  const externalReference = stringOrNull(payment?.external_reference);
  if (externalReference && externalReference !== order.id) {
    return { action: "invalid", reason: "external_reference_mismatch" };
  }
  if (orderId !== order.id) {
    return { action: "invalid", reason: "order_reference_mismatch" };
  }
  if (expectedUserId && order.user_id !== expectedUserId) {
    return { action: "invalid", reason: "authenticated_user_mismatch" };
  }
  if (stringOrNull(payment?.metadata?.user_id) && payment.metadata.user_id !== order.user_id) {
    return { action: "invalid", reason: "payment_user_mismatch" };
  }
  if (stringOrNull(payment?.metadata?.product_id) && payment.metadata.product_id !== product.id) {
    return { action: "invalid", reason: "payment_product_mismatch" };
  }
  if (product.product_kind !== "access" || product.slug !== PONTUA_ENEM_ACCESS_PRODUCT_SLUG) {
    return { action: "invalid", reason: "unexpected_product" };
  }
  if (payment.currency_id !== PONTUA_ENEM_ACCESS_CURRENCY || order.currency !== PONTUA_ENEM_ACCESS_CURRENCY) {
    return { action: "invalid", reason: "currency_mismatch" };
  }

  const paidCents = getMercadoPagoPaymentAmountCents(payment);
  if (paidCents !== PONTUA_ENEM_ACCESS_AMOUNT_CENTS || order.amount_cents !== PONTUA_ENEM_ACCESS_AMOUNT_CENTS) {
    return { action: "invalid", reason: "amount_mismatch" };
  }

  if (order.status === "approved") {
    return { action: "already_granted", reason: "order_already_approved", orderId: order.id };
  }

  return { action: "grant", reason: "approved_payment_matched", orderId: order.id };
}

function stringOrNull(value) {
  return typeof value === "string" && value.trim() ? value : null;
}
