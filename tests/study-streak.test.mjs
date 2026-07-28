import test from "node:test";
import assert from "node:assert/strict";
import { calculateStudyStreak } from "../src/lib/study/streak.mjs";
import { buildWeeklyTrend } from "../src/lib/study/weekly-trend.mjs";
import { upcomingPlanDates } from "../src/lib/study/plan-schedule.mjs";

const NOW = Date.parse("2026-07-27T12:00:00-03:00");
const DAY = 24 * 60 * 60 * 1000;

function answerAt(daysAgo, isCorrect) {
  return {
    is_correct: isCorrect,
    answered_at: new Date(NOW - daysAgo * DAY).toISOString(),
  };
}

test("primeiro estudo do dia inicia sequencia em 1", () => {
  assert.equal(calculateStudyStreak(["2026-07-24"], "2026-07-24"), 1);
});

test("estudo em dias civis consecutivos soma a sequencia", () => {
  assert.equal(
    calculateStudyStreak(["2026-07-24", "2026-07-25"], "2026-07-25"),
    2,
  );
});

test("mantem sequencia de ontem enquanto hoje ainda nao teve estudo", () => {
  assert.equal(
    calculateStudyStreak(["2026-07-22", "2026-07-23"], "2026-07-24"),
    2,
  );
});

test("para a contagem quando ha buraco entre dias", () => {
  assert.equal(
    calculateStudyStreak(["2026-07-21", "2026-07-23", "2026-07-24"], "2026-07-24"),
    2,
  );
});

test("evolucao semanal compara os ultimos 7 dias com os 7 anteriores", () => {
  const answers = [
    answerAt(1, true),
    answerAt(2, true),
    answerAt(3, true),
    answerAt(4, false),
    answerAt(9, true),
    answerAt(10, false),
    answerAt(11, false),
    answerAt(12, false),
  ];

  const trend = buildWeeklyTrend(answers, NOW);
  assert.equal(trend.value, "+50 p.p.");
  assert.equal(trend.trend, "up");
  assert.equal(trend.helper, "75% nos últimos 7 dias · 25% na semana anterior");
});

test("evolucao semanal aponta queda de acerto", () => {
  const trend = buildWeeklyTrend(
    [answerAt(1, false), answerAt(2, true), answerAt(8, true), answerAt(9, true)],
    NOW,
  );
  assert.equal(trend.value, "-50 p.p.");
  assert.equal(trend.trend, "down");
});

test("evolucao semanal nao inventa metrica sem duas semanas de historico", () => {
  const semanaUnica = buildWeeklyTrend([answerAt(1, true), answerAt(2, false)], NOW);
  assert.equal(semanaUnica.value, "Primeira semana");
  assert.equal(semanaUnica.trend, "flat");

  const semTreinoRecente = buildWeeklyTrend([answerAt(20, true)], NOW);
  assert.equal(semTreinoRecente.value, "Sem treino");

  assert.equal(buildWeeklyTrend([], NOW).value, "Sem treino");
});

test("evolucao semanal ignora respostas com data futura", () => {
  const trend = buildWeeklyTrend([answerAt(-2, true), answerAt(1, false)], NOW);
  assert.equal(trend.value, "Primeira semana");
  assert.match(trend.helper, /0%/);
});

test("plano gerado numa quinta nunca agenda atividade no passado", () => {
  // 2026-07-23 e uma quinta; segunda (0) e quarta (2) so voltam na semana seguinte.
  assert.deepEqual(upcomingPlanDates("2026-07-23", [0, 2, 4]), [
    "2026-07-24",
    "2026-07-27",
    "2026-07-29",
  ]);
});

test("plano inclui o proprio dia quando ele esta entre os dias escolhidos", () => {
  assert.deepEqual(upcomingPlanDates("2026-07-27", [0, 3]), [
    "2026-07-27",
    "2026-07-30",
  ]);
});

test("plano ignora dias invalidos e nao repete data", () => {
  assert.deepEqual(upcomingPlanDates("2026-07-27", [null, 0, 0, 9]), ["2026-07-27"]);
  assert.deepEqual(upcomingPlanDates("27/07/2026", [0]), []);
});
