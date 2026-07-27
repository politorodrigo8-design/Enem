import {
  InvalidWebhookSignatureError,
  SignatureFailureReason,
  WebhookSignatureValidator,
} from "mercadopago";

const mercadoPagoTestPaymentIds = new Set(["123456"]);

export function getMercadoPagoWebhookEventType({ payload, queryTopic }) {
  return String(
    payload?.action ?? payload?.type ?? payload?.topic ?? queryTopic ?? "unknown",
  );
}

export function getMercadoPagoNotificationFormat(searchParams) {
  const hasModernDataId = hasValue(searchParams.get("data.id"));
  const hasModernType = hasValue(searchParams.get("type"));
  const hasLegacyId = hasValue(searchParams.get("id"));
  const hasLegacyTopic = hasValue(searchParams.get("topic"));

  if (hasModernDataId && hasModernType) {
    return {
      kind: "webhook",
      shouldProcess: true,
      reason: "modern_webhook",
    };
  }

  if (hasLegacyId && hasLegacyTopic) {
    return {
      kind: "ipn",
      shouldProcess: false,
      reason: "legacy_ipn_ignored",
    };
  }

  return {
    kind: "unknown",
    shouldProcess: false,
    reason: "unknown_notification_ignored",
  };
}

export function getMercadoPagoWebhookSignatureDataId({ queryDataId, bodyDataId }) {
  if (hasValue(queryDataId)) {
    return {
      dataId: normalizePaymentId(queryDataId),
      source: "query",
    };
  }

  if (hasValue(bodyDataId)) {
    return {
      dataId: normalizePaymentId(bodyDataId),
      source: "body",
    };
  }

  return {
    dataId: null,
    source: "missing",
  };
}

export function getMercadoPagoWebhookProcessingDataId({
  queryDataId,
  queryDataIdAlternative,
  bodyDataId,
  queryId,
}) {
  return (
    valueOrNull(queryDataId) ??
    valueOrNull(queryDataIdAlternative) ??
    valueOrNull(bodyDataId) ??
    valueOrNull(queryId)
  );
}

export function getMercadoPagoProviderEventId({
  eventType,
  dataId,
  payloadId,
  payloadHash,
}) {
  const normalizedEventType = String(eventType || "unknown");
  const paymentId = normalizePaymentId(dataId);

  if (paymentId && normalizedEventType.includes("payment")) {
    return `${normalizedEventType}:${paymentId}`;
  }

  return valueOrNull(payloadId) ?? `${normalizedEventType}:${paymentId || payloadHash}`;
}

export function getMercadoPagoPayloadDataId(payload) {
  const data = payload?.data;
  if (!data || typeof data !== "object") return null;
  return valueOrNull(data.id);
}

export function validateMercadoPagoWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
  dataIdSource,
  secret,
}) {
  const parts = parseMercadoPagoSignatureHeader(xSignature);
  const secretInfo = normalizeMercadoPagoWebhookSecret(secret);
  const rawSecret = typeof secret === "string" ? secret : "";
  const manifestSegments = getMercadoPagoWebhookManifestSegments({ dataId, xRequestId, timestamp: parts.ts });
  const base = {
    hasXSignature: Boolean(xSignature),
    hasXRequestId: Boolean(xRequestId),
    dataIdSource: dataIdSource ?? "missing",
    hasTimestamp: Boolean(parts.ts),
    hasSignatureHash: Boolean(parts.v1),
    manifestSegments,
    secretDiagnostics: secretInfo.diagnostics,
  };

  if (!rawSecret) return { ...base, valid: false, reason: "missing_secret" };

  try {
    WebhookSignatureValidator.validate({
      xSignature,
      xRequestId,
      dataId,
      secret: rawSecret,
    });
    return { ...base, valid: true, reason: "valid" };
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return {
        ...base,
        valid: false,
        reason: getMercadoPagoSignatureFailureReason(error.reason),
        sdkReason: error.reason,
      };
    }

    throw error;
  }
}

export function getMercadoPagoWebhookSignatureFailureStatus(validation) {
  return validation?.reason === "missing_secret" ? 503 : 401;
}

export function getMercadoPagoWebhookManifestSegments({ dataId, xRequestId, timestamp }) {
  const segments = [];
  if (hasValue(dataId)) segments.push("id");
  if (hasValue(xRequestId)) segments.push("request-id");
  if (hasValue(timestamp)) segments.push("ts");
  return segments;
}

export function normalizeMercadoPagoWebhookSecret(rawSecret) {
  const raw = typeof rawSecret === "string" ? rawSecret : "";
  const trimmed = raw.trim();
  const quoteStripped = stripMatchingWrappingQuotes(trimmed);

  return {
    secret: quoteStripped,
    diagnostics: {
      configured: raw.length > 0,
      trimmed: raw !== trimmed,
      hadWrappingQuotes: quoteStripped !== trimmed,
      hasLineBreak: /[\r\n]/.test(raw),
      hasInternalWhitespace: /\S\s+\S/.test(quoteStripped),
    },
  };
}

export function getMercadoPagoWebhookQueryParamNames(searchParams) {
  return Array.from(new Set([...searchParams.keys()])).sort();
}

function parseMercadoPagoSignatureHeader(xSignature) {
  const parts = {};
  if (!xSignature) return parts;

  for (const rawPart of String(xSignature).split(",")) {
    const separatorIndex = rawPart.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = rawPart.slice(0, separatorIndex).trim();
    const value = rawPart.slice(separatorIndex + 1).trim();
    if (key) parts[key] = value;
  }

  return parts;
}

function stripMatchingWrappingQuotes(value) {
  if (value.length < 2) return value;

  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1).trim();
  }

  return value;
}

function getMercadoPagoSignatureFailureReason(sdkReason) {
  if (sdkReason === SignatureFailureReason.MissingSignatureHeader) return "missing_signature";
  if (sdkReason === SignatureFailureReason.MissingTimestamp) return "missing_ts";
  if (sdkReason === SignatureFailureReason.MissingHash) return "missing_v1";
  if (sdkReason === SignatureFailureReason.SignatureMismatch) return "signature_mismatch";
  if (sdkReason === SignatureFailureReason.MalformedSignatureHeader) return "malformed_signature";
  if (sdkReason === SignatureFailureReason.TimestampOutOfTolerance) {
    return "timestamp_out_of_tolerance";
  }
  return "invalid_signature";
}

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

function hasValue(value) {
  return valueOrNull(value) !== null;
}

function valueOrNull(value) {
  return typeof value === "string" || typeof value === "number"
    ? normalizePaymentId(value) || null
    : null;
}
