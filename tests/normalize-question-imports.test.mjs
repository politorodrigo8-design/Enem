import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeQuestionTaxonomy,
  hasMojibake,
  normalizeRows,
  repairMojibake,
} from "../scripts/normalize-question-imports.mjs";

test("detecta e corrige mojibake UTF-8 lido como Windows-1252", () => {
  const sample =
    "A fabricaÃ§Ã£o usa â€œmÃ³duloâ€, 1 dmÂ³, 2 cm Ã— 3,51 cm e 10âˆ’2 mL.";

  assert.equal(hasMojibake(sample), true);

  const repaired = repairMojibake(sample);
  assert.equal(repaired.confidence, "high");
  assert.equal(
    repaired.value,
    "A fabricação usa “módulo”, 1 dm³, 2 cm × 3,51 cm e 10−2 mL.",
  );
});

test("preserva texto correto e normaliza Unicode para NFC", () => {
  const sample = "Matema\u0301tica financeira com razão correta.";
  const repaired = repairMojibake(sample);

  assert.equal(repaired.value, "Matemática financeira com razão correta.");
  assert.equal(repaired.confidence, "unicode-normalized");
});

test("normaliza taxonomia sem acento para nomes canonicos", () => {
  const row = canonicalizeQuestionTaxonomy({
    area: "Matematica",
    subject: "Matematica",
    topic: "Razao, proporcao e porcentagem",
    discipline: "Matematica",
  });

  assert.equal(row.area, "Matemática");
  assert.equal(row.subject, "Matemática");
  assert.equal(row.topic, "Razão, proporção e porcentagem");
  assert.equal(row.discipline, "Matemática");
});

test("gera relatorio de alteracoes por registro", () => {
  const result = normalizeRows([
    {
      statement: "QuestÃ£o com enunciado quebrado.",
      area: "Matematica",
      subject: "Matematica",
      topic: "Estatistica",
      option_a: "Alternativa A",
    },
  ]);

  assert.equal(result.rows[0].statement, "Questão com enunciado quebrado.");
  assert.equal(result.rows[0].topic, "Estatística");
  assert.equal(result.records[0].changes.some((change) => change.kind === "encoding"), true);
  assert.equal(result.records[0].changes.some((change) => change.kind === "taxonomy"), true);
});
