const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Compara a taxa de acerto dos últimos 7 dias com a dos 7 anteriores.
 * Sem as duas janelas não existe comparação: o retorno diz isso em vez de
 * entregar um número que não mede nada.
 *
 * @param {Array<{ is_correct: boolean, answered_at: string }>} answers
 * @param {number} [now] instante de referência em ms (facilita o teste)
 * @returns {{ value: string, helper: string, trend: "up" | "down" | "flat" }}
 */
export function buildWeeklyTrend(answers, now = Date.now()) {
  const current = { answered: 0, correct: 0 };
  const previous = { answered: 0, correct: 0 };

  for (const answer of answers ?? []) {
    const age = now - new Date(answer.answered_at).getTime();
    if (!Number.isFinite(age) || age < 0) continue;
    const window = age <= WEEK_IN_MS ? current : age <= WEEK_IN_MS * 2 ? previous : null;
    if (!window) continue;
    window.answered += 1;
    window.correct += answer.is_correct ? 1 : 0;
  }

  if (!current.answered) {
    return {
      value: "Sem treino",
      helper: "Responda questões nesta semana para medir sua evolução.",
      trend: "flat",
    };
  }

  const currentAccuracy = Math.round((current.correct / current.answered) * 100);

  if (!previous.answered) {
    return {
      value: "Primeira semana",
      helper: `${currentAccuracy}% de acerto nos últimos 7 dias. A comparação aparece com duas semanas de treino.`,
      trend: "flat",
    };
  }

  const previousAccuracy = Math.round((previous.correct / previous.answered) * 100);
  const delta = currentAccuracy - previousAccuracy;

  return {
    value: `${delta > 0 ? "+" : ""}${delta} p.p.`,
    helper: `${currentAccuracy}% nos últimos 7 dias · ${previousAccuracy}% na semana anterior`,
    trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}
