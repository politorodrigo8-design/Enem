import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { WebhookSignatureValidator } from "mercadopago";
import {
  canCreateMercadoPagoCheckout,
  getMercadoPagoCredentialProblem,
  getMercadoPagoCredentialAudit,
  isPaymentSiteUrlSafe,
  isTrustedCheckoutOrigin,
} from "../src/lib/services/payment-security.mjs";
import {
  buildIgnoredPaymentProcessingError,
  getMercadoPagoNotificationFormat,
  getMercadoPagoPayloadDataId,
  getMercadoPagoProviderEventId,
  getMercadoPagoWebhookEventType,
  getMercadoPagoWebhookDisposition,
  getMercadoPagoWebhookQueryParamNames,
  getMercadoPagoWebhookProcessingDataId,
  getMercadoPagoWebhookSignatureDataId,
  getMercadoPagoWebhookSignatureFailureStatus,
  normalizeMercadoPagoWebhookSecret,
  shouldIgnoreMercadoPagoProcessingError,
  validateMercadoPagoWebhookSignature,
} from "../src/lib/services/payment-webhook.mjs";
import { getMercadoPagoPaymentProcessingDecision } from "../src/lib/services/mercado-pago-processing-rules.mjs";

const mercadoPagoServiceSource = readFileSync(
  new URL("../src/lib/services/mercado-pago.ts", import.meta.url),
  "utf8",
);
const mercadoPagoWebhookRouteSource = readFileSync(
  new URL("../src/app/api/payments/webhook/route.ts", import.meta.url),
  "utf8",
);
const mercadoPagoReconcileRouteSource = readFileSync(
  new URL("../src/app/api/payments/reconcile/route.ts", import.meta.url),
  "utf8",
);
const mercadoPagoSuccessPageSource = readFileSync(
  new URL("../src/app/(payments)/pagamento/sucesso/page.tsx", import.meta.url),
  "utf8",
);
const mercadoPagoSuccessClientSource = readFileSync(
  new URL("../src/app/(payments)/pagamento/sucesso/payment-success-reconciliation.tsx", import.meta.url),
  "utf8",
);

test("checkout Mercado Pago exige produto ativo, liberado e provedor correto", () => {
  assert.equal(
    canCreateMercadoPagoCheckout({
      active: true,
      launch_ready: true,
      checkout_provider: "mercado_pago",
    }),
    true,
  );
  assert.equal(
    canCreateMercadoPagoCheckout({
      active: true,
      launch_ready: false,
      checkout_provider: "mercado_pago",
    }),
    false,
  );
  assert.equal(
    canCreateMercadoPagoCheckout({
      active: true,
      launch_ready: true,
      checkout_provider: "manual",
    }),
    false,
  );
});

test("checkout aceita apenas origem confiavel em producao", () => {
  assert.equal(
    isTrustedCheckoutOrigin({
      origin: "https://pontuaenem.example",
      secFetchSite: "same-origin",
      siteUrl: "https://pontuaenem.example",
      nodeEnv: "production",
    }),
    true,
  );
  assert.equal(
    isTrustedCheckoutOrigin({
      origin: "https://attacker.example",
      secFetchSite: "cross-site",
      siteUrl: "https://pontuaenem.example",
      nodeEnv: "production",
    }),
    false,
  );
  assert.equal(
    isTrustedCheckoutOrigin({
      origin: null,
      secFetchSite: null,
      siteUrl: "https://pontuaenem.example",
      nodeEnv: "production",
    }),
    false,
  );
});

test("URL publica de pagamento precisa ser HTTPS fora do ambiente local", () => {
  assert.equal(isPaymentSiteUrlSafe("https://pontuaenem.example", "production"), true);
  assert.equal(isPaymentSiteUrlSafe("http://pontuaenem.example", "production"), false);
  assert.equal(isPaymentSiteUrlSafe("http://localhost:3000", "development"), true);
});

test("access token nao pode ser exposto como public key", () => {
  assert.equal(
    getMercadoPagoCredentialProblem({ accessToken: "", publicKey: "" }),
    "missing_access_token",
  );
  assert.equal(
    getMercadoPagoCredentialProblem({ accessToken: "APP_USR-secret", publicKey: "APP_USR-secret" }),
    "public_key_matches_access_token",
  );
  assert.equal(
    getMercadoPagoCredentialProblem({ accessToken: "APP_USR-secret", publicKey: "public" }),
    null,
  );
});

