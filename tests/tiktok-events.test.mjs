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
  isTikTokClickIdShape,
  mergeTikTokSignals,
  pickPublicIp,
  TIKTOK_CLICK_ID_COOKIE,
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
  "../src/app/(payments)/pagamento/sucesso/payment-success-reconciliation.tsx",
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
  const vazio = { ttclid: null, ttp: null, proprio: null };
  assert.deepEqual(readTikTokCookies(""), vazio);
  assert.deepEqual(readTikTokCookies(null), vazio);
  assert.deepEqual(readTikTokCookies("outro=1; ttclid=  "), vazio);
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
  // Pedido novo grava os sinais direto; pedido reaproveitado passa pelo merge,
  // que preserva um ttclid capturado antes em vez de substituir o bloco.
  assert.match(createRouteSource, /tiktok: tiktokSignals/);
  assert.match(createRouteSource, /tiktok: mergeTikTokSignals\(previousMetadata\.tiktok, tiktokSignals\)/);
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

// Regressão real: com script-src 'self' a CSP barrava o SDK que o base code
// injeta, e o Pixel Helper reportava "No TikTok Pixel detected on this page"
// mesmo com o código correto no HTML. Nada no build ou nos testes acusava.
// Bloqueador achado na revisão: test_event_code em produção faria TODA compra
// real cair na aba Test events, sem contar como conversão — e em silêncio, já
// que o TikTok responde code 0 e o log diz "evento aceito".
test("test_event_code nunca pode sair em producao", () => {
  const source = read("../src/lib/services/tiktok-events.ts");
  const trecho = source.slice(
    source.indexOf("function getTikTokTestEventCode"),
    source.indexOf("export function isTikTokEventsConfigured"),
  );
  assert.match(trecho, /NODE_ENV === "production"/);
  assert.match(trecho, /return ""/);
  assert.match(trecho, /console\.warn/);
});

// Cenário real: clica no anúncio no celular (grava ttclid), abandona, paga dias
// depois pelo notebook sem ttclid. Substituir o bloco apagaria a prova do clique.
test("reaproveitar pedido preserva o ttclid capturado antes", () => {
  const anteriores = {
    ttclid: "E.C.P.CLIQUE_ORIGINAL",
    ttp: "cookie-antigo",
    ip: "203.0.113.7",
    user_agent: "UA antigo",
    page_url: "https://pontuaenem.com.br/checkout?ttclid=E.C.P.CLIQUE_ORIGINAL",
  };
  const novos = { ip: "198.51.100.4", user_agent: "UA novo", page_url: "https://pontuaenem.com.br/checkout" };

  const merged = mergeTikTokSignals(anteriores, novos);
  assert.equal(merged.ttclid, "E.C.P.CLIQUE_ORIGINAL", "o click ID original nao pode ser perdido");
  assert.equal(merged.ttp, "cookie-antigo");
  // Sinais de sessão descrevem a compra: valem os do request mais recente.
  assert.equal(merged.ip, "198.51.100.4");
  assert.equal(merged.user_agent, "UA novo");
});

test("clique novo sobrescreve o ttclid antigo", () => {
  const merged = mergeTikTokSignals(
    { ttclid: "E.C.P.ANTIGO", ip: "203.0.113.7" },
    { ttclid: "E.C.P.NOVO", ip: "198.51.100.4" },
  );
  assert.equal(merged.ttclid, "E.C.P.NOVO");
});

test("merge aceita metadata ausente ou invalido sem quebrar", () => {
  assert.deepEqual(mergeTikTokSignals(null, { ip: "198.51.100.4" }), { ip: "198.51.100.4" });
  assert.deepEqual(mergeTikTokSignals("lixo", {}), {});
  assert.deepEqual(mergeTikTokSignals(undefined, undefined), {});
});

