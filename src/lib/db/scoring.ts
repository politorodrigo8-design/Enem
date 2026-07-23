import type { Topic, TopicPerformance } from "@/lib/db/types";
import { formatAppDateTime } from "@/lib/dates";

const difficultyWeight: Record<string, number> = {
  Baixa: 1.5,
  Média: 3,
  Alta: 4.5,
};

export const PRIORITY_SCORE_WEIGHTS = {
  historical_recurrence_weight: "historical_recurrence / 10",
  skill_frequency_weight: "topic.priority_weight / 2 quando disponível",
  recent_exam_weight: "metadado editorial futuro, default 0 nesta beta",
  user_error_rate_weight: "(100 - accuracy_percentage) / 10",
  target_score_weight: "ajuste futuro por nota-alvo, default 0 nesta beta",
  editorial_confidence_weight: "question.priority_score quando revisada",
} as const;

export const PRIORITY_SCORE_NOTE =
  "Pontuação de ordenação educacional. Não é TRI real, previsão exata ou garantia de nota.";

export function calculatePriorityScore(
  topic: Pick<
    Topic,
    "historical_recurrence" | "strategic_importance" | "difficulty_level"
  >,
  performance?: Pick<TopicPerformance, "accuracy_percentage" | "total_answers">,
) {
  const recurrenceWeight = Number(topic.historical_recurrence) / 10;
  const errorRate = performance?.total_answers
    ? 100 - Number(performance.accuracy_percentage)
    : 55;
  const errorRateWeight = errorRate / 10;
  const strategicImportanceWeight = Number(topic.strategic_importance);
  const levelWeight = difficultyWeight[topic.difficulty_level] ?? 2;

  return Number(
    (
      recurrenceWeight +
      errorRateWeight +
      strategicImportanceWeight +
      levelWeight
    ).toFixed(2),
  );
}

export function priorityLabel(score: number) {
  if (score >= 27) return "Prioridade máxima";
  if (score >= 22) return "Prioridade alta";
  if (score >= 17) return "Prioridade média";
  return "Prioridade complementar";
}

export function formatDateTime(value: string) {
  return formatAppDateTime(value, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getWeekStart(date = new Date()) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().slice(0, 10);
}