test("access token Mercado Pago rejeita prefixo Stripe ou inesperado", () => {
  assert.equal(
    getMercadoPagoCredentialProblem({
      accessToken: "sk_live_123456",
      publicKey: "APP_USR-public",
    }),
    "stripe_secret_key_used_as_mercado_pago_access_token",
  );
  assert.equal(
    getMercadoPagoCredentialProblem({
      accessToken: "PAYMENT_SECRET_123456",
      publicKey: "APP_USR-public",
    }),
    "unexpected_access_token_prefix",
  );
});

test("auditoria Mercado Pago registra apenas prefixo seguro da credencial", () => {
  assert.deepEqual(
    getMercadoPagoCredentialAudit({
      accessToken: "APP_USR-abcdef123456",
      sandbox: false,
      notificationUrl: "https://pontuaenem.example/api/payments/webhook",
    }),
    {
      accessTokenVariable: "MERCADO_PAGO_ACCESS_TOKEN",
      accessTokenPrefix: "APP_USR-",
      accessTokenLooksLikeMercadoPago: true,
      accessTokenLooksLikeStripe: false,
      sandboxEnabled: false,
      hasNotificationUrl: true,
    },
  );
});

test("preferencia Mercado Pago usa apenas MERCADO_PAGO_ACCESS_TOKEN", () => {
  assert.match(mercadoPagoServiceSource, /process\.env\.MERCADO_PAGO_ACCESS_TOKEN/);
  assert.doesNotMatch(mercadoPagoServiceSource, /process\.env\.STRIPE_SECRET_KEY/);
  assert.doesNotMatch(mercadoPagoServiceSource, /process\.env\.PAYMENT_PROVIDER_SECRET/);
  assert.doesNotMatch(mercadoPagoServiceSource, /process\.env\.MERCADO_PAGO_TEST_ACCESS_TOKEN/);
  assert.doesNotMatch(mercadoPagoServiceSource, /process\.env\.MERCADO_PAGO_PRODUCTION_ACCESS_TOKEN/);
});

// Sem notification_url o Mercado Pago não avisa o servidor, e a liberação passa
// a depender de o comprador voltar ao site: quem paga por Pix ou boleto no app
// do banco pagaria sem receber acesso. O campo exige HTTPS, então em
// desenvolvimento ele precisa ficar de fora para não derrubar o checkout local.
test("preferencia Mercado Pago registra notification_url apenas com origem HTTPS", () => {
  assert.match(mercadoPagoServiceSource, /notification_url: notificationUrl/);
  assert.match(
    mercadoPagoServiceSource,
    /siteUrl\.startsWith\("https:\/\/"\)\s*\?\s*`\$\{siteUrl\}\/api\/payments\/webhook`\s*:\s*null/,
  );
  assert.match(mercadoPagoServiceSource, /hasNotificationUrl: Boolean\(notificationUrl\)/);
});

test("rota do webhook usa validador SDK antes de processar pagamento", () => {
  const validationIndex = mercadoPagoWebhookRouteSource.indexOf(
    "const signatureValidation = validateMercadoPagoWebhookSignature",
  );
  const ignoredIndex = mercadoPagoWebhookRouteSource.indexOf("!notificationFormat.shouldProcess");
  const fetchPaymentIndex = mercadoPagoWebhookRouteSource.indexOf(
    "const payment = await fetchMercadoPagoPayment",
  );
  const processingIndex = mercadoPagoWebhookRouteSource.indexOf("await processApprovedMercadoPagoPayment");

  assert.notEqual(validationIndex, -1);
  assert.notEqual(ignoredIndex, -1);
  assert.notEqual(fetchPaymentIndex, -1);
  assert.notEqual(processingIndex, -1);
  assert.ok(ignoredIndex < validationIndex);
  assert.ok(validationIndex < fetchPaymentIndex);
  assert.ok(validationIndex < processingIndex);
});

