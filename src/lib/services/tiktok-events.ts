import {
  TIKTOK_EVENTS_API_URL,
  buildTikTokPurchasePayload,
  getTikTokEventsResultProblem,
  readTikTokSignalsFromOrderMetadata,
} from "@/lib/services/tiktok-events-payload.mjs";
import { getSiteUrl } from "@/lib/supabase/config";

// O webhook do Mercado Pago tem que ser respondido rápido, senão o provedor
// reenvia. O envio ao TikTok nunca pode segurar nem derrubar a liberação de
// acesso: falha aqui é log, não exceção. Roda depois do grant, então este
// timeout é o teto do atraso que a publicidade adiciona ao webhook.
const requestTimeoutMs = 2000;

export function getTikTokPixelId() {
  return (process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "").trim();
}

function getTikTokAccessToken() {
  return (process.env.TIKTOK_EVENTS_ACCESS_TOKEN || "").trim();
}

function getTikTokTestEventCode() {
  const code = (process.env.TIKTOK_EVENTS_TEST_EVENT_CODE || "").trim();
  if (!code) return "";

  // Evento com test_event_code NÃO entra em dado ao vivo — vai só para a aba
  // Test events. Se essa variável vazasse para produção, toda compra real seria
  // invisível para a campanha, e a falha seria silenciosa: o TikTok responde
  // code 0 e o log diz "evento aceito". Confiar em ninguém setar a variável é
  // frágil demais para o custo; produção ignora e denuncia.
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[tiktok:events] TIKTOK_EVENTS_TEST_EVENT_CODE presente em produção e IGNORADO",
      { motivo: "evento de teste não conta como conversão; remova a variável do ambiente" },
    );
    return "";
  }

  return code;
}

export function isTikTokEventsConfigured() {
  return Boolean(getTikTokPixelId() && getTikTokAccessToken());
}

export async function sendTikTokPurchaseEvent({
  orderId,
  userId,
  email,
  amountCents,
  currency,
  productSlug,
  productName,
  orderMetadata,
  eventTimeSeconds,
}: {
  orderId: string;
  userId: string;
  email: string | null;
  amountCents: number;
  currency: string;
  productSlug: string | null;
  productName: string | null;
  orderMetadata: unknown;
  eventTimeSeconds?: number;
}): Promise<boolean> {
  // Sem token o envio é um no-op silencioso por design — publicidade não pode
  // derrubar a liberação de acesso. Mas silêncio total torna impossível
  // distinguir "variável de ambiente faltando" de "TikTok recusou", então o
  // estado de não-configurado precisa aparecer no log.
  if (!isTikTokEventsConfigured()) {
    console.warn("[tiktok:events] envio ignorado: integração não configurada", {
      orderId,
      hasPixelId: Boolean(getTikTokPixelId()),
      hasAccessToken: Boolean(getTikTokAccessToken()),
    });
    return false;
  }

  let payload: unknown;
  try {
    payload = buildTikTokPurchasePayload({
      pixelId: getTikTokPixelId(),
      // Mesmo event_id usado pelo Pixel no browser. É o que garante que uma
      // compra vista pelos dois canais conte como uma só conversão.
      eventId: orderId,
      orderId,
      eventTimeSeconds: eventTimeSeconds ?? Math.floor(Date.now() / 1000),
      email,
      externalId: userId,
      signals: readTikTokSignalsFromOrderMetadata(orderMetadata),
      amountCents,
      currency,
      contentId: productSlug,
      contentName: productName,
      fallbackPageUrl: `${getSiteUrl()}/checkout`,
      testEventCode: getTikTokTestEventCode(),
    });
  } catch (error) {
    console.error("[tiktok:events] payload inválido", {
      orderId,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }

  return postTikTokEvent(payload, { orderId, event: "Purchase" });
}

async function postTikTokEvent(
  payload: unknown,
  context: Record<string, unknown>,
): Promise<boolean> {
  try {
    const response = await fetch(TIKTOK_EVENTS_API_URL, {
      method: "POST",
      headers: {
        "Access-Token": getTikTokAccessToken(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });

    const body = await response.json().catch(() => null);
    const problem = getTikTokEventsResultProblem({
      httpStatus: response.status,
      body,
    });

    if (problem) {
      console.error("[tiktok:events] evento recusado", {
        ...context,
        problem,
        code: body?.code ?? null,
        tiktokMessage: body?.message ?? null,
        requestId: body?.request_id ?? null,
      });
      return false;
    }

    console.info("[tiktok:events] evento aceito", {
      ...context,
      requestId: body?.request_id ?? null,
    });
    return true;
  } catch (error) {
    console.error("[tiktok:events] envio falhou", {
      ...context,
      error: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
