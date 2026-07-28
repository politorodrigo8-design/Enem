import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/033_feedback_inbox.sql", import.meta.url),
  "utf8",
);
const feedbackButton = readFileSync(
  new URL("../src/components/dashboard/feedback-button.tsx", import.meta.url),
  "utf8",
);
const adminPage = readFileSync(
  new URL("../src/app/dashboard/feedbacks/page.tsx", import.meta.url),
  "utf8",
);

test("feedbacks tem RLS de envio comum e caixa administrativa", () => {
  assert.match(migration, /create table if not exists public\.feedbacks/);
  assert.match(migration, /feedbacks_insert_own/);
  assert.match(migration, /feedbacks_admin_select/);
  assert.match(migration, /feedbacks_admin_update/);
  assert.match(migration, /public\.is_admin\(auth\.uid\(\)\)/);
  assert.doesNotMatch(migration, /for select to authenticated\s+using \(user_id = auth\.uid\(\)\)/);
  assert.doesNotMatch(migration, /for update to authenticated\s+using \(user_id = auth\.uid\(\)\)/);
  assert.match(migration, /internal_note is null/);
  assert.match(migration, /assigned_admin_id is null/);
  assert.match(migration, /create policy "feedbacks_admin_select"[\s\S]+using \(public\.is_admin\(auth\.uid\(\)\)\);/);
  assert.match(migration, /create policy "feedbacks_admin_update"[\s\S]+with check \(public\.is_admin\(auth\.uid\(\)\)\);/);
});

test("formulario de feedback valida mensagem e separa nota de experiencia", () => {
  assert.match(feedbackButton, /Mensagem <span className="text-rose-600">\*<\/span>/);
  assert.match(feedbackButton, /maxMessageLength = 1200/);
  assert.match(feedbackButton, /Nota da experiência/);
  assert.match(feedbackButton, /não a escala de dificuldade do diagnóstico/);
  assert.doesNotMatch(feedbackButton, /easy_to_understand/);
});

test("admin lista, filtra, pesquisa e altera status dos feedbacks", () => {
  assert.match(adminPage, /getAdminFeedbackInbox/);
  assert.match(adminPage, /name="search"/);
  assert.match(adminPage, /name="status"/);
  assert.match(adminPage, /name="type"/);
  assert.match(adminPage, /name="rating"/);
  assert.match(adminPage, /updateFeedbackStatusAction/);
  assert.match(adminPage, /Observação interna/);
});