test("webhook ignora simulacao do Mercado Pago com payment id ficticio", () => {
  assert.deepEqual(
    getMercadoPagoWebhookDisposition({ eventType: "payment", dataId: "123456" }),
    {
      action: "ignore",
      reason: "test_payment_id",
      note: "Evento de teste do Mercado Pago ignorado.",
    },
  );
});

test("webhook ignora eventos que nao sao de pagamento", () => {
  assert.deepEqual(
    getMercadoPagoWebhookDisposition({ eventType: "merchant_order", dataId: "123456789" }),
    {
      action: "ignore",
      reason: "not_payment",
      note: "Evento ignorado: nao e pagamento.",
    },
  );
});

test("webhook trata 404 do Mercado Pago como pagamento inexistente ignoravel", () => {
  assert.equal(shouldIgnoreMercadoPagoProcessingError({ status: 404 }), true);
  assert.equal(shouldIgnoreMercadoPagoProcessingError({ status: 500 }), false);
});

test("webhook trata 404 do GET /v1/payments/123456 como simulacao ignoravel", () => {
  const error = {
    name: "MercadoPagoApiError",
    message: "payment not found",
    paymentId: "123456",
    status: 404,
    statusText: "Not Found",
    errorCode: "not_found",
  };

  assert.equal(shouldIgnoreMercadoPagoProcessingError(error, { paymentId: "123456" }), true);
  assert.match(buildIgnoredPaymentProcessingError(error), /status=404/);
  assert.match(buildIgnoredPaymentProcessingError(error), /code=not_found/);
  assert.match(buildIgnoredPaymentProcessingError(error), /payment_id=123456/);
});

test("webhook Mercado Pago usa vetor equivalente ao SDK oficial", () => {
  const secret = "test-webhook-secret";
  const xSignature = signMercadoPagoWebhook({
    secret,
    dataId: "ORD-ABC-123",
    xRequestId: "f3a0-req:with-colon",
    timestamp: "1704908010",
  });

  WebhookSignatureValidator.validate({
    xSignature,
    xRequestId: "f3a0-req:with-colon",
    dataId: "ORD-ABC-123",
    secret,
  });
  assert.equal(
    validateMercadoPagoWebhookSignature({
      xSignature,
      xRequestId: "f3a0-req:with-colon",
      dataId: "ORD-ABC-123",
      dataIdSource: "query",
      secret,
    }).valid,
    true,
  );
});

