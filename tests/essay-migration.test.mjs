import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/014_manual_essay_upload_queue.sql", import.meta.url),
  "utf8",
);
const onlineMigration = readFileSync(
  new URL("../supabase/migrations/015_online_essay_manual_queue.sql", import.meta.url),
  "utf8",
);
const bridgeMigration = readFileSync(
  new URL("../supabase/migrations/013_essay_review_workflow.sql", import.meta.url),
  "utf8",
);

test("migration 013 nao referencia coluna corrected_at inexistente depois da 012", () => {
  assert.doesNotMatch(bridgeMigration, /corrected_at/);
  assert.doesNotMatch(bridgeMigration, /corrected_by/);
  assert.doesNotMatch(bridgeMigration, /essay_submissions_corrected_scores_check\s+check/);
});

test("migration 013 remove o modelo detalhado de competencias do fluxo ativo", () => {
  assert.doesNotMatch(bridgeMigration, /add column if not exists competence_/);
  assert.doesNotMatch(bridgeMigration, /add column if not exists total_score/);
  assert.doesNotMatch(bridgeMigration, /create or replace function public\.admin_save_essay_correction/);
  assert.match(bridgeMigration, /drop function if exists public\.admin_save_essay_correction/);
});

test("migration 013 e uma ponte idempotente para a 014", () => {
  assert.match(bridgeMigration, /create or replace function public\.is_admin/);
  assert.match(bridgeMigration, /add column if not exists client_token uuid/);
  assert.match(bridgeMigration, /add column if not exists storage_bucket text/);
  assert.match(bridgeMigration, /add column if not exists refund_ledger_id uuid/);
  assert.match(bridgeMigration, /status in \('pending', 'in_review', 'completed', 'cancelled'\)/);
});

test("migration cria storage privado e metadados por arquivo", () => {
  assert.match(migration, /'essay-submissions'/);
  assert.match(migration, /public,\s*file_size_limit[\s\S]*false,\s*10485760/);
  assert.match(migration, /create table if not exists public\.essay_submission_files/);
  assert.match(migration, /unique \(submission_id, page_order\)/);
  assert.match(migration, /storage_path ~ \('\^essays\/'/);
});

test("migration define RLS para aluno acessar apenas proprios arquivos e admin acessar fila", () => {
  assert.match(migration, /alter table public\.essay_submission_files enable row level security/);
  assert.match(migration, /essay_submission_files_select_related/);
  assert.match(migration, /user_id = auth\.uid\(\)/);
  assert.match(migration, /public\.is_admin\(auth\.uid\(\)\)/);
  assert.match(migration, /split_part\(name, '\/', 2\) = auth\.uid\(\)::text/);
});

test("migration confirma submissao apenas com todos os arquivos e debita uma vez", () => {
  assert.match(migration, /create or replace function public\.confirm_essay_submission/);
  assert.match(migration, /if uploaded_count <> input_expected_file_count then/);
  assert.match(migration, /where user_id = current_user_id\s+for update/);
  assert.match(migration, /account\.balance < cost/);
  assert.match(migration, /amount,\s*balance_after,\s*reason/);
  assert.match(migration, /-cost/);
});

test("migration impede repeticao de chave de idempotencia e dupla atribuicao", () => {
  assert.match(migration, /essay_submissions_user_idempotency_key_unique/);
  assert.match(migration, /status in \('pending', 'in_review', 'completed', 'cancelled'\)/);
  assert.match(migration, /admin_claim_essay_submission/);
  assert.match(migration, /status = 'pending'\s+and assigned_admin_id is null/);
});

test("migration implementa cancelamento com estorno relacionado e sem duplicidade", () => {
  assert.match(migration, /related_ledger_id/);
  assert.match(migration, /submission\.debit_ledger_id/);
  assert.match(migration, /reason = 'essay_refund'/);
  assert.match(migration, /credit_ledger_one_essay_refund_unique/);
  assert.match(migration, /set balance = balance \+ 10/);
});

test("migration prepara limpeza de uploads abandonados", () => {
  assert.match(migration, /admin_mark_abandoned_essay_uploads/);
  assert.match(migration, /status = 'upload_failed'/);
  assert.match(migration, /created_at < now\(\) - coalesce/);
});

test("migration 015 restaura redacao online na fila manual com debito auditavel", () => {
  assert.match(onlineMigration, /create or replace function public\.submit_essay_for_correction/);
  assert.match(onlineMigration, /input_delivery_type <> 'online'/);
  assert.match(onlineMigration, /computed_word_count < 80/);
  assert.match(onlineMigration, /status,\s+file_count,\s+student_note/);
  assert.match(onlineMigration, /'pending',\s+0,\s+clean_note/);
  assert.match(onlineMigration, /set debit_ledger_id = inserted_ledger_id/);
  assert.match(onlineMigration, /'delivery_type', 'online'/);
});