// O cookie do SDK depende do Pixel ter carregado e é cortado em 7 dias pelo ITP
// do Safari. O nosso é Set-Cookie httpOnly, imune aos dois problemas.
test("cookie proprio de click ID tem prioridade sobre o do SDK", () => {
  const signals = buildTikTokSignals({
    cookieHeader: `ttclid=E.C.P.DO_SDK; ${TIKTOK_CLICK_ID_COOKIE}=E.C.P.NOSSO; _ttp=abc`,
  });
  assert.equal(signals.ttclid, "E.C.P.NOSSO");
});

test("sem cookie proprio ainda usa o do SDK", () => {
  const signals = buildTikTokSignals({ cookieHeader: "ttclid=E.C.P.DO_SDK" });
  assert.equal(signals.ttclid, "E.C.P.DO_SDK");
});

test("validacao do click ID recusa lixo de query manipulada", () => {
  assert.ok(isTikTokClickIdShape("E.C.P.v3fQ2RHacdksKfofPmlyuStIIHJ4Af1tKYxF9zz2c2PLx1Oaw15oHpcfl5AH"));
  assert.ok(!isTikTokClickIdShape("qualquer-coisa"));
  assert.ok(!isTikTokClickIdShape("E.C.P.curto"));
  assert.ok(!isTikTokClickIdShape("E.C.P." + "x".repeat(600)));
  assert.ok(!isTikTokClickIdShape('E.C.P.<script>alert(1)</script>'));
  assert.ok(!isTikTokClickIdShape(null));
});

test("o middleware captura o click ID no mesmo ponto do codigo de indicacao", () => {
  const source = read("../src/lib/supabase/middleware.ts");
  assert.match(source, /searchParams\.get\("ttclid"\)/);
  assert.match(source, /isTikTokClickIdShape/);
  assert.match(source, /httpOnly: true/);
});

// A dedup do TikTok por event_id cobre só 48h. Sem trava persistida, reabrir a
// página de retorno depois disso contaria uma segunda conversão.
test("uma compra reporta ao TikTok uma unica vez, para sempre", () => {
  const source = read("../src/lib/services/mercado-pago-processing.ts");
  assert.match(source, /tiktok_purchase_reported_at/);
  assert.match(source, /if \(metadata\[TIKTOK_REPORTED_AT_KEY\]\)/);
  // O espelho do navegador só sai quando o servidor reportou nesta execução.
  assert.match(source, /if \(!enviado\) return null/);
});

// O próprio comentário do módulo promete que publicidade não segura a entrega
// do produto pago. Antes o await rodava ANTES do grant e contradizia isso.
test("o envio ao TikTok roda depois da liberacao de acesso", () => {
  const source = read("../src/lib/services/mercado-pago-processing.ts");
  const grant = source.indexOf('rpc("grant_paid_access_for_order"');
  const report = source.indexOf("await reportTikTokPurchase", grant);
  assert.ok(grant > 0, "grant nao encontrado");
  assert.ok(report > grant, "reportTikTokPurchase precisa vir depois do grant");
});

test("a CSP libera os hosts do Pixel nas tres diretivas necessarias", () => {
  const nextConfigSource = read("../next.config.ts");

  for (const directive of ["script-src", "img-src", "connect-src"]) {
    const linha = nextConfigSource
      .split("\n")
      .find((item) => item.includes(directive));
    assert.ok(linha, `diretiva ${directive} ausente da CSP`);
    assert.ok(
      linha.includes("tiktokPixelHosts") || linha.includes("analytics.tiktok.com"),
      `${directive} precisa liberar analytics.tiktok.com`,
    );
  }

  assert.match(nextConfigSource, /analytics\.tiktok\.com/);
  assert.match(nextConfigSource, /ads\.tiktok\.com/);
  // Wildcard em *.tiktok.com abriria mais superfície do que o Pixel precisa.
  assert.doesNotMatch(nextConfigSource, /\*\.tiktok\.com/);
});

