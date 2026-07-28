import { addDaysISO } from "./streak.mjs";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Datas reais das atividades do plano: para cada dia da semana escolhido pelo
 * aluno, a próxima ocorrência dentro dos sete dias que começam hoje.
 *
 * A semana do plano começa na segunda, mas o aluno entra na plataforma em
 * qualquer dia. Agendar pelo deslocamento a partir da segunda faz quem compra
 * numa quinta receber segunda e quarta já vencidas — atividades que ele nunca
 * teve chance de cumprir. Aqui nenhuma data nasce no passado e a lista já vem
 * da mais próxima para a mais distante.
 *
 * @param {string} fromISO data de hoje (yyyy-mm-dd) no fuso do app
 * @param {Array<number | null>} offsetsFromMonday deslocamentos dos dias escolhidos (segunda = 0)
 * @returns {string[]} datas yyyy-mm-dd em ordem crescente, sem repetição
 */
export function upcomingPlanDates(fromISO, offsetsFromMonday) {
  if (!isoDatePattern.test(fromISO)) return [];

  const startOffset = mondayOffsetOf(fromISO);
  const deltas = new Set();
  for (const offset of offsetsFromMonday) {
    if (!Number.isInteger(offset) || offset < 0 || offset > 6) continue;
    deltas.add((offset - startOffset + 7) % 7);
  }

  return [...deltas]
    .sort((a, b) => a - b)
    .map((delta) => addDaysISO(fromISO, delta));
}

/** Deslocamento do dia da semana da data em relação à segunda-feira. */
function mondayOffsetOf(dateISO) {
  const [year, month, day] = dateISO.split("-").map(Number);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}
