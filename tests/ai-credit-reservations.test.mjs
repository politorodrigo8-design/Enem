import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/019_ai_credit_reservations.sql", import.meta.url),
  "utf8",
);

test("migration 019 adiciona reserva, confirmacao e estorno de credito de IA", () => {
  assert.match(migration, /create or replace function public\.reserve_ai_credits/);
  assert.match(migration, /create or replace function public\.confirm_ai_credit_reservation/);
  assert.match(migration, /create or replace function public\.refund_ai_credit_reservation/);
  assert.match(migration, /'ai_credit_refund'/);
});

test("reserva de IA debita de forma atomica com lock por usuario", () => {
  assert.match(migration, /where user_id = current_user_id\s+for update/);
  assert.match(migration, /if account\.balance < expected_cost then/);
  assert.match(migration, /set balance = balance - expected_cost/);
  assert.match(migration, /'ai_status', 'reserved'/);
});

test("estorno de IA e idempotente e nao estorna reserva confirmada", () => {
  assert.match(migration, /credit_ledger_one_ai_refund_unique/);
  assert.match(migration, /related_ledger_id = reservation\.id/);
  assert.match(migration, /if reservation\.metadata ->> 'ai_status' = 'confirmed' then/);
  assert.match(migration, /set balance = balance \+ refund_amount/);
});

test("RPCs de reserva de IA ficam disponiveis apenas para autenticados", () => {
  assert.match(migration, /grant execute on function public\.reserve_ai_credits\(text, text, uuid, jsonb\)\s+to authenticated/);
  assert.match(migration, /grant execute on function public\.confirm_ai_credit_reservation\(uuid, jsonb\)\s+to authenticated/);
  assert.match(migration, /grant execute on function public\.refund_ai_credit_reservation\(uuid, text\)\s+to authenticated/);
});
