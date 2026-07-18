import test from "node:test";
import assert from "node:assert/strict";
import {
  canEditEditorial,
  isValidMediaUrl,
  validateEditorialQuestionForSave,
} from "../src/lib/editorial/rules.mjs";

const approvedQuestion = {
  id: "question-1",
  statement: "Enunciado completo para aprovacao editorial.",
  explanation: "Resolucao completa com justificativa suficiente.",
  difficulty: "Média",
  review_status: "approved",
  reviewed: true,
  source_verified: true,
  answer_verified: true,
  media_verified: false,
  media_required: false,
  topic: "Razao e proporcao",
  subject: "Matematica",
  area: "Matematica",
  discipline: "Matematica",
  subtopic: "",
  correct_option: "C",
  editorial_notes: "",
  classification_version: "beta-2026-07",
  options: ["A", "B", "C", "D", "E"].map((optionKey) => ({
    option_key: optionKey,
    option_text: `Alternativa ${optionKey}`,
  })),
};

test("autoriza edicao editorial apenas para admin", () => {
  assert.equal(canEditEditorial("admin"), true);
  assert.equal(canEditEditorial("paid"), false);
  assert.equal(canEditEditorial("beta"), false);
  assert.equal(canEditEditorial("unpaid"), false);
});

test("bloqueia aprovacao sem midia obrigatoria verificada", () => {
  const result = validateEditorialQuestionForSave(
    { ...approvedQuestion, media_required: true, media_verified: true },
    [],
  );
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /midia obrigatoria/);
});

test("aprova quando midia obrigatoria tem URL valida e verified=true", () => {
  const result = validateEditorialQuestionForSave(
    { ...approvedQuestion, media_required: true, media_verified: true },
    [{ url: "/enem-media/batch-001/q01.png", verified: true }],
  );
  assert.equal(result.ok, true);
});

test("rejeita URL de midia invalida", () => {
  assert.equal(isValidMediaUrl("javascript:alert(1)"), false);
  assert.equal(isValidMediaUrl("https://example.com/img.png"), true);
  assert.equal(isValidMediaUrl("/enem-media/q.png"), true);
});