test("webhook Mercado Pago nao normaliza data.id para lowercase", () => {
  const secret = "test-webhook-secret";
  const xSignature = signMercadoPagoWebhook({
    secret,
    dataId: "ABC-123",
    xRequestId: "request-1",
    timestamp: "1704908010",
  });
  const validation = validateMercadoPagoWebhookSignature({
    xSignature,
    xRequestId: "request-1",
    dataId: "abc-123",
    dataIdSource: "query",
    secret,
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.reason, "signature_mismatch");
});

test("webhook Mercado Pago omite x-request-id ausente como o SDK oficial", () => {
  const secret = "test-webhook-secret";
  const xSignature = signMercadoPagoWebhook({
    secret,
    dataId: "169829162367",
    xRequestId: null,
    timestamp: "1704908010",
  });

  WebhookSignatureValidator.validate({
    xSignature,
    xRequestId: null,
    dataId: "169829162367",
    secret,
  });
  assert.equal(
    validateMercadoPagoWebhookSignature({
      xSignature,
      xRequestId: null,
      dataId: "169829162367",
      dataIdSource: "query",
      secret,
    }).valid,
    true,
  );
});

test("webhook Mercado Pago encontra query param literal data.id", () => {
  const url = new URL("https://pontuaenem.example/api/payments/webhook?data.id=169829162367&type=payment");

  assert.equal(url.searchParams.get("data.id"), "169829162367");
  assert.deepEqual(getMercadoPagoWebhookQueryParamNames(url.searchParams), ["data.id", "type"]);
});

test("webhook moderno data.id/type com assinatura valida pode processar", () => {
  const url = new URL("https://pontuaenem.example/api/payments/webhook?data.id=169829162367&type=payment");
  const secret = "test-webhook-secret";
  const xRequestId = "request-169829162367";
  const xSignature = signMercadoPagoWebhook({
    secret,
    dataId: url.searchParams.get("data.id"),
    xRequestId,
    timestamp: "1704908010",
  });
  const validation = validateMercadoPagoWebhookSignature({
    xSignature,
    xRequestId,
    dataId: url.searchParams.get("data.id"),
    dataIdSource: "query",
    secret,
  });

  assert.deepEqual(getMercadoPagoNotificationFormat(url.searchParams), {
    kind: "webhook",
    shouldProcess: true,
    reason: "modern_webhook",
  });
  assert.equal(validation.valid, true);
});

test("webhook moderno data.id/type com assinatura invalida retorna 401", () => {
  const url = new URL("https://pontuaenem.example/api/payments/webhook?data.id=169829162367&type=payment");
  const validation = validateMercadoPagoWebhookSignature({
    xSignature: "ts=1704908010,v1=0000000000000000000000000000000000000000000000000000000000000000",
    xRequestId: "request-1",
    dataId: url.searchParams.get("data.id"),
    dataIdSource: "query",
    secret: "test-webhook-secret",
  });

  assert.equal(getMercadoPagoNotificationFormat(url.searchParams).shouldProcess, true);
  assert.equal(validation.valid, false);
  assert.equal(getMercadoPagoWebhookSignatureFailureStatus(validation), 401);
});

test("IPN legacy id/topic retorna 200 ignorado sem processamento", () => {
  const url = new URL("https://pontuaenem.example/api/payments/webhook?id=169829162367&topic=payment");

  assert.deepEqual(getMercadoPagoWebhookQueryParamNames(url.searchParams), ["id", "topic"]);
  assert.deepEqual(getMercadoPagoNotificationFormat(url.searchParams), {
    kind: "ipn",
    shouldProcess: false,
    reason: "legacy_ipn_ignored",
  });
});

test("evento desconhecido retorna 200 ignorado sem processamento", () => {
  const url = new URL("https://pontuaenem.example/api/payments/webhook?foo=bar");

  assert.deepEqual(getMercadoPagoNotificationFormat(url.searchParams), {
    kind: "unknown",
    shouldProcess: false,
    reason: "unknown_notification_ignored",
  });
});

test("IPN nunca e caminho direto de liberacao de acesso", () => {
  const url = new URL("https://pontuaenem.example/api/payments/webhook?id=169829162367&topic=payment");
  const format = getMercadoPagoNotificationFormat(url.searchParams);

  assert.equal(format.kind, "ipn");
  assert.equal(format.shouldProcess, false);
});

test("webhook Mercado Pago valida notificacao real com data.id na query", () => {
  const secret = "test-webhook-secret";
  const timestamp = "1704908010";
  const xRequestId = "request-169829162367";
  const queryDataId = "169829162367";
  const bodyDataId = "body-should-not-win";
  const signatureDataId = getMercadoPagoWebhookSignatureDataId({
    queryDataId,
    bodyDataId,
  });
  const xSignature = signMercadoPagoWebhook({
    secret,
    dataId: queryDataId,
    xRequestId,
    timestamp,
  });

  assert.deepEqual(signatureDataId, { dataId: queryDataId, source: "query" });
  assert.equal(
    validateMercadoPagoWebhookSignature({
      xSignature,
      xRequestId,
      dataId: signatureDataId.dataId,
      dataIdSource: signatureDataId.source,
      secret,
    }).valid,
    true,
  );
});

test("webhook Mercado Pago valida assinatura sem x-request-id", () => {
  const secret = "test-webhook-secret";
  const timestamp = "1704908010";
  const dataId = "169829162367";
  const xSignature = signMercadoPagoWebhook({
    secret,
    dataId,
    xRequestId: null,
    timestamp,
  });
  const validation = validateMercadoPagoWebhookSignature({
    xSignature,
    xRequestId: null,
    dataId,
    dataIdSource: "query",
    secret,
  });

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.manifestSegments, ["id", "ts"]);
  assert.equal(validation.hasXRequestId, false);
});

