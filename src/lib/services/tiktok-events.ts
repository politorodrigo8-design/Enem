import {
  TIKTOK_EVENTS_API_URL,
  buildTikTokPurchasePayload,
  getTikTokEventsResultProblem,
  readTikTokSignalsFromOrderMetadata,
} from "@/lib/services/tiktok-events-payload.mjs";
import { getSiteUrl } from "@/lib/supabase/config";

// O webhook do Mercado Pago tem que ser respondido rápido, senão o provedor
// reenvia. O envio ao TikTok nunca pode segurar nem derrubar a liberação de
// acesso: falha aqui é log, não exceção.
const requestTimeoutMs = 5000;

export function getTikTokPixelId() {
  return (process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "").trim();
}

function getTikTokAccessToken() {
  return (process.env.TIKTOK_EVENTS_ACCESS_TOKEN || "").trim();
}

function getTikTokTestEventCode() {
  return (process.env.TIKTOK_EVENTS_TEST_EVENT_CODE || "").trim();
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
}) {
  if (!isTikTokEventsConfigured()) return;

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
    return;
  }

  await postTikTokEvent(payload, { orderId, event: "Purchase" });
}

async function postTikTokEvent(payload: unknown, context: Record<string, unknown>) {
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
      return;
    }

    console.info("[tiktok:events] evento aceito", {
      ...context,
      requestId: body?.request_id ?? null,
    });
  } catch (error) {
    console.error("[tiktok:events] envio falhou", {
      ...context,
      error: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
