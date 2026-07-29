import type { AnsweredQuestionMetric, AreaMetric } from "@/lib/db/types";

/**
 * Acerto por área a partir das respostas do aluno. Fica fora de `queries.ts`
 * porque o Desempenho soma as mesmas métricas no cliente, juntando as respostas
 * do banco com as do acervo local — e `queries.ts` é server-only.
 */
export function buildAreaMetrics(answers: AnsweredQuestionMetric[]): AreaMetric[] {
  const areaMap = new Map<string, { answered: number; correct: number }>();

  for (const answer of answers) {
    if (!answer.area) continue;
    const current = areaMap.get(answer.area) ?? { answered: 0, correct: 0 };
    current.answered += 1;
    current.correct += answer.is_correct ? 1 : 0;
    areaMap.set(answer.area, current);
  }

  return Array.from(areaMap.entries()).map(([area, metric]) => ({
    area,
    answered: metric.answered,
    accuracy: metric.answered
      ? Math.round((metric.correct / metric.answered) * 100)
      : 0,
  }));
}
