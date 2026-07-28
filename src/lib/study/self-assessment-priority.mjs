export const SELF_ASSESSMENT_LEGEND = "1 = mais dificuldade · 5 = mais facilidade";

export const SELF_ASSESSMENT_LABELS = {
  1: "Muita dificuldade",
  2: "Dificuldade",
  3: "Intermediário",
  4: "Facilidade",
  5: "Muita facilidade",
};

export function normalizeSelfAssessmentRating(value, fallback = 3) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

export function perceivedDifficultyPriorityBoost(value) {
  const rating = normalizeSelfAssessmentRating(value);
  return Number(((6 - rating) * 1.2).toFixed(2));
}

export function compareSelfAssessmentEntries(first, second) {
  const ratingDelta =
    normalizeSelfAssessmentRating(first?.value) -
    normalizeSelfAssessmentRating(second?.value);
  if (ratingDelta) return ratingDelta;

  return String(first?.label ?? "").localeCompare(String(second?.label ?? ""), "pt-BR");
}

export function sortSelfAssessmentEntries(entries) {
  return [...entries].sort(compareSelfAssessmentEntries);
}
