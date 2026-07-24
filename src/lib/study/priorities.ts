import { calculatePriorityScore, priorityLabel } from "@/lib/db/scoring";
import type { TopicPerformance, TopicWithSubject } from "@/lib/db/types";

/**
 * Motor único de priorização de assuntos.
 *
 * Toda tela que mostra "o que estudar agora" (Hoje, Desempenho, Diagnóstico,
 * plano da semana) deve derivar sua lista deste módulo — nunca reordenar ou
 * recalcular por conta própria. O score combina recorrência histórica no ENEM,
 * taxa de erro do aluno, importância estratégica e dificuldade do assunto.
 */
export type PrioritizedTopic = {
  topic: TopicWithSubject;
  performance: TopicPerformance | undefined;
  score: number;
  label: string;
  hasPersonalPerformance: boolean;
  /** Explicação em linguagem de aluno — sem jargão de score. */
  reason: string;
};

export function prioritizeTopics(topics: TopicWithSubject[]): PrioritizedTopic[] {
  return topics
    .map((topic) => {
      const performance = topic.user_topic_performance?.[0];
      const answered = Number(performance?.total_answers ?? 0);
      const score =
        Number(performance?.priority_score) || calculatePriorityScore(topic, performance);

      return {
        topic,
        performance,
        score,
        label: answered ? priorityLabel(score) : recurrenceLabel(topic),
        hasPersonalPerformance: answered > 0,
        reason: buildPriorityReason(topic, performance),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.topic.historical_recurrence ?? 0) -
          Number(a.topic.historical_recurrence ?? 0) ||
        a.topic.name.localeCompare(b.topic.name),
    );
}

export function buildPriorityReason(
  topic: TopicWithSubject,
  performance: TopicPerformance | undefined,
) {
  const recurrence = Number(topic.historical_recurrence ?? 0);
  const answered = Number(performance?.total_answers ?? 0);
  const accuracy = Math.round(Number(performance?.accuracy_percentage ?? 0));

  const recurrencePart =
    recurrence >= 75
      ? "Cai quase todo ano no ENEM"
      : recurrence >= 50
        ? "Aparece com frequência no ENEM"
        : "Aparece de vez em quando no ENEM";

  if (!answered) {
    return `${recurrencePart}. Prioridade inicial por recorrência histórica; responda questões para calibrar pelo seu acerto e erro.`;
  }

  if (accuracy < 50) {
    return `${recurrencePart} e sua taxa de acerto está em ${accuracy}%.`;
  }

  if (accuracy < 75) {
    return `${recurrencePart}; você acerta ${accuracy}% — dá para consolidar.`;
  }

  return `${recurrencePart}; você já domina (${accuracy}% de acerto). Mantenha com revisões.`;
}

function recurrenceLabel(topic: TopicWithSubject) {
  const recurrence = Number(topic.historical_recurrence ?? 0);
  if (recurrence >= 75) return "Alta recorrência";
  if (recurrence >= 50) return "Recorrência média";
  return "Baixa recorrência";
}
