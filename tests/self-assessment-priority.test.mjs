import test from "node:test";
import assert from "node:assert/strict";
import {
  compareSelfAssessmentEntries,
  normalizeSelfAssessmentRating,
  perceivedDifficultyPriorityBoost,
  sortSelfAssessmentEntries,
} from "../src/lib/study/self-assessment-priority.mjs";

test("autoavaliacao interpreta 1 como maior dificuldade e 5 como maior facilidade", () => {
  assert.equal(normalizeSelfAssessmentRating(1), 1);
  assert.equal(normalizeSelfAssessmentRating(5), 5);
  assert.ok(perceivedDifficultyPriorityBoost(1) > perceivedDifficultyPriorityBoost(5));
});

test("notas menores geram prioridade maior e notas maiores prioridade menor", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map(perceivedDifficultyPriorityBoost),
    [6, 4.8, 3.6, 2.4, 1.2],
  );
});

test("autoavaliacao ordena 1/5 antes de 5/5 com desempate previsivel", () => {
  const sorted = sortSelfAssessmentEntries([
    { label: "Matematica", value: 5 },
    { label: "Biologia", value: 1 },
    { label: "Artes", value: 1 },
  ]);

  assert.deepEqual(
    sorted.map((item) => item.label),
    ["Artes", "Biologia", "Matematica"],
  );
  assert.equal(compareSelfAssessmentEntries({ label: "A", value: 1 }, { label: "B", value: 5 }) < 0, true);
});