test("webhook Mercado Pago rejeita assinatura sem ts como o SDK oficial", () => {
  const secret = "test-webhook-secret";
  const dataId = "169829162367";
  const xRequestId = "request-1";
  const xSignature = signMercadoPagoWebhook({
    secret,
    dataId,
    xRequestId,
    timestamp: null,
  });
  const validation = validateMercadoPagoWebhookSignature({
    xSignature,
    xRequestId,
    dataId,
    dataIdSource: "query",
    secret,
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.reason, "missing_ts");
  assert.deepEqual(validation.manifestSegments, ["id", "request-id"]);
  assert.equal(validation.hasTimestamp, false);
});

test("webhook Mercado Pago apenas diagnostica secret com espaco externo e aspas", () => {
  const secret = "test-webhook-secret";
  const timestamp = "1704908010";
  const xRequestId = "request-1";
  const dataId = "169829162367";
  const xSignature = signMercadoPagoWebhook({
    secret,
    dataId,
    xRequestId,
    timestamp,
  });
  const validation = validateMercadoPagoWebhookSignature({
    xSignature,
    xRequestId,
    dataId,
    dataIdSource: "query",
    secret: `\n"${secret}"\n`,
  });
  const secretInfo = normalizeMercadoPagoWebhookSecret(`\n"${secret}"\n`);

  assert.equal(validation.valid, false);
  assert.equal(validation.reason, "signature_mismatch");
  assert.equal(validation.secretDiagnostics.trimmed, true);
  assert.equal(validation.secretDiagnostics.hadWrappingQuotes, true);
  assert.equal(validation.secretDiagnostics.hasLineBreak, true);
  assert.equal(secretInfo.secret, secret);
});

test("webhook Mercado Pago aceita simulador assinado e ignora payment id ficticio", () => {
  const secret = "test-webhook-secret";
  const timestamp = "1704908010";
  const xRequestId = "request-simulator";
  const body = {
    id: 1,
    live_mode: false,
    type: "payment",
    action: "payment.created",
    data: { id: "123456" },
  };
  const bodyDataId = getMercadoPagoPayloadDataId(body);
  const signatureDataId = getMercadoPagoWebhookSignatureDataId({
    queryDataId: "123456",
    bodyDataId,
  });
  const xSignature = signMercadoPagoWebhook({
    secret,
    dataId: signatureDataId.dataId,
    xRequestId,
    timestamp,
  });

  assert.equal(body.live_mode, false);
  assert.equal(getMercadoPagoWebhookEventType({ payload: body, queryTopic: null }), "payment.created");
  assert.equal(
    validateMercadoPagoWebhookSignature({
      xSignature,
      xRequestId,
      dataId: signatureDataId.dataId,
      dataIdSource: signatureDataId.source,
      secret,
    }).valid,
    true,
  );
  assert.deepEqual(
    getMercadoPagoWebhookDisposition({ eventType: body.action, dataId: bodyDataId }),
    {
      action: "ignore",
      reason: "test_payment_id",
      note: "Evento de teste do Mercado Pago ignorado.",
    },
  );
});

test("webhook Mercado Pago rejeita assinatura invalida", () => {
  const validation = validateMercadoPagoWebhookSignature({
    xSignature: "ts=1704908010,v1=0000000000000000000000000000000000000000000000000000000000000000",
    xRequestId: "request-1",
    dataId: "169829162367",
    dataIdSource: "query",
    secret: "test-webhook-secret",
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.reason, "signature_mismatch");
  assert.equal(validation.hasXSignature, true);
  assert.equal(validation.hasXRequestId, true);
  assert.equal(validation.hasTimestamp, true);
  assert.equal(validation.hasSignatureHash, true);
});

test("webhook Mercado Pago usa body.data.id apenas como fallback seguro", () => {
  const bodyDataId = getMercadoPagoPayloadDataId({ data: { id: 169829162367 } });
  const signatureDataId = getMercadoPagoWebhookSignatureDataId({
    queryDataId: null,
    bodyDataId,
  });
  const processingDataId = getMercadoPagoWebhookProcessingDataId({
    queryDataId: null,
    queryDataIdAlternative: null,
    bodyDataId,
    queryId: null,
  });

  assert.deepEqual(signatureDataId, { dataId: "169829162367", source: "body" });
  assert.equal(processingDataId, "169829162367");
});

test("webhook Mercado Pago mantem idempotencia para evento duplicado", () => {
  const first = getMercadoPagoProviderEventId({
    eventType: "payment.updated",
    dataId: "169829162367",
    payloadId: "event-1",
    payloadHash: "hash-1",
  });
  const retry = getMercadoPagoProviderEventId({
    eventType: "payment.updated",
    dataId: "169829162367",
    payloadId: "event-2",
    payloadHash: "hash-2",
  });

  assert.equal(first, "payment.updated:169829162367");
  assert.equal(retry, first);
});

test("webhook Mercado Pago diferencia payment.created e payment.updated", () => {
  assert.equal(
    getMercadoPagoWebhookEventType({
      payload: { type: "payment", action: "payment.created" },
      queryTopic: "payment",
    }),
    "payment.created",
  );
  assert.equal(
    getMercadoPagoWebhookEventType({
      payload: { type: "payment", action: "payment.updated" },
      queryTopic: "payment",
    }),
    "payment.updated",
  );
  assert.notEqual(
    getMercadoPagoProviderEventId({
      eventType: "payment.created",
      dataId: "169829162367",
      payloadId: null,
      payloadHash: "hash",
    }),
    getMercadoPagoProviderEventId({
      eventType: "payment.updated",
      dataId: "169829162367",
      payloadId: null,
      payloadHash: "hash",
    }),
  );
});

test("reconciliacao aprovada correta libera acesso pelo processador compartilhado", () => {
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment: mercadoPagoPaymentFixture(),
    order: orderFixture(),
    product: productFixture(),
    expectedUserId: "user-1",
  });

  assert.equal(decision.action, "grant");
  assert.equal(decision.reason, "approved_payment_matched");
});

