import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQuestionAnswerRecord,
  latestQuestionAnswer,
  nextReviewToggle,
} from "../src/lib/questions/rules.mjs";

test("monta payload real de persistencia de resposta e resultado correto", () => {
  const answer = buildQuestionAnswerRecord({
    userId: "user-1",
    question: {
      id: "question-1",
      correct_option: "B",
      explanation: "Porque B corresponde ao comando.",
    },
    selectedOption: "B",
    responseTimeSeconds: 12,
  });

  assert.deepEqual(answer.row, {
    user_id: "user-1",
    question_id: "question-1",
    selected_option: "B",
    is_correct: true,
    response_time_seconds: 12,
  });
  assert.equal(answer.result.isCorrect, true);
});

test("toggle de favorito insere quando nao existe e remove quando existe", () => {
  assert.deepEqual(nextReviewToggle(null, "user-1", "question-1"), {
    operation: "insert",
    reviewed: true,
    row: {
      user_id: "user-1",
      question_id: "question-1",
      mastered: false,
    },
    message: "Questao adicionada a revisao.",
  });

  assert.deepEqual(nextReviewToggle({ id: "review-1" }, "user-1", "question-1"), {
    operation: "delete",
    reviewed: false,
    id: "review-1",
    userId: "user-1",
    message: "Questao removida da revisao.",
  });
});

test("recupera a resposta persistida mais recente", () => {
  const latest = latestQuestionAnswer([
    { id: "old", answered_at: "2026-07-13T10:00:00Z" },
    { id: "new", answered_at: "2026-07-14T10:00:00Z" },
  ]);
  assert.equal(latest.id, "new");
});
