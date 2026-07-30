import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TIKTOK_EVENTS_API_URL,
  buildTikTokBrowserPurchase,
  buildTikTokPurchasePayload,
  buildTikTokSignals,
  getTikTokEventsResultProblem,
  hashTikTokEmail,
  hashTikTokExternalId,
  pickPublicIp,
  readTikTokClickIdFromUrl,
  readTikTokCookies,
  readTikTokSignalsFromOrderMetadata,
} from "../src/lib/services/tiktok-events-payload.mjs";

const createRouteSource = readFileSync(
  new URL("../src/app/api/payments/create/route.ts", import.meta.url),
  "utf8",
);
const processingSource = readFileSync(
  new URL("../src/lib/services/mercado-pago-processing.ts", import.meta.url),
  "utf8",
);
const privacyPageSource = readFileSync(
  new URL("../src/app/(public)/privacidade/page.tsx", import.meta.url),
  "utf8",
);
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const landingPageSource = read("../src/app/(public)/page.tsx");
const checkoutPageSource = read("../src/app/(public)/checkout/page.tsx");
const checkoutButtonSource = read("../src/app/(public)/checkout/checkout-button.tsx");
const successPageSource = read(
  "../src/app/(public)/pagamento/sucesso/payment-success-reconciliation.tsx",
);
const pageViewsSource = read("../src/components/analytics/tiktok-pixel-page-views.tsx");
const rootLayoutSource = read("../src/app/layout.tsx");
const publicLayoutSource = read("../src/app/(public)/layout.tsx");
const authLayoutSource = read("../src/app/(auth)/layout.tsx");

const basePurchaseInput = {
  pixelId: "PIXEL123",
  eventId: "order-abc",
  orderId: "order-abc",
  eventTimeSeconds: 1753800000,
  email: "Aluno@Example.com",
  externalId: "7b1f0c2e-0000-4000-8000-0000000000aa",
  amountCents: 9990,
  currency: "BRL",
  contentId: "pontuaenem-completo-2026",
  contentName: "Pontua Enem",
  fallbackPageUrl: "https://pontuaenem.com/checkout",
};

test("usa o endpoint v1.3 do Events API", () => {
  assert.equal(
    TIKTOK_EVENTS_API_URL,
    "https://business-api.tiktok.com/open_api/v1.3/event/track/",
  );
});

// Vetor publicado na doc oficial do TikTok: " ALICE_abc@gmail.com " normalizado
// e com SHA-256 tem que dar exatamente este hash.
test("hash de e-mail segue o vetor oficial do TikTok", () => {
  assert.equal(
    hashTikTokEmail("  ALICE_abc@gmail.com  "),
    "848a771458438fc2ec420560d769fb9b9b86851ee338ec56517baabd79d3bb4f",
  );
  assert.equal(hashTikTokEmail("alice_abc@gmail.com"), hashTikTokEmail("ALICE_ABC@GMAIL.COM"));
});

test("hash de external_id segue o vetor oficial do TikTok", () => {
  assert.equal(
    hashTikTokExternalId(" user_123 "),
    "80fba0ae1c48e3978e43e4efc365e14e12ea0c830ba8ba5b9a2dafc7e3f2ab8b",
  );
});

test("descarta identificadores vazios ou inválidos em vez de hashear lixo", () => {
  assert.equal(hashTikTokEmail(""), null);
  assert.equal(hashTikTokEmail("   "), null);
  assert.equal(hashTikTokEmail("sem-arroba"), null);
  assert.equal(hashTikTokEmail(null), null);
  assert.equal(hashTikTokExternalId(""), null);
  assert.equal(hashTikTokExternalId(undefined), null);
});

test("le os cookies ttclid e _ttp do header", () => {
  const cookies = readTikTokCookies("sb-access=abc; ttclid=E.C.P.abc123; _ttp=UqBuLHl7TuWsDXUu");
  assert.equal(cookies.ttclid, "E.C.P.abc123");
  assert.equal(cookies.ttp, "UqBuLHl7TuWsDXUu");
});