test("reconciliacao pendente nao libera acesso", () => {
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment: mercadoPagoPaymentFixture({ status: "pending" }),
    order: orderFixture(),
    product: productFixture(),
    expectedUserId: "user-1",
  });

  assert.equal(decision.action, "pending");
});

test("reconciliacao bloqueia pagamento de outro usuario", () => {
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment: mercadoPagoPaymentFixture(),
    order: orderFixture({ user_id: "user-2" }),
    product: productFixture(),
    expectedUserId: "user-1",
  });

  assert.deepEqual(decision, {
    action: "invalid",
    reason: "authenticated_user_mismatch",
  });
});

test("reconciliacao bloqueia valor incorreto", () => {
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment: mercadoPagoPaymentFixture({ transaction_amount: 49.9 }),
    order: orderFixture(),
    product: productFixture(),
    expectedUserId: "user-1",
  });

  assert.deepEqual(decision, {
    action: "invalid",
    reason: "amount_mismatch",
  });
});

test("compra de pacote de creditos aprovada libera credito", () => {
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment: mercadoPagoPaymentFixture({ transaction_amount: 19.9 }),
    order: orderFixture({ amount_cents: 1990 }),
    product: productFixture({
      slug: "creditos-20",
      product_kind: "credit_package",
      credit_amount: 20,
      product_name: "Pacote 20 creditos",
    }),
    expectedUserId: "user-1",
  });

  assert.equal(decision.action, "grant");
  assert.equal(decision.reason, "approved_payment_matched");
});

test("pacote de creditos sem quantidade definida nao libera nada", () => {
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment: mercadoPagoPaymentFixture({ transaction_amount: 19.9 }),
    order: orderFixture({ amount_cents: 1990 }),
    product: productFixture({
      slug: "creditos-20",
      product_kind: "credit_package",
      credit_amount: null,
    }),
    expectedUserId: "user-1",
  });

  assert.deepEqual(decision, { action: "invalid", reason: "invalid_credit_package" });
});

test("preco promocional do produto de acesso libera acesso", () => {
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment: mercadoPagoPaymentFixture({ transaction_amount: 79.9 }),
    order: orderFixture({ amount_cents: 7990 }),
    product: productFixture(),
    expectedUserId: "user-1",
  });

  assert.equal(decision.action, "grant");
});

test("valor pago menor que o do pedido nao libera acesso", () => {
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment: mercadoPagoPaymentFixture({ transaction_amount: 1 }),
    order: orderFixture({ amount_cents: 9990 }),
    product: productFixture(),
    expectedUserId: "user-1",
  });

  assert.deepEqual(decision, { action: "invalid", reason: "amount_mismatch" });
});

