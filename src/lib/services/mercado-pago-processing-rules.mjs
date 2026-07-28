export const PONTUA_ENEM_CURRENCY = "BRL";
export const PONTUA_ENEM_ACCESS_PRODUCT_SLUG = "pontuaenem-completo-2026";
export const PONTUA_ENEM_ACCESS_PRODUCT_NAME = "Pontua Enem Completo";

// Tipos de produto que o processamento sabe liberar. A função SQL
// grant_paid_order_access trata os dois: 'access' concede acesso e
// 'credit_package' credita o saldo.
const grantableProductKinds = new Set(["access", "credit_package"]);

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
  if (!grantableProductKinds.has(product.product_kind)) {
    return { action: "invalid", reason: "unexpected_product" };
  }
  // Pacote de crédito sem quantidade definida não tem o que creditar.
  if (product.product_kind === "credit_package" && !(Number(product.credit_amount) > 0)) {
    return { action: "invalid", reason: "invalid_credit_package" };
  }
  if (payment.currency_id !== PONTUA_ENEM_CURRENCY || order.currency !== PONTUA_ENEM_CURRENCY) {
    return { action: "invalid", reason: "currency_mismatch" };
  }

  // O valor é conferido contra o do PEDIDO, não contra uma constante: o pedido
  // nasce no servidor com o preço vigente do produto, então esta comparação
  // continua impedindo pagar menos do que foi cobrado — e passa a suportar
  // pacotes de crédito e preço promocional. Fixar 9990 aqui rejeitava toda
  // compra de crédito ("unexpected_product") e faria qualquer promoção cair em
  // "amount_mismatch", cobrando do aluno sem liberar nada.
  const paidCents = getMercadoPagoPaymentAmountCents(payment);
  const orderCents = Number(order.amount_cents);
  if (!Number.isInteger(orderCents) || orderCents <= 0) {
    return { action: "invalid", reason: "invalid_order_amount" };
  }
  if (paidCents !== orderCents) {
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
