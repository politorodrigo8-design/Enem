const mercadoPagoTestPaymentIds = new Set(["123456"]);

export function getMercadoPagoWebhookDisposition({ eventType, dataId }) {
  const paymentId = normalizePaymentId(dataId);

  if (!paymentId || !String(eventType || "").includes("payment")) {
    return {
      action: "ignore",
      reason: "not_payment",
      note: "Evento ignorado: nao e pagamento.",
    };
  }

  if (isMercadoPagoSimulatorPaymentId(paymentId)) {
    return {
      action: "ignore",
      reason: "test_payment_id",
      note: "Evento de teste do Mercado Pago ignorado.",
    };
  }

  return { action: "process", reason: null, note: null };
}

export function shouldIgnoreMercadoPagoProcessingError(error, { paymentId } = {}) {
  if (isMercadoPagoSimulatorPaymentId(paymentId ?? getErrorPaymentId(error))) return true;
  return isMercadoPagoNotFoundError(error);
}

export function getSafeErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function summarizeMercadoPagoError(error) {
  if (!error || typeof error !== "object") {
    return { message: getSafeErrorMessage(error) };
  }

  return {
    name: stringOrNull(error.name),
    message: getSafeErrorMessage(error),
    status: numberOrNull(error.status),
    statusText: stringOrNull(error.statusText),
    errorCode: stringOrNull(error.errorCode),
    paymentId: normalizePaymentId(error.paymentId) || null,
  };
}

export function summarizeSupabaseError(error) {
  if (!error || typeof error !== "object") return error ?? null;
  const source = error;

  return {
    code: stringOrNull(source.code),
    message: stringOrNull(source.message),
    details: stringOrNull(source.details),
    hint: stringOrNull(source.hint),
  };
}

export function summarizeSupabaseResponse(result) {
  if (!result || typeof result !== "object") return null;
  const response = result.response;
  if (!response || typeof response !== "object") return null;

  return {
    status: numberOrNull(response.status),
    statusText: stringOrNull(response.statusText),
    ok: typeof response.ok === "boolean" ? response.ok : null,
  };
}

export function buildIgnoredPaymentProcessingError(error) {
  const summary = summarizeMercadoPagoError(error);
  const parts = ["Pagamento nao encontrado no Mercado Pago; evento ignorado."];

  if (summary.status) parts.push(`status=${summary.status}`);
  if (summary.errorCode) parts.push(`code=${summary.errorCode}`);
  if (summary.paymentId) parts.push(`payment_id=${summary.paymentId}`);

  return parts.join(" ");
}

export function isMercadoPagoSimulatorPaymentId(paymentId) {
  const normalized = normalizePaymentId(paymentId);
  return Boolean(normalized && mercadoPagoTestPaymentIds.has(normalized));
}

export function normalizePaymentId(paymentId) {
  return String(paymentId ?? "").trim();
}

function getErrorStatus(error) {
  if (!error || typeof error !== "object") return null;
  return numberOrNull(error.status);
}

function getErrorPaymentId(error) {
  if (!error || typeof error !== "object") return null;
  return error.paymentId;
}

function isMercadoPagoNotFoundError(error) {
  if (getErrorStatus(error) !== 404) return false;
  if (!error || typeof error !== "object") return true;

  const code = stringOrNull(error.errorCode)?.toLowerCase() ?? "";
  const message = stringOrNull(error.message)?.toLowerCase() ?? "";
  const statusText = stringOrNull(error.statusText)?.toLowerCase() ?? "";

  return (
    !code ||
    code === "not_found" ||
    code === "resource_not_found" ||
    message.includes("not found") ||
    message.includes("nao encontrado") ||
    statusText.includes("not found")
  );
}

function stringOrNull(value) {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value) {
  return typeof value === "number" ? value : null;
}
