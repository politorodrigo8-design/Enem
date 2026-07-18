import test from "node:test";
import assert from "node:assert/strict";
import {
  fingerprintQuestion,
  isValidMediaUrl,
  validateRows,
} from "../scripts/import-questions.mjs";

const approvedRow = {
  statement: "Enunciado aprovado com dados suficientes para o importador.",
  area: "Matematica",
  subject: "Matematica",
  topic: "Razao e proporcao",
  difficulty: "Media",
  year: 2025,
  source: "ENEM 2025",
  source_url: "https://example.com/prova.pdf",
  exam_name: "ENEM",
  question_number: 1,
  is_official: true,
  is_demo: false,
  is_authorial: false,
  is_inspired: false,
  explanation: "Resolucao revisada com justificativa suficiente.",
  option_a: "Alternativa A",
  option_b: "Alternativa B",
  option_c: "Alternativa C",
  option_d: "Alternativa D",
  option_e: "Alternativa E",
  correct_option: "A",
  reviewed: true,
  review_status: "approved",
  source_verified: true,
  answer_verified: true,
  media_verified: false,
  media_required: false,
  classification_version: "beta-2026-07",
};

test("importador aceita apenas questoes approved e revisadas", () => {
  const report = validateRows([
    approvedRow,
    {
      ...approvedRow,
      statement: "Outra questao pendente valida em tamanho.",
      review_status: "pending",
    },
  ]);

  assert.equal(report.valid.length, 1);
  assert.equal(report.invalid.length, 1);
  assert.match(report.invalid[0].errors.join(" "), /aprovados/);
});

test("importador bloqueia midia obrigatoria sem URL valida", () => {
  const report = validateRows([
    {
      ...approvedRow,
      media_required: true,
      media_verified: true,
      media_url: "javascript:alert(1)",
    },
  ]);

  assert.equal(report.valid.length, 0);
  assert.match(report.invalid[0].errors.join(" "), /media_url/);
});

test("fingerprint previne duplicidade no mesmo arquivo", () => {
  assert.equal(
    fingerprintQuestion(approvedRow),
    fingerprintQuestion({
      ...approvedRow,
      statement: "  enunciado aprovado com dados suficientes para o importador. ",
    }),
  );

  const report = validateRows([approvedRow, { ...approvedRow }]);
  assert.equal(report.valid.length, 1);
  assert.equal(report.invalid[0].errors[0], "Questao duplicada dentro do arquivo.");
});

test("validacao de URL de midia aceita http(s) e caminho local", () => {
  assert.equal(isValidMediaUrl("https://example.com/q.png"), true);
  assert.equal(isValidMediaUrl("/enem-media/batch-001/q.png"), true);
  assert.equal(isValidMediaUrl("ftp://example.com/q.png"), false);
});
