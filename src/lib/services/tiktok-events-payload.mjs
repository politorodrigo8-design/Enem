import crypto from "node:crypto";

// Contrato do Events API 2.0 (v1.3) do TikTok. Regras que vêm da doc oficial e
// não podem ser afrouxadas:
// - nomes de evento são case-sensitive ("Purchase", não "purchased");
// - event_time é Unix em SEGUNDOS, UTC+0;
// - email / phone / external_id exigem SHA-256; ip, user_agent, ttclid e ttp
//   viajam crus;
// - o objeto page é obrigatório em eventos web;
// - a dedup entre Pixel e Events API usa event_source_id + event + event_id,
//   então o event_id precisa ser idêntico nos dois canais.
export const TIKTOK_EVENTS_API_URL =
  "https://business-api.tiktok.com/open_api/v1.3/event/track/";

export const TIKTOK_EVENTS = {
  purchase: "Purchase",
  initiateCheckout: "InitiateCheckout",
  completeRegistration: "CompleteRegistration",
};

// Moedas aceitas pelo TikTok que interessam aqui. A lista completa é maior, mas
// só cobramos em BRL — recusar o resto evita mandar evento de receita que o
// TikTok descarta silenciosamente.
const supportedCurrencies = new Set(["BRL"]);

export function hashTikTokEmail(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;
  return sha256(normalized);
}

// A doc de external_id pede apenas trim antes do hash — não normaliza caixa.
// Mantido igual ao que o TikTok faz no browser quando o valor cru vai em
// ttq.identify, senão os dois canais gerariam hashes diferentes.
export function hashTikTokExternalId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return sha256(normalized);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function readTikTokCookies(cookieHeader) {
  if (typeof cookieHeader !== "string" || !cookieHeader) {
    return { ttclid: null, ttp: null, proprio: null };
  }

  const jar = new Map();
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    if (!name || jar.has(name)) continue;
    jar.set(name, part.slice(separator + 1).trim());
  }

  return {
    ttclid: normalizeSignal(jar.get("ttclid")),
    ttp: normalizeSignal(jar.get("_ttp")),
    proprio: normalizeSignal(jar.get(TIKTOK_CLICK_ID_COOKIE)),
  };
}

// O TikTok quer o IP PÚBLICO do comprador. Atrás de proxy reverso o
// x-forwarded-for pode começar com endereço interno da infra, e mandar 10.x
// piora o matching em vez de ajudar.
export function pickPublicIp(headerValues) {
  const candidates = [];
  for (const value of headerValues) {
    if (typeof value !== "string") continue;
    for (const item of value.split(",")) {
      const candidate = item.trim();
      if (candidate) candidates.push(candidate);
    }
  }

  return candidates.find(isPublicIp) ?? null;
}

function isPublicIp(value) {
  const address = value.startsWith("[") ? value.slice(1, value.indexOf("]")) : value;
  if (!address) return false;

  if (address.includes(":")) return isPublicIpv6(address);
  return isPublicIpv4(address);
}

function isPublicIpv4(address) {
  const octets = address.split(".");
  if (octets.length !== 4) return false;

  const numbers = octets.map((octet) => {
    if (!/^\d{1,3}$/.test(octet)) return -1;
    return Number(octet);
  });
  if (numbers.some((number) => number < 0 || number > 255)) return false;

  const [first, second] = numbers;
  if (first === 10 || first === 127 || first === 0) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && second === 168) return false;
  if (first === 169 && second === 254) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first >= 224) return false;
  return true;
}

function isPublicIpv6(address) {
  const normalized = address.toLowerCase();
  if (!/^[0-9a-f:.]+$/.test(normalized)) return false;
  if (normalized === "::1" || normalized === "::") return false;
  // ::ffff:10.0.0.1 e afins carregam um IPv4 mapeado dentro do IPv6.
  const mapped = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPublicIpv4(mapped[1]);
  if (/^fe[89ab]/.test(normalized)) return false;
  if (/^f[cd]/.test(normalized)) return false;
  return normalized.includes(":");
}

