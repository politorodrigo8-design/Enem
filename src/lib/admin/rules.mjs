/**
 * Regras puras do painel administrativo. Sem I/O e sem dependência de React
 * para poderem ser testadas direto com `node --test`.
 */

/** Único nível com acesso ao painel. `beta` e `paid` são alunos. */
export function canAccessAdminPanel(accessLevel) {
  return accessLevel === "admin";
}

/** Pedidos que representam dinheiro efetivamente recebido. */
export const revenueOrderStatuses = ["approved"];

/** Pedidos que saíram do caixa depois de terem entrado. */
export const refundedOrderStatuses = ["refunded", "charged_back"];

export function isRevenueOrder(status) {
  return revenueOrderStatuses.includes(status);
}

export function isRefundedOrder(status) {
  return refundedOrderStatuses.includes(status);
}

/**
 * Receita líquida em centavos: aprovados menos estornos/chargebacks.
 * Estorno é subtraído porque o pedido continua com o valor original na linha.
 */
export function netRevenueCents(orders) {
  return orders.reduce((total, order) => {
    const amount = Number(order?.amount_cents) || 0;
    if (isRevenueOrder(order?.status)) return total + amount;
    if (isRefundedOrder(order?.status)) return total - amount;
    return total;
  }, 0);
}

/** Conversão de cadastro para compra, em % com uma casa. */
export function conversionRate(payingCustomers, totalSignups) {
  if (!totalSignups) return 0;
  return Math.round((payingCustomers / totalSignups) * 1000) / 10;
}

/** Ticket médio em centavos sobre os pedidos que geraram receita. */
export function averageTicketCents(orders) {
  const paid = orders.filter((order) => isRevenueOrder(order?.status));
  if (!paid.length) return 0;
  const total = paid.reduce((sum, order) => sum + (Number(order.amount_cents) || 0), 0);
  return Math.round(total / paid.length);
}

/**
 * Agrupa valores por dia (YYYY-MM-DD) preenchendo os dias sem movimento com
 * zero — um gráfico com buracos mente sobre a frequência real.
 */
// `amountOf` e não `valueOf`: `valueOf` existe em Object.prototype, então o
// valor padrão do destructuring nunca era aplicado e o método nativo era
// chamado no lugar da função de soma.
/**
 * @param {Record<string, any>[]} rows
 * @param {{ days: number, dateKey?: string, amountOf?: (row: any) => number, now?: string | number | Date }} options
 * @returns {{ date: string, value: number }[]}
 */
export function bucketByDay(rows, { days, dateKey = "created_at", amountOf = () => 1, now }) {
  const reference = now ? new Date(now) : new Date();
  const buckets = new Map();

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(reference);
    day.setUTCDate(day.getUTCDate() - index);
    buckets.set(day.toISOString().slice(0, 10), 0);
  }

  for (const row of rows) {
    const raw = row?.[dateKey];
    if (!raw) continue;
    const key = new Date(raw).toISOString().slice(0, 10);
    if (!buckets.has(key)) continue;
    buckets.set(key, buckets.get(key) + (Number(amountOf(row)) || 0));
  }

  return Array.from(buckets, ([date, value]) => ({ date, value }));
}

/** Variação percentual entre dois períodos; null quando não há base de comparação. */
export function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Divide as linhas entre período atual e anterior de mesma duração.
 * @template {Record<string, any>} T
 * @param {T[]} rows
 * @param {{ days: number, dateKey?: string, now?: string | number | Date }} options
 * @returns {{ current: T[], previous: T[] }}
 */
export function splitPeriods(rows, { days, dateKey = "created_at", now }) {
  const reference = now ? new Date(now).getTime() : Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  const currentStart = reference - windowMs;
  const previousStart = currentStart - windowMs;

  const current = [];
  const previous = [];

  for (const row of rows) {
    const raw = row?.[dateKey];
    if (!raw) continue;
    const time = new Date(raw).getTime();
    if (time >= currentStart) current.push(row);
    else if (time >= previousStart) previous.push(row);
  }

  return { current, previous };
}

/** Formata centavos como moeda brasileira. */
export function formatCentsBRL(cents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number(cents) || 0) / 100);
}

/** Status de redação que ainda consomem tempo da operação. */
export const openEssayStatuses = ["uploading", "pending", "in_review"];

export function isOpenEssay(status) {
  return openEssayStatuses.includes(status);
}

/** Status de feedback que ainda exigem resposta da equipe. */
export const openFeedbackStatuses = ["novo", "em_analise"];

export function isOpenFeedback(status) {
  return openFeedbackStatuses.includes(status);
}
