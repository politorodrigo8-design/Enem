const mercadoPagoTestPaymentIds = new Set(["123456"]);

export function getMercadoPagoWebhookDisposition({ eventType, dataId }) {
  if (!dataId || !String(eventType || "").includes("payment")) {
    return {
      action: "ignore",
      reason: "not_payment",
      note: "Evento ignorado: nao e pagamento.",
    };
  }

  if (mercadoPagoTestPaymentIds.has(String(dataId))) {
    return {
      action: "ignore",
      reason: "test_payment_id",
      note: "Evento de teste do Mercado Pago ignorado.",
    };
  }

  return { action: "process", reason: null, note: null };
}

export function shouldIgnoreMercadoPagoProcessingError(error) {
  return getErrorStatus(error) === 404;
}

export function getSafeErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error);
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

function getErrorStatus(error) {
  if (!error || typeof error !== "object") return null;
  return numberOrNull(error.status);
}

function stringOrNull(value) {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value) {
  return typeof value === "number" ? value : null;
}
