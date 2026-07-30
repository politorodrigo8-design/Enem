// Ponte para o Pixel do TikTok já carregado na página. Todo acesso passa por
// aqui para o resto do app nunca tocar em window.ttq direto.

type TikTokQueue = {
  page: () => void;
  track: (
    event: string,
    properties?: Record<string, unknown>,
    options?: { event_id?: string },
  ) => void;
  identify: (data: Record<string, string>) => void;
};

function getTikTokQueue(): TikTokQueue | null {
  if (typeof window === "undefined") return null;
  const queue = (window as { ttq?: Partial<TikTokQueue> }).ttq;
  if (!queue || typeof queue.track !== "function") return null;
  return queue as TikTokQueue;
}

export function trackTikTokPageView() {
  getTikTokQueue()?.page();
}

/**
 * Advanced Matching manual. Os valores vão CRUS de propósito: o SDK hasheia em
 * SHA-256 no browser seguindo a mesma normalização que o servidor aplica, então
 * os dois canais chegam ao mesmo hash. Hashear aqui à mão quebraria isso.
 */
export function identifyTikTokUser({
  email,
  externalId,
}: {
  email?: string | null;
  externalId?: string | null;
}) {
  const queue = getTikTokQueue();
  if (!queue) return;

  const identity: Record<string, string> = {};
  if (email) identity.email = email;
  if (externalId) identity.external_id = externalId;
  if (!Object.keys(identity).length) return;

  queue.identify(identity);
}

export function trackTikTokEvent(
  event: string,
  properties?: Record<string, unknown>,
  eventId?: string | null,
) {
  const queue = getTikTokQueue();
  if (!queue) return;

  // O event_id só vai quando o mesmo evento também sai pelo Events API. Mandar
  // um id em evento exclusivo do browser desliga a dedup por cookie sem ganho.
  if (eventId) {
    queue.track(event, properties ?? {}, { event_id: eventId });
    return;
  }

  queue.track(event, properties ?? {});
}