test("cookies ausentes ou header vazio nao viram string vazia", () => {
  assert.deepEqual(readTikTokCookies(""), { ttclid: null, ttp: null });
  assert.deepEqual(readTikTokCookies(null), { ttclid: null, ttp: null });
  assert.deepEqual(readTikTokCookies("outro=1; ttclid=  "), { ttclid: null, ttp: null });
});

// O TikTok pede o IP PÚBLICO. Atrás de proxy reverso o x-forwarded-for começa
// com o IP interno da infra, e mandar 10.x piora o matching em vez de ajudar.
test("escolhe o primeiro IP publico da cadeia de proxy", () => {
  assert.equal(pickPublicIp(["10.0.0.8, 203.0.113.7, 172.16.3.1"]), "203.0.113.7");
  assert.equal(pickPublicIp(["192.168.1.10", "198.51.100.4"]), "198.51.100.4");
  assert.equal(pickPublicIp(["127.0.0.1", "::1"]), null);
  assert.equal(pickPublicIp(["fe80::1", "2001:db8::200"]), "2001:db8::200");
  assert.equal(pickPublicIp(["::ffff:10.0.0.1", "::ffff:203.0.113.9"]), "::ffff:203.0.113.9");
  assert.equal(pickPublicIp([null, undefined, ""]), null);
  assert.equal(pickPublicIp(["100.64.0.1"]), null);
});

test("monta os sinais do request do comprador sem chaves vazias", () => {
  const signals = buildTikTokSignals({
    cookieHeader: "ttclid=E.C.P.abc; _ttp=cookie-id",
    userAgent: "Mozilla/5.0",
    forwardedFor: "10.1.2.3, 203.0.113.7",
    realIp: null,
    connectingIp: null,
    pageUrl: "https://pontuaenem.com/checkout",
  });

  assert.deepEqual(signals, {
    ttclid: "E.C.P.abc",
    ttp: "cookie-id",
    ip: "203.0.113.7",
    user_agent: "Mozilla/5.0",
    page_url: "https://pontuaenem.com/checkout",
  });
  assert.equal("referrer" in signals, false);
});

test("ttclid da URL tem prioridade sobre o cookie antigo", () => {
  const signals = buildTikTokSignals({
    cookieHeader: "ttclid=clique-antigo",
    ttclidParam: "clique-novo",
  });
  assert.equal(signals.ttclid, "clique-novo");
});

test("le o ttclid direto da URL quando o cookie do Pixel nao existe", () => {
  assert.equal(
    readTikTokClickIdFromUrl("https://pontuaenem.com/checkout?ttclid=E.C.P.abc&utm=x"),
    "E.C.P.abc",
  );
  assert.equal(readTikTokClickIdFromUrl("https://pontuaenem.com/checkout"), null);
  assert.equal(readTikTokClickIdFromUrl("nao-e-url"), null);
  assert.equal(readTikTokClickIdFromUrl(null), null);
});

test("recupera os sinais gravados no metadata do pedido", () => {
  const signals = readTikTokSignalsFromOrderMetadata({
    source: "checkout",
    tiktok: { ttclid: "E.C.P.abc", ip: "203.0.113.7", ttp: null },
  });
  assert.deepEqual(signals, { ttclid: "E.C.P.abc", ip: "203.0.113.7" });
});

test("metadata sem bloco tiktok devolve objeto vazio", () => {
  assert.deepEqual(readTikTokSignalsFromOrderMetadata(null), {});
  assert.deepEqual(readTikTokSignalsFromOrderMetadata({ source: "checkout" }), {});
  assert.deepEqual(readTikTokSignalsFromOrderMetadata({ tiktok: "invalido" }), {});
});