test("pedido com valor invalido nao libera acesso", () => {
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment: mercadoPagoPaymentFixture({ transaction_amount: 0 }),
    order: orderFixture({ amount_cents: 0 }),
    product: productFixture(),
    expectedUserId: "user-1",
  });

  assert.deepEqual(decision, { action: "invalid", reason: "invalid_order_amount" });
});

test("produto de tipo desconhecido nao libera nada", () => {
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment: mercadoPagoPaymentFixture(),
    order: orderFixture(),
    product: productFixture({ product_kind: "brinde" }),
    expectedUserId: "user-1",
  });

  assert.deepEqual(decision, { action: "invalid", reason: "unexpected_product" });
});

test("reconciliacao bloqueia external_reference incorreta", () => {
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment: mercadoPagoPaymentFixture({
      external_reference: "order-adulterado",
      metadata: { order_id: "order-1", product_id: "product-1", user_id: "user-1" },
    }),
    order: orderFixture(),
    product: productFixture(),
    expectedUserId: "user-1",
  });

  assert.deepEqual(decision, {
    action: "invalid",
    reason: "external_reference_mismatch",
  });
});

test("reconciliacao repetida e idempotente para pedido ja aprovado", () => {
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment: mercadoPagoPaymentFixture(),
    order: orderFixture({ status: "approved" }),
    product: productFixture(),
    expectedUserId: "user-1",
  });

  assert.equal(decision.action, "already_granted");
  assert.equal(decision.reason, "order_already_approved");
});

test("webhook e pagina de sucesso usam o mesmo processador aprovado", () => {
  assert.match(mercadoPagoWebhookRouteSource, /processApprovedMercadoPagoPayment/);
  assert.match(mercadoPagoReconcileRouteSource, /processApprovedMercadoPagoPayment/);
  assert.match(mercadoPagoReconcileRouteSource, /expectedUserId: user\.id/);
  assert.match(mercadoPagoReconcileRouteSource, /fetchMercadoPagoPayment\(paymentId\)/);
});

test("pagina de sucesso le parametros do retorno Mercado Pago e faz polling sem criar novo pagamento", () => {
  assert.match(mercadoPagoSuccessPageSource, /payment_id/);
  assert.match(mercadoPagoSuccessPageSource, /collection_id/);
  assert.match(mercadoPagoSuccessPageSource, /collection_status/);
  assert.match(mercadoPagoSuccessPageSource, /merchant_order_id/);
  assert.match(mercadoPagoSuccessPageSource, /preference_id/);
  assert.match(mercadoPagoSuccessClientSource, /\/api\/payments\/reconcile/);
  assert.match(mercadoPagoSuccessClientSource, /Verificar novamente/);
  assert.doesNotMatch(mercadoPagoSuccessClientSource, /\/api\/payments\/create/);
});

function signMercadoPagoWebhook({ secret, dataId, xRequestId, timestamp }) {
  const manifest = buildSdkEquivalentMercadoPagoManifest({
    dataId,
    xRequestId,
    timestamp,
  });
  const digest = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return timestamp ? `ts=${timestamp},v1=${digest}` : `v1=${digest}`;
}

function buildSdkEquivalentMercadoPagoManifest({ dataId, xRequestId, timestamp }) {
  const parts = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (xRequestId) parts.push(`request-id:${xRequestId}`);
  if (timestamp) parts.push(`ts:${timestamp}`);
  return `${parts.join(";")};`;
}

function mercadoPagoPaymentFixture(overrides = {}) {
  return {
    id: 170716103940,
    status: "approved",
    transaction_amount: 99.9,
    currency_id: "BRL",
    external_reference: "order-1",
    metadata: { order_id: "order-1", product_id: "product-1", user_id: "user-1" },
    ...overrides,
  };
}

function orderFixture(overrides = {}) {
  return {
    id: "order-1",
    user_id: "user-1",
    product_id: "product-1",
    amount_cents: 9990,
    currency: "BRL",
    status: "pending",
    provider: "mercado_pago",
    metadata: {},
    ...overrides,
  };
}

function productFixture(overrides = {}) {
  return {
    id: "product-1",
    product_name: "Pontua Enem Completo",
    slug: "pontuaenem-completo-2026",
    product_kind: "access",
    ...overrides,
  };
}