test("a politica de privacidade declara o uso do TikTok", () => {
  assert.match(privacyPageSource, /TikTok Pixel/);
  assert.match(privacyPageSource, /Events API/);
  // A frase antiga negava qualquer pixel de marketing e ficaria falsa.
  assert.doesNotMatch(privacyPageSource, /não utilizamos cookies de publicidade/);
});

// --- Bugs de produto achados na revisão do funil ---

const reconcileSource = read("../src/app/api/payments/reconcile/route.ts");
const sucessoPageSource = read("../src/app/(payments)/pagamento/sucesso/page.tsx");
const middlewareSource = read("../src/lib/supabase/middleware.ts");

// Três telas geram /pagamento/sucesso?order=UUID, mas a página só repassava
// payment_id/collection_id — quem pagou por Pix recebia 400 e a tela acusava
// falha de pagamento.
test("o link Verificar meu pagamento chega ate a reconciliacao", () => {
  assert.match(sucessoPageSource, /order: pickParam\(params\.order\)/);
  assert.match(reconcileSource, /normalizeOrderId\(body\.order \?\? body\.external_reference\)/);
  assert.match(reconcileSource, /findProviderPaymentIdForOrder/);
});

// O id do pedido vem da query string: sem filtrar por dono, qualquer pessoa
// logada consultaria pedido alheio.
test("busca por pedido e escopada ao dono", () => {
  const fn = reconcileSource.slice(reconcileSource.indexOf("async function findProviderPaymentIdForOrder"));
  assert.match(fn, /\.eq\("id", orderId\)/);
  assert.match(fn, /\.eq\("user_id", userId\)/);
});

test("pedido sem pagamento registrado responde pendente, nao erro", () => {
  const trecho = reconcileSource.slice(reconcileSource.indexOf("if (!paymentId)"));
  assert.match(trecho, /status: "pending"/);
  // O 400 continua existindo, mas só quando nem pedido nem pagamento vieram.
  assert.match(trecho, /status: 400/);
  assert.ok(
    trecho.indexOf('status: "pending"') < trecho.indexOf("status: 400"),
    "o caminho de pedido conhecido tem que vir antes do 400",
  );
});

// O parâmetro era escrito em dois redirects e lido em nenhum destino.
test("middleware nao escreve mais o parametro next que ninguem lia", () => {
  assert.doesNotMatch(middlewareSource, /searchParams\.set\("next"/);
  // redirectedFrom continua: esse a tela de login realmente consome.
  assert.match(middlewareSource, /searchParams\.set\("redirectedFrom"/);
});

// Remover o next não pode levar junto o resto da query (ex.: ttclid).
test("remover o next nao apaga a query inteira", () => {
  assert.doesNotMatch(middlewareSource, /url\.search = ""/);
});

// As telas de retorno saíram do layout da landing: ali o cabeçalho oferecia
// "Começar agora" (→ /checkout) para quem tinha acabado de comprar.
test("telas de pagamento ficam fora do layout da landing mas mantem o Pixel", () => {
  const paymentsLayout = read("../src/app/(payments)/layout.tsx");
  assert.match(paymentsLayout, /<TikTokPixel \/>/, "sem Pixel o Purchase do navegador nao sai");
  assert.doesNotMatch(paymentsLayout, /LandingHeader|LandingFooter/);
});

test("compra de credito volta para a tela de creditos", () => {
  assert.match(processingSource, /postPurchaseDestination/);
  assert.match(processingSource, /credit_package" \? "\/dashboard\/creditos"/);
  assert.match(reconcileSource, /processing\.redirectTo \?\? "\/dashboard"/);
});

test("a tela de falha usa o pedido que recebe", () => {
  const falha = read("../src/app/(payments)/pagamento/falha/page.tsx");
  assert.match(falha, /searchParams/);
  assert.match(falha, /\/pagamento\/sucesso\?order=/);
});
