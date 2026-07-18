export const questionOptionKeys = ["A", "B", "C", "D", "E"];

export function buildQuestionAnswerRecord({
  userId,
  question,
  selectedOption,
  responseTimeSeconds = 0,
}) {
  if (!userId) throw new Error("Usuario obrigatorio para salvar resposta.");
  if (!question?.id || !question.correct_option) throw new Error("Questao invalida.");
  if (!questionOptionKeys.includes(selectedOption)) throw new Error("Alternativa invalida.");

  const isCorrect = question.correct_option === selectedOption;
  return {
    row: {
      user_id: userId,
      question_id: question.id,
      selected_option: selectedOption,
      is_correct: isCorrect,
      response_time_seconds: Number(responseTimeSeconds) || 0,
    },
    result: {
      isCorrect,
      explanation: question.explanation,
    },
  };
}

export function nextReviewToggle(existingReview, userId, questionId) {
  if (!userId) throw new Error("Usuario obrigatorio para favoritar questao.");
  if (!questionId) throw new Error("Questao obrigatoria para favoritar.");

  if (existingReview?.id) {
    return {
      operation: "delete",
      reviewed: false,
      id: existingReview.id,
      userId,
      message: "Questao removida da revisao.",
    };
  }

  return {
    operation: "insert",
    reviewed: true,
    row: {
      user_id: userId,
      question_id: questionId,
      mastered: false,
    },
    message: "Questao adicionada a revisao.",
  };
}

export function latestQuestionAnswer(answers = []) {
  return [...answers].sort(
    (a, b) => new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime(),
  )[0];
}
