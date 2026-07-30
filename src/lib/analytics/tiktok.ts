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

// O base code entra com strategy afterInteractive, então window.ttq pode não
// existir ainda quando um efeito de montagem dispara — é o caso do ViewContent,
// que sai no carregamento da página. Em vez de perder o evento em silêncio,
// enfileiramos e esperamos o Pixel aparecer.
const readyTimeoutMs = 8000;
const pollIntervalMs = 150;

const pending: Array<(queue: TikTokQueue) => void> = [];
let pollTimer: number | null = null;
let waitedMs = 0;

function getTikTokQueue(): TikTokQueue | null {
  if (typeof window === "undefined") return null;
  const queue = (window as { ttq?: Partial<TikTokQueue> }).ttq;
  if (!queue || typeof queue.track !== "function") return null;
  return queue as TikTokQueue;
}

// FIFO de propósito: garante que um identify enfileirado antes de um track
// continue saindo antes dele, que é o que o Advanced Matching exige.
function enqueue(run: (queue: TikTokQueue) => void) {
  if (typeof window === "undefined") return;
  pending.push(run);
  flush();
}

function flush() {
  const queue = getTikTokQueue();

  if (queue) {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
    while (pending.length) {
      pending.shift()?.(queue);
    }
    return;
  }

  if (pollTimer !== null) return;

  waitedMs = 0;
  pollTimer = window.setInterval(() => {
    waitedMs += pollIntervalMs;
    if (getTikTokQueue()) {
      flush();
      return;
    }
    if (waitedMs >= readyTimeoutMs) {
      // Pixel bloqueado por extensão, consentimento ou rede. Descarta a fila em
      // vez de crescer sem limite — o Purchase real ainda vai pelo Events API.
      window.clearInterval(pollTimer as number);
      pollTimer = null;
      pending.length = 0;
    }
  }, pollIntervalMs);
}

export function trackTikTokPageView() {
  enqueue((queue) => queue.page());
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
  const identity: Record<string, string> = {};
  if (email) identity.email = email;
  if (externalId) identity.external_id = externalId;
  if (!Object.keys(identity).length) return;

  enqueue((queue) => queue.identify(identity));
}

export function trackTikTokEvent(
  event: string,
  properties?: Record<string, unknown>,
  eventId?: string | null,
) {
  enqueue((queue) => {
    // O event_id só vai quando o mesmo evento também sai pelo Events API.
    // Mandar um id em evento exclusivo do browser desliga a dedup por cookie
    // sem nenhum ganho.
    if (eventId) {
      queue.track(event, properties ?? {}, { event_id: eventId });
      return;
    }
    queue.track(event, properties ?? {});
  });
}
