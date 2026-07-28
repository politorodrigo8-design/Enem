import { calculatePriorityScore, priorityLabel } from "@/lib/db/scoring";
import type { Profile, TopicPerformance, TopicWithSubject } from "@/lib/db/types";
import { normalizeSelfAssessmentRating } from "@/lib/study/self-assessment-priority.mjs";

/**
 * Motor único de priorização de assuntos.
 *
 * Toda tela que mostra "o que estudar agora" (Hoje, Desempenho, Diagnóstico,
 * plano da semana) deve derivar sua lista deste módulo. O score combina
 * recorrência histórica no ENEM, taxa de erro do aluno, importância estratégica
 * e dificuldade do assunto.
 */
export type PrioritizedTopic = {
  topic: TopicWithSubject;
  performance: TopicPerformance | undefined;
  score: number;
  label: string;
  hasPersonalPerformance: boolean;
  /** Explicação em linguagem de aluno, sem jargão de score. */
  reason: string;
};

/** Autopercepção por área: 1 = mais dificuldade, 5 = mais facilidade. */
export type PerceivedDifficulties = Record<string, number | string>;

/** Extrai a autopercepção do perfil no formato que `prioritizeTopics` espera. */
export function perceivedDifficultiesFromProfile(
  profile: Pick<Profile, "perceived_difficulties"> | null | undefined,
): PerceivedDifficulties | null {
  const value = profile?.perceived_difficulties;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PerceivedDifficulties)
    : null;
}

export function prioritizeTopics(
  topics: TopicWithSubject[],
  perceivedDifficulties?: PerceivedDifficulties | null,
): PrioritizedTopic[] {
  return topics
    .map((topic) => {
      const performance = topic.user_topic_performance?.[0];
      const answered = Number(performance?.total_answers ?? 0);
      const storedScore = Number(performance?.priority_score) || 0;
      const score = storedScore || calculatePriorityScore(topic, performance);
      // O score gravado no diagnóstico já embute a autopercepção do aluno: aí o
      // selo fala de prioridade, e não de recorrência histórica solta.
      const fromDiagnosis = !answered && storedScore > 0;

      return {
        topic,
        performance,
        score,
        label: answered || fromDiagnosis ? priorityLabel(score) : recurrenceLabel(topic),
        hasPersonalPerformance: answered > 0,
        reason: buildPriorityReason(topic, performance, {
          fromDiagnosis,
          areaDifficulty: areaDifficultyFor(topic, perceivedDifficulties),
        }),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.topic.historical_recurrence ?? 0) -
          Number(a.topic.historical_recurrence ?? 0) ||
        a.topic.name.localeCompare(b.topic.name, "pt-BR"),
    );
}

function buildPriorityReason(
  topic: TopicWithSubject,
  performance: TopicPerformance | undefined,
  { fromDiagnosis, areaDifficulty }: { fromDiagnosis: boolean; areaDifficulty: number | null },
) {
  const recurrence = recurrenceClause(topic);
  const answered = Number(performance?.total_answers ?? 0);
  const accuracy = Math.round(Number(performance?.accuracy_percentage ?? 0));
  const area = topic.subjects?.area;

  if (!answered) {
    if (area && areaDifficulty != null && areaDifficulty <= 2) {
      return `Você marcou ${area} como uma área de maior dificuldade; este assunto ${recurrence}.`;
    }
    if (area && areaDifficulty != null && areaDifficulty >= 4) {
      return `Você marcou ${area} com mais facilidade, mas este assunto ${recurrence} — confirme resolvendo questões.`;
    }
    if (fromDiagnosis) {
      return `${sentence(recurrence)} e entrou na sua lista pelas respostas do seu diagnóstico. Resolva algumas questões para ajustarmos com seus acertos.`;
    }
    return `${sentence(recurrence)}. Resolva algumas questões daqui para calibrar a prioridade com seus acertos.`;
  }

  if (accuracy < 50) {
    return `${sentence(recurrence)} e sua taxa de acerto está em ${accuracy}%.`;
  }

  if (accuracy < 75) {
    return `${sentence(recurrence)}; você acerta ${accuracy}%, dá para consolidar.`;
  }

  return `${sentence(recurrence)}; você já domina (${accuracy}% de acerto). Mantenha com revisões.`;
}

function areaDifficultyFor(
  topic: TopicWithSubject,
  perceivedDifficulties?: PerceivedDifficulties | null,
) {
  const area = topic.subjects?.area;
  if (!area || !perceivedDifficulties) return null;
  const value = Number(perceivedDifficulties[area]);
  return Number.isFinite(value) && value >= 1 && value <= 5
    ? normalizeSelfAssessmentRating(value)
    : null;
}

function recurrenceClause(topic: TopicWithSubject) {
  const recurrence = Number(topic.historical_recurrence ?? 0);
  if (recurrence >= 75) return "cai quase todo ano no ENEM";
  if (recurrence >= 50) return "aparece com frequência no ENEM";
  return "aparece de vez em quando no ENEM";
}

function sentence(clause: string) {
  return clause.charAt(0).toUpperCase() + clause.slice(1);
}

function recurrenceLabel(topic: TopicWithSubject) {
  const recurrence = Number(topic.historical_recurrence ?? 0);
  if (recurrence >= 75) return "Alta recorrência";
  if (recurrence >= 50) return "Recorrência média";
  return "Baixa recorrência";
}
