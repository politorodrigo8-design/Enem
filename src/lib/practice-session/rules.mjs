export const practiceSessionStatuses = ["Em andamento", "Finalizado", "Abandonado"];

/**
 * @param {Array<string | null | undefined>} questionIds
 * @returns {string[]}
 */
export function normalizePracticeQuestionIds(questionIds = []) {
  return Array.from(
    new Set(
      questionIds
        .map((questionId) => String(questionId || "").trim())
        .filter(Boolean),
    ),
  );
}

/**
 * @param {{ questionIds?: string[], answerState?: Record<string, unknown> }} input
 * @returns {string[]}
 */
export function answerIdsForSession({ questionIds = [], answerState = {} }) {
  const normalizedIds = normalizePracticeQuestionIds(questionIds);
  return normalizedIds.filter((questionId) => Boolean(answerState[questionId]));
}

/**
 * @param {{ questionIds?: string[], answerState?: Record<string, { isCorrect?: boolean }> }} input
 */
export function getPracticeSessionStats({ questionIds = [], answerState = {} }) {
  const answeredQuestionIds = answerIdsForSession({ questionIds, answerState });
  const correct = answeredQuestionIds.filter(
    (questionId) => Boolean(answerState[questionId]?.isCorrect),
  ).length;

  return {
    answeredQuestionIds,
    answered: answeredQuestionIds.length,
    correct,
    wrong: answeredQuestionIds.length - correct,
  };
}

/**
 * @param {Array<{ question_id?: string, answered_at?: string }>} answers
 * @returns {Map<string, { question_id?: string, answered_at?: string }>}
 */
export function latestAnswerByQuestion(answers = []) {
  const latest = new Map();
  for (const answer of answers) {
    if (!answer?.question_id) continue;
    const current = latest.get(answer.question_id);
    if (
      !current ||
      new Date(answer.answered_at ?? 0).getTime() >
        new Date(current.answered_at ?? 0).getTime()
    ) {
      latest.set(answer.question_id, answer);
    }
  }
  return latest;
}

/**
 * @param {{ isCorrect: boolean, correctOption?: string | null, explanation?: string | null }} input
 * @returns {string}
 */
export function buildShortQuestionFeedback({
  isCorrect,
  correctOption,
  explanation,
}) {
  const lead = correctOption
    ? `A alternativa correta e ${correctOption}.`
    : isCorrect
      ? "Sua resposta esta correta."
      : "Sua resposta esta incorreta.";
  const sentence = firstUsefulSentence(explanation);
  if (!sentence) return lead;

  const normalizedLead = normalizeForCompare(lead);
  const normalizedSentence = normalizeForCompare(sentence);
  if (normalizedSentence.startsWith(normalizedLead)) return sentence;
  return `${lead} ${sentence}`;
}

/**
 * @param {Array<{ id: string, status: string, started_at: string }>} attempts
 */
export function latestActiveAttempt(attempts = []) {
  return attempts
    .filter((attempt) => attempt.status === "Em andamento")
    .sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))[0];
}

/**
 * @param {Array<{ question_id: string, selected_option: string }>} rows
 * @returns {Record<string, string>}
 */
export function answersFromAttemptRows(rows = []) {
  return Object.fromEntries(
    rows
      .filter((row) => row.question_id && row.selected_option)
      .map((row) => [row.question_id, row.selected_option]),
  );
}

/**
 * @param {string[]} questionIds
 * @param {Record<string, string>} answers
 */
export function firstUnansweredIndex(questionIds = [], answers = {}) {
  const index = questionIds.findIndex((questionId) => !answers[questionId]);
  return index >= 0 ? index : Math.max(questionIds.length - 1, 0);
}

/**
 * @param {string} startedAt
 * @param {number} now
 */
export function elapsedSecondsSince(startedAt, now = Date.now()) {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, Math.floor((now - started) / 1000));
}

export function canFinalizeAttempt(status) {
  return status === "Em andamento";
}

function firstUsefulSentence(explanation) {
  const normalized = String(explanation || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const candidate =
    sentences.find((sentence) => !looksLikeAlternativesList(sentence)) ??
    sentences[0] ??
    "";
  return candidate.replace(/\s+$/, "");
}

function looksLikeAlternativesList(sentence) {
  const hits = sentence.match(/\b[A-E]\b/g) ?? [];
  return hits.length >= 3 && /falsa|incorreta|contraria|alternativa/i.test(sentence);
}

function normalizeForCompare(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
