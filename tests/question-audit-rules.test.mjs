import test from "node:test";
import assert from "node:assert/strict";
import { auditQuestionRecord, buildQuestionAuditReport } from "../src/lib/questions/audit-rules.mjs";

const baseQuestion = {
  id: "q1",
  statement: "Enunciado completo com contexto suficiente para que a questao seja respondida sem depender de adivinhacao.",
  correct_option: "A",
  media_required: false,
  source: "ENEM",
  year: 2024,
  subjects: { area: "Matematica", name: "Matematica" },
  topics: { name: "Funcoes" },
  question_options: ["A", "B", "C", "D", "E"].map((key) => ({
    option_key: key,
    option_text: `Alternativa ${key}`,
  })),
  question_media: [],
};

test("auditoria detecta ausencia de resposta correta", () => {
  const issues = auditQuestionRecord({ ...baseQuestion, correct_option: "" });
  assert.ok(issues.some((issue) => issue.problem === "ausencia_de_alternativa_correta"));
});

test("auditoria detecta alternativas duplicadas e enunciado vazio", () => {
  const issues = auditQuestionRecord({
    ...baseQuestion,
    statement: "",
    question_options: [
      { option_key: "A", option_text: "Mesmo texto" },
      { option_key: "B", option_text: "Mesmo texto" },
    ],
  });

  assert.ok(issues.some((issue) => issue.problem === "enunciado_vazio"));
  assert.ok(issues.some((issue) => issue.problem === "alternativas_duplicadas"));
});

test("auditoria detecta imagem necessaria ausente e duplicidade exata", () => {
  const issues = buildQuestionAuditReport([
    { ...baseQuestion, id: "q1", media_required: true },
    { ...baseQuestion, id: "q2" },
  ]);

  assert.ok(issues.some((issue) => issue.problem === "imagem_necessaria_ausente"));
  assert.equal(issues.filter((issue) => issue.problem === "duplicidade_exata").length, 2);
});