test("payload do Purchase segue o contrato de eventos web", () => {
  const payload = buildTikTokPurchasePayload({
    ...basePurchaseInput,
    signals: {
      ttclid: "E.C.P.abc",
      ttp: "cookie-id",
      ip: "203.0.113.7",
      user_agent: "Mozilla/5.0",
      page_url: "https://pontuaenem.com/checkout?ttclid=E.C.P.abc",
    },
  });

  assert.equal(payload.event_source, "web");
  assert.equal(payload.event_source_id, "PIXEL123");
  assert.equal(payload.data.length, 1);

  const [event] = payload.data;
  // Nome case-sensitive: "purchase" ou "Purchased" nao existem no catalogo.
  assert.equal(event.event, "Purchase");
  assert.equal(event.event_time, 1753800000);
  assert.equal(event.event_id, "order-abc");
  // page é obrigatório em eventos web.
  assert.equal(event.page.url, "https://pontuaenem.com/checkout?ttclid=E.C.P.abc");
  // Identificadores hasheados; sinais de sessão crus.
  assert.equal(event.user.email, hashTikTokEmail("aluno@example.com"));
  assert.equal(event.user.external_id, hashTikTokExternalId(basePurchaseInput.externalId));
  assert.equal(event.user.ttclid, "E.C.P.abc");
  assert.equal(event.user.ip, "203.0.113.7");
  assert.equal(event.user.user_agent, "Mozilla/5.0");
  assert.equal(event.properties.currency, "BRL");
  assert.equal(event.properties.value, 99.9);
  assert.equal(event.properties.content_type, "product");
  assert.equal(event.properties.order_id, "order-abc");
  assert.deepEqual(event.properties.contents, [
    {
      content_id: "pontuaenem-completo-2026",
      content_name: "Pontua Enem",
      price: 99.9,
      quantity: 1,
    },
  ]);
});

test("nao envia campos nulos nem test_event_code fora de teste", () => {
  const payload = buildTikTokPurchasePayload({ ...basePurchaseInput, email: null });
  const [event] = payload.data;

  assert.equal("test_event_code" in payload, false);
  assert.equal("email" in event.user, false);
  assert.equal("ttclid" in event.user, false);
  assert.equal("referrer" in event.page, false);
});

test("aceita test_event_code quando informado", () => {
  const payload = buildTikTokPurchasePayload({
    ...basePurchaseInput,
    testEventCode: "TEST12345",
  });
  assert.equal(payload.test_event_code, "TEST12345");
});

test("cai no page.url de reserva quando o pedido nao guardou a pagina", () => {
  const payload = buildTikTokPurchasePayload({ ...basePurchaseInput, signals: {} });
  assert.equal(payload.data[0].page.url, "https://pontuaenem.com/checkout");
});

test("recusa payload que o TikTok descartaria em silencio", () => {
  assert.throws(
    () => buildTikTokPurchasePayload({ ...basePurchaseInput, currency: "USD" }),
    /Moeda não suportada/,
  );
  assert.throws(
    () => buildTikTokPurchasePayload({ ...basePurchaseInput, amountCents: 0 }),
    /value inválido/,
  );
  assert.throws(
    () => buildTikTokPurchasePayload({ ...basePurchaseInput, pixelId: "" }),
    /pixel id ausente/,
  );
  assert.throws(
    () => buildTikTokPurchasePayload({ ...basePurchaseInput, eventId: "" }),
    /event_id ausente/,
  );
  assert.throws(
    () =>
      buildTikTokPurchasePayload({
        ...basePurchaseInput,
        signals: {},
        fallbackPageUrl: null,
      }),
    /page.url é obrigatório/,
  );
  assert.throws(
    () => buildTikTokPurchasePayload({ ...basePurchaseInput, eventTimeSeconds: 0 }),
    /event_time inválido/,
  );
});

// Invariante da deduplicação: mesmo event_source_id + event + event_id nos dois
// canais. Se event_id ou value divergirem, a compra conta duas vezes.
test("Pixel e Events API reportam o mesmo event_id e o mesmo valor", () => {
  const server = buildTikTokPurchasePayload(basePurchaseInput);
  const browser = buildTikTokBrowserPurchase({
    orderId: basePurchaseInput.orderId,
    amountCents: basePurchaseInput.amountCents,
    currency: basePurchaseInput.currency,
    contentId: basePurchaseInput.contentId,
    contentName: basePurchaseInput.contentName,
  });

  assert.equal(browser.event_id, server.data[0].event_id);
  assert.equal(browser.properties.value, server.data[0].properties.value);
  assert.equal(browser.properties.currency, server.data[0].properties.currency);
  assert.deepEqual(browser.properties.contents, server.data[0].properties.contents);
});

