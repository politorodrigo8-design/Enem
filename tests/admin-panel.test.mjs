import assert from "node:assert/strict";
import test from "node:test";
import {
  averageTicketCents,
  bucketByDay,
  canAccessAdminPanel,
  conversionRate,
  formatCentsBRL,
  isOpenEssay,
  isOpenFeedback,
  isRefundedOrder,
  isRevenueOrder,
  netRevenueCents,
  percentChange,
  splitPeriods,
} from "../src/lib/admin/rules.mjs";

test("apenas o nível admin acessa o painel", () => {
  assert.equal(canAccessAdminPanel("admin"), true);
  assert.equal(canAccessAdminPanel("paid"), false);
  assert.equal(canAccessAdminPanel("beta"), false);
  assert.equal(canAccessAdminPanel("unpaid"), false);
  assert.equal(canAccessAdminPanel(undefined), false);
  assert.equal(canAccessAdminPanel(null), false);
});

test("receita reconhece approved e nunca o inexistente 'paid'", () => {
  assert.equal(isRevenueOrder("approved"), true);
  // O banco não tem status 'paid' — confundir os dois zeraria o faturamento.
  assert.equal(isRevenueOrder("paid"), false);
  assert.equal(isRevenueOrder("pending"), false);
  assert.equal(isRefundedOrder("refunded"), true);
  assert.equal(isRefundedOrder("charged_back"), true);
  assert.equal(isRefundedOrder("cancelled"), false);
});

test("receita líquida desconta estorno e chargeback", () => {
  const orders = [
    { amount_cents: 10000, status: "approved" },
    { amount_cents: 5000, status: "approved" },
    { amount_cents: 3000, status: "refunded" },
    { amount_cents: 2000, status: "charged_back" },
    { amount_cents: 9900, status: "pending" },
    { amount_cents: 7000, status: "rejected" },
  ];
  assert.equal(netRevenueCents(orders), 10000 + 5000 - 3000 - 2000);
});

test("receita líquida de lista vazia é zero", () => {
  assert.equal(netRevenueCents([]), 0);
});

test("ticket médio considera só pedidos aprovados", () => {
  const orders = [
    { amount_cents: 10000, status: "approved" },
    { amount_cents: 20000, status: "approved" },
    { amount_cents: 90000, status: "pending" },
  ];
  assert.equal(averageTicketCents(orders), 15000);
  assert.equal(averageTicketCents([{ amount_cents: 100, status: "pending" }]), 0);
});

test("conversão não divide por zero", () => {
  assert.equal(conversionRate(0, 0), 0);
  assert.equal(conversionRate(3, 10), 30);
  assert.equal(conversionRate(1, 3), 33.3);
});

test("variação percentual devolve null sem base de comparação", () => {
  assert.equal(percentChange(100, 0), null);
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(50, 100), -50);
});

test("bucketByDay preenche dias sem movimento com zero", () => {
  const now = "2026-07-10T12:00:00.000Z";
  const rows = [
    { created_at: "2026-07-10T08:00:00.000Z" },
    { created_at: "2026-07-10T09:00:00.000Z" },
    { created_at: "2026-07-08T09:00:00.000Z" },
  ];
  const buckets = bucketByDay(rows, { days: 3, now });

  assert.equal(buckets.length, 3);
  assert.deepEqual(
    buckets.map((bucket) => bucket.date),
    ["2026-07-08", "2026-07-09", "2026-07-10"],
  );
  assert.deepEqual(
    buckets.map((bucket) => bucket.value),
    [1, 0, 2],
  );
});

test("bucketByDay soma o valor informado e ignora datas fora da janela", () => {
  const now = "2026-07-10T12:00:00.000Z";
  const rows = [
    { paid_at: "2026-07-10T08:00:00.000Z", amount_cents: 5000 },
    { paid_at: "2026-07-10T10:00:00.000Z", amount_cents: 2500 },
    { paid_at: "2026-01-01T10:00:00.000Z", amount_cents: 999999 },
    { paid_at: null, amount_cents: 123 },
  ];
  const buckets = bucketByDay(rows, {
    days: 2,
    now,
    dateKey: "paid_at",
    amountOf: (row) => row.amount_cents / 100,
  });

  assert.equal(buckets.at(-1).value, 75);
  assert.equal(
    buckets.reduce((total, bucket) => total + bucket.value, 0),
    75,
  );
});

test("splitPeriods separa janelas de mesma duração", () => {
  const now = "2026-07-30T00:00:00.000Z";
  const rows = [
    { created_at: "2026-07-29T00:00:00.000Z" }, // atual
    { created_at: "2026-07-20T00:00:00.000Z" }, // atual
    { created_at: "2026-07-10T00:00:00.000Z" }, // anterior
    { created_at: "2026-05-01T00:00:00.000Z" }, // fora das duas janelas
  ];
  const { current, previous } = splitPeriods(rows, { days: 15, now });

  assert.equal(current.length, 2);
  assert.equal(previous.length, 1);
});

test("status abertos de redação e feedback", () => {
  assert.equal(isOpenEssay("pending"), true);
  assert.equal(isOpenEssay("in_review"), true);
  assert.equal(isOpenEssay("uploading"), true);
  assert.equal(isOpenEssay("completed"), false);
  assert.equal(isOpenEssay("cancelled"), false);

  assert.equal(isOpenFeedback("novo"), true);
  assert.equal(isOpenFeedback("em_analise"), true);
  assert.equal(isOpenFeedback("resolvido"), false);
  assert.equal(isOpenFeedback("ignorado"), false);
});

test("formatação de centavos em real", () => {
  assert.match(formatCentsBRL(9990), /99,90/);
  assert.match(formatCentsBRL(0), /0,00/);
  assert.match(formatCentsBRL(-1500), /15,00/);
});
