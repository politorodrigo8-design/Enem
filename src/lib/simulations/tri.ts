/**
 * Estimativa de nota na escala do ENEM (300–1000) a partir do aproveitamento
 * ponderado por dificuldade. NÃO é o cálculo TRI oficial do Inep — é uma
 * aproximação pedagógica, e a interface deve sempre dizer isso ao aluno.
 */
const difficultyWeight: Record<string, number> = {
  Baixa: 0.75,
  Média: 1,
  Alta: 1.3,
};

export function estimateEnemScore(
  items: Array<{ difficulty: string; isCorrect: boolean }>,
): number | null {
  if (!items.length) return null;

  let total = 0;
  let earned = 0;
  for (const item of items) {
    const weight = difficultyWeight[item.difficulty] ?? 1;
    total += weight;
    if (item.isCorrect) earned += weight;
  }
  if (!total) return null;

  const proportion = earned / total;
  return Math.round((300 + 700 * proportion) / 10) * 10;
}

export const ENEM_SCORE_ESTIMATE_NOTE =
  "Estimativa na escala de 300 a 1000, ponderada pela dificuldade das questões. Não é o cálculo TRI oficial do Inep.";