test("espelho de browser recusa pedido sem id ou valor valido", () => {
  assert.equal(buildTikTokBrowserPurchase({ orderId: null, amountCents: 100, currency: "BRL" }), null);
  assert.equal(buildTikTokBrowserPurchase({ orderId: "x", amountCents: 0, currency: "BRL" }), null);
  assert.equal(buildTikTokBrowserPurchase({ orderId: "x", amountCents: 100, currency: "USD" }), null);
});

// HTTP 200 não significa sucesso no Events API: o que vale é code === 0.
test("trata code diferente de zero como falha mesmo com HTTP 200", () => {
  assert.equal(getTikTokEventsResultProblem({ httpStatus: 200, body: { code: 0 } }), null);
  assert.equal(
    getTikTokEventsResultProblem({ httpStatus: 200, body: { code: 40001 } }),
    "code_40001",
  );
  assert.equal(getTikTokEventsResultProblem({ httpStatus: 200, body: null }), "empty_body");
  assert.equal(getTikTokEventsResultProblem({ httpStatus: 401, body: { code: 0 } }), "http_401");
});

test("o checkout captura os sinais e grava no pedido", () => {
  assert.match(createRouteSource, /buildTikTokSignals/);
  assert.match(createRouteSource, /cookieHeader: request\.headers\.get\("cookie"\)/);
  assert.match(createRouteSource, /forwardedFor: request\.headers\.get\("x-forwarded-for"\)/);
  // Pedido novo e pedido reaproveitado precisam guardar os sinais.
  assert.equal(createRouteSource.match(/tiktok: tiktokSignals/g)?.length, 2);
});

test("o Purchase server-side cobre webhook e reconciliacao sem quebrar o acesso", () => {
  assert.match(processingSource, /sendTikTokPurchaseEvent/);
  // Publicidade nunca pode impedir a liberação do acesso pago.
  assert.match(processingSource, /catch \(error\) \{[\s\S]*tiktok purchase report failed/);
  // Recarga de crédito não é a conversão de aquisição da campanha.
  assert.match(processingSource, /product\?\.product_kind !== "access"/);
});

// O Diagnostics do TikTok exige o funil completo do vertical de commerce:
// Page view, View content, Add to cart, Initiate checkout e Purchase.
test("o funil de navegador cobre as cinco etapas exigidas pelo TikTok", () => {
  assert.match(landingPageSource, /event="ViewContent"/);
  assert.match(checkoutPageSource, /event="AddToCart"/);
  assert.match(checkoutButtonSource, /trackTikTokEvent\("InitiateCheckout"/);
  assert.match(successPageSource, /trackTikTokEvent\("Purchase"/);
  assert.match(pageViewsSource, /trackTikTokPageView/);
});

test("os eventos de produto levam identificacao de produto e valor", () => {
  for (const source of [landingPageSource, checkoutPageSource]) {
    assert.match(source, /contentId=\{product\.slug\}/);
    assert.match(source, /amountCents=\{price\}/);
  }
  assert.match(checkoutButtonSource, /content_id: productSlug/);
  assert.match(checkoutButtonSource, /value: Math\.round\(amountCents\) \/ 100/);
});

// identify antes de track, senão o evento sai sem Advanced Matching.
test("identify precede o track nos eventos identificados", () => {
  for (const source of [checkoutButtonSource, successPageSource]) {
    assert.ok(
      source.indexOf("identifyTikTokUser") < source.indexOf("trackTikTokEvent"),
      "identifyTikTokUser deve aparecer antes de trackTikTokEvent",
    );
  }
});

// O AAM varre inputs e texto visível. No layout raiz isso alcançaria nome de
// aluno e texto de redação na área logada, sem nenhum ganho de atribuição.
test("o Pixel nao carrega na area logada", () => {
  assert.doesNotMatch(rootLayoutSource, /TikTokPixel/);
  assert.match(publicLayoutSource, /<TikTokPixel \/>/);
  assert.match(authLayoutSource, /<TikTokPixel \/>/);
});

test("a politica de privacidade declara o uso do TikTok", () => {
  assert.match(privacyPageSource, /TikTok Pixel/);
  assert.match(privacyPageSource, /Events API/);
  // A frase antiga negava qualquer pixel de marketing e ficaria falsa.
  assert.doesNotMatch(privacyPageSource, /não utilizamos cookies de publicidade/);
});
