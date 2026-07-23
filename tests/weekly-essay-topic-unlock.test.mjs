import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/021_weekly_essay_topic_unlock.sql", import.meta.url),
  "utf8",
);
const creditActionsSource = readFileSync(
  new URL("../src/lib/actions/credits.ts", import.meta.url),
  "utf8",
);
const cardSource = readFileSync(
  new URL("../src/app/dashboard/correcao-redacao/weekly-essay-topic-card.tsx", import.meta.url),
  "utf8",
);
const creditsPageSource = readFileSync(
  new URL("../src/app/dashboard/creditos/page.tsx", import.meta.url),
  "utf8",
);

test("migration 021 registra desbloqueio semanal com custo auditavel", () => {
  assert.match(migration, /'weekly_essay_topic'/);
  assert.match(migration, /create or replace function public\.unlock_weekly_essay_topic/);
  assert.match(migration, /cost integer := 1/);
  assert.match(migration, /set balance = balance - cost/);
  assert.match(migration, /'credit_cost', cost/);
  assert.match(migration, /grant execute on function public\.unlock_weekly_essay_topic\(text, text\)\s+to authenticated/);
});

test("desbloqueio semanal e idempotente por usuario e tema", () => {
  assert.match(migration, /credit_ledger_one_weekly_essay_topic_unlock_unique/);
  assert.match(migration, /metadata ->> 'topic_id' = normalized_topic_id/);
  assert.match(migration, /if found then\s+return existing_ledger/);
  assert.match(migration, /where user_id = current_user_id\s+for update/);
});

test("server action de proposta semanal usa RPC e revalida saldo", () => {
  assert.match(creditActionsSource, /unlockWeeklyEssayTopicAction/);
  assert.match(creditActionsSource, /unlock_weekly_essay_topic/);
  assert.match(creditActionsSource, /WEEKLY_ESSAY_TOPIC_UNLOCK_COST/);
  assert.match(creditActionsSource, /revalidatePath\("\/dashboard\/creditos"\)/);
});

test("UI confirma custo antes de mostrar proposta completa", () => {
  assert.match(cardSource, /AiConfirmationDialog/);
  assert.match(cardSource, /Liberar proposta completa/);
  assert.match(cardSource, /unlockWeeklyEssayTopicAction/);
  assert.match(cardSource, /1 crédito/);
  assert.match(cardSource, /Saldo após liberar a proposta/);
});

test("pagina de creditos lista a proposta semanal como uso de credito", () => {
  assert.match(creditsPageSource, /Proposta semanal de redação/);
  assert.match(creditsPageSource, /WEEKLY_ESSAY_TOPIC_UNLOCK_COST/);
  assert.match(creditsPageSource, /Ver proposta/);
});