/**
 * Extrai os sinais de matching da requisição DO COMPRADOR. Precisa rodar no
 * request do navegador dele: o webhook do Mercado Pago é servidor-para-servidor,
 * então ip/user_agent de lá são do Mercado Pago e ttclid/_ttp não existem.
 */
export function buildTikTokSignals({
  cookieHeader,
  userAgent,
  forwardedFor,
  realIp,
  connectingIp,
  pageUrl,
  referrer,
  ttclidParam,
}) {
  const cookies = readTikTokCookies(cookieHeader);

  return compact({
    // Ordem de confiança: parâmetro na URL do request atual > nosso cookie de
    // primeira parte (gravado pelo middleware, sobrevive a ITP e a Pixel
    // bloqueado) > cookie do SDK do TikTok.
    ttclid: normalizeSignal(ttclidParam) ?? cookies.proprio ?? cookies.ttclid,
    ttp: cookies.ttp,
    ip: pickPublicIp([forwardedFor, realIp, connectingIp]),
    user_agent: normalizeSignal(userAgent),
    page_url: normalizeSignal(pageUrl),
    referrer: normalizeSignal(referrer),
  });
}

// Cookie PRÓPRIO de click ID, gravado por Set-Cookie no middleware. Existe
// porque depender do cookie do SDK do TikTok tem três furos: (1) o SDK pode não
// carregar (bloqueador, CSP, in-app browser); (2) cookie escrito por script é
// cortado em 7 dias pelo ITP do Safari; (3) o parâmetro morre na primeira
// navegação client-side, já que o CTA aponta para /checkout sem query.
// Nome diferente do cookie do SDK (`ttclid`) para não sobrescrevê-lo.
export const TIKTOK_CLICK_ID_COOKIE = "pontua_ttclid";

// A doc do TikTok recomenda guardar o click ID por 28 dias ou mais.
export const TIKTOK_CLICK_ID_COOKIE_DAYS = 30;

// Click ID do TikTok começa com "E.C.P." e é base64-url. Validar evita gravar
// lixo de query manipulada e limita o tamanho do cookie.
const tiktokClickIdPattern = /^E\.C\.P\.[A-Za-z0-9_-]{8,512}$/;

export function isTikTokClickIdShape(value) {
  return typeof value === "string" && tiktokClickIdPattern.test(value.trim());
}

// O cookie ttclid depende do Pixel ter rodado. Se o comprador bloqueia scripts
// mas o parâmetro ainda está na URL, ele continua sendo a melhor pista do clique.
export function readTikTokClickIdFromUrl(url) {
  if (typeof url !== "string" || !url) return null;
  try {
    return normalizeSignal(new URL(url).searchParams.get("ttclid"));
  } catch {
    return null;
  }
}

/**
 * Une sinais já gravados no pedido com os do request atual, SEM deixar o novo
 * apagar o antigo. Cenário real: o comprador clica no anúncio no celular (grava
 * ttclid), abandona, e dias depois paga pelo notebook — onde não há ttclid. O
 * pedido é reaproveitado e um replace cego destruiria a única prova do clique.
 * IP, user agent e página vêm sempre do request mais recente, que é o correto:
 * são do momento da compra.
 */
export function mergeTikTokSignals(anteriores, novos) {
  const base = anteriores && typeof anteriores === "object" && !Array.isArray(anteriores)
    ? anteriores
    : {};
  const recentes = novos && typeof novos === "object" && !Array.isArray(novos) ? novos : {};

  return compact({
    // Identificadores de atribuição: só sobrescreve se o novo request trouxer.
    ttclid: normalizeSignal(recentes.ttclid) ?? normalizeSignal(base.ttclid),
    ttp: normalizeSignal(recentes.ttp) ?? normalizeSignal(base.ttp),
    // Sinais de sessão: o mais recente é o que descreve a compra.
    ip: normalizeSignal(recentes.ip) ?? normalizeSignal(base.ip),
    user_agent: normalizeSignal(recentes.user_agent) ?? normalizeSignal(base.user_agent),
    page_url: normalizeSignal(recentes.page_url) ?? normalizeSignal(base.page_url),
    referrer: normalizeSignal(recentes.referrer) ?? normalizeSignal(base.referrer),
  });
}

export function readTikTokSignalsFromOrderMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const stored = metadata.tiktok;
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};

  return compact({
    ttclid: normalizeSignal(stored.ttclid),
    ttp: normalizeSignal(stored.ttp),
    ip: normalizeSignal(stored.ip),
    user_agent: normalizeSignal(stored.user_agent),
    page_url: normalizeSignal(stored.page_url),
    referrer: normalizeSignal(stored.referrer),
  });
}

export function buildTikTokPurchasePayload({
  pixelId,
  eventId,
  eventTimeSeconds,
  email,
  externalId,
  signals = {},
  amountCents,
  currency,
  contentId,
  contentName,
  orderId,
  fallbackPageUrl,
  testEventCode,
}) {
  if (!pixelId) throw new Error("TikTok pixel id ausente.");
  if (!eventId) throw new Error("TikTok event_id ausente.");
  if (!supportedCurrencies.has(currency)) {
    throw new Error(`Moeda não suportada no TikTok Events API: ${currency}`);
  }

  const pageUrl = signals.page_url ?? fallbackPageUrl;
  if (!pageUrl) throw new Error("TikTok page.url é obrigatório em eventos web.");

  const value = Math.round(Number(amountCents)) / 100;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("TikTok properties.value inválido.");
  }

  const user = compact({
    email: hashTikTokEmail(email),
    external_id: hashTikTokExternalId(externalId),
    ttclid: signals.ttclid,
    ttp: signals.ttp,
    ip: signals.ip,
    user_agent: signals.user_agent,
    locale: "pt-BR",
  });

  return compact({
    event_source: "web",
    event_source_id: pixelId,
    test_event_code: normalizeSignal(testEventCode),
    data: [
      compact({
        event: TIKTOK_EVENTS.purchase,
        event_time: toUnixSeconds(eventTimeSeconds),
        event_id: String(eventId),
        user,
        page: compact({ url: pageUrl, referrer: signals.referrer }),
        properties: compact({
          currency,
          value,
          content_type: "product",
          order_id: orderId ? String(orderId) : null,
          contents: contentId
            ? [
                compact({
                  content_id: String(contentId),
                  content_name: normalizeSignal(contentName),
                  price: value,
                  quantity: 1,
                }),
              ]
            : null,
        }),
      }),
    ],
  });
}

/**
 * Espelho do payload do servidor para o Pixel do navegador. Existe para os dois
 * canais nunca divergirem: mesmo event_id (senão a compra conta duas vezes) e
 * mesmo formato de value/contents.
 */
export function buildTikTokBrowserPurchase({
  orderId,
  amountCents,
  currency,
  contentId,
  contentName,
}) {
  if (!orderId || !supportedCurrencies.has(currency)) return null;

  const value = Math.round(Number(amountCents)) / 100;
  if (!Number.isFinite(value) || value <= 0) return null;

  return {
    event_id: String(orderId),
    properties: compact({
      currency,
      value,
      content_type: "product",
      order_id: String(orderId),
      contents: contentId
        ? [
            compact({
              content_id: String(contentId),
              content_name: normalizeSignal(contentName),
              price: value,
              quantity: 1,
            }),
          ]
        : null,
    }),
  };
}

function toUnixSeconds(value) {
  const seconds = Math.floor(Number(value));
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("TikTok event_time inválido.");
  }
  return seconds;
}

// O TikTok responde HTTP 200 mesmo em erro: o que vale é code === 0.
export function getTikTokEventsResultProblem({ httpStatus, body }) {
  if (!Number.isFinite(httpStatus) || httpStatus < 200 || httpStatus >= 300) {
    return `http_${httpStatus}`;
  }
  if (!body || typeof body !== "object") return "empty_body";
  if (body.code !== 0) return `code_${body.code}`;
  return null;
}

function normalizeSignal(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function compact(source) {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== null && value !== undefined),
  );
}
