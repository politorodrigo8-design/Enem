import type { Topic, TopicPerformance } from "@/lib/db/types";
import { appDateISO, formatAppDateTime } from "@/lib/dates";

const difficultyWeight: Record<string, number> = {
  Baixa: 1.5,
  Média: 3,
  Alta: 4.5,
};

// Espelho documental do cálculo abaixo — se mudar a fórmula, atualize aqui e
// na página /dashboard/desempenho/metodologia.
export const PRIORITY_SCORE_WEIGHTS = {
  historical_recurrence_weight: "historical_recurrence / 10",
  user_error_rate_weight: "(100 - accuracy_percentage) / 10; 5,5 sem respostas",
  strategic_importance_weight: "strategic_importance do assunto",
  difficulty_weight: "Baixa 1,5 · Média 3 · Alta 4,5",
  diagnosis_boost: "autopercepção da área × 1,2 (semeada no diagnóstico)",
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

// Aritmética pura de data no fuso do app — nunca usar Date local/UTC direto
// aqui: o servidor roda em UTC e deslocaria o dia perto da meia-noite.
export function getWeekStart(date = new Date()) {
  const [year, month, day] = appDateISO(date).split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc.toISOString().slice(0, 10);
}

/** Soma dias a uma data yyyy-mm-dd sem passar por fuso horário. */
export function addDaysISO(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
