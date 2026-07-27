import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSimulationTopicWeaknessScore,
  selectBalancedSimulationQuestionIds,
} from "../src/lib/simulations/generation-rules.mjs";

function questions(topicId, amount) {
  return Array.from({ length: amount }, (_, index) => ({
    id: `${topicId}-${index + 1}`,
    topic_id: topicId,
  }));
}

function countByTopic(ids) {
  return ids.reduce((counts, id) => {
    const topicId = id.split("-")[0];
    counts[topicId] = (counts[topicId] ?? 0) + 1;
    return counts;
  }, {});
}

test("priorizar pontos fracos escolhe mais questoes dos topicos com erros reais", () => {
  const candidates = [
    ...questions("fraco", 10),
    ...questions("medio", 10),
    ...questions("forte", 10),
  ];
  const random = () => 0.5;

  const balanced = selectBalancedSimulationQuestionIds({
    candidates,
    count: 12,
    prioritizeWeaknesses: false,
    random,
  });
  const prioritized = selectBalancedSimulationQuestionIds({
    candidates,
    count: 12,
    prioritizeWeaknesses: true,
    weaknessByTopic: new Map([
      [
        "fraco",
        buildSimulationTopicWeaknessScore({
          total_answers: 10,
          correct_answers: 2,
          accuracy_percentage: 20,
          priority_score: 18,
        }),
      ],
      ["medio", buildSimulationTopicWeaknessScore({ priority_score: 10 })],
      ["forte", buildSimulationTopicWeaknessScore({ priority_score: 1 })],
    ]),
    random,
  });

  const balancedCounts = countByTopic(balanced);
  const prioritizedCounts = countByTopic(prioritized);

  assert.equal(balancedCounts.fraco, 4);
  assert.ok(prioritizedCounts.fraco > balancedCounts.fraco);
  assert.ok(prioritizedCounts.fraco <= Math.ceil(12 * 0.45));
});

test("pontuacao de fraqueza pesa erros acima de prioridade sem historico", () => {
  const withErrors = buildSimulationTopicWeaknessScore({
    total_answers: 4,
    correct_answers: 1,
    accuracy_percentage: 25,
    priority_score: 8,
  });
  const onlyDiagnosis = buildSimulationTopicWeaknessScore({
    total_answers: 0,
    correct_answers: 0,
    accuracy_percentage: 0,
    priority_score: 20,
  });

  assert.ok(withErrors > onlyDiagnosis);
});
