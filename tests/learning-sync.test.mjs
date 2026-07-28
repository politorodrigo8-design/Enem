import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/036_learning_sync_constraints.sql", import.meta.url),
  "utf8",
);
const learningActionSource = readFileSync(
  new URL("../src/lib/actions/learning.ts", import.meta.url),
  "utf8",
);

test("migration cria chaves de idempotencia para pratica e simulado", () => {
  assert.match(
    migration,
    /unique \(practice_session_id, question_id\)/,
  );
  assert.match(migration, /user_simulations_one_active_per_simulation/);
  assert.match(migration, /where status = 'Em andamento'/);
  assert.match(migration, /set status = 'Abandonado'/);
});

test("mutations de aprendizagem fazem upsert e mesclam progresso concorrente", () => {
  assert.match(
    learningActionSource,
    /upsert\(answerRow, \{ onConflict: "practice_session_id,question_id" \}\)/,
  );
  assert.match(
    learningActionSource,
    /upsert\(row, \{ onConflict: "user_simulation_id,question_id" \}\)/,
  );
  assert.match(learningActionSource, /mergedQuestionIds/);
  assert.match(learningActionSource, /concurrentAttempt/);
});

