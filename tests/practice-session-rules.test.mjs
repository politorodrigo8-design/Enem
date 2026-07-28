import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  answerIdsForSession,
  answersFromAttemptRows,
  buildShortQuestionFeedback,
  canFinalizeAttempt,
  elapsedSecondsSince,
  firstUnansweredIndex,
  getPracticeSessionStats,
  latestActiveAttempt,
  latestAnswerByQuestion,
  normalizePracticeQuestionIds,
} from "../src/lib/practice-session/rules.mjs";

const questionBankClientSource = readFileSync(
  new URL("../src/app/dashboard/questoes/question-bank-client.tsx", import.meta.url),
  "utf8",
);
const simulationsClientSource = readFileSync(
  new URL("../src/app/dashboard/simulados/simulations-client.tsx", import.meta.url),
  "utf8",
);

test("sessao sem respostas nao gera ids para finalizacao", () => {
  assert.deepEqual(
    answerIdsForSession({
      questionIds: ["q1", "q2"],
      answerState: {},
    }),
    [],
  );
});

test("sessao com uma resposta usa o mesmo estado do progresso para finalizar", () => {
  const stats = getPracticeSessionStats({
    questionIds: ["q1", "q2"],
    answerState: {
      q1: { isCorrect: true },
    },
  });

  assert.deepEqual(stats.answeredQuestionIds, ["q1"]);
  assert.equal(stats.answered, 1);
  assert.equal(stats.correct, 1);
  assert.equal(stats.wrong, 0);
});

test("sessao totalmente respondida pode ser finalizada com acertos e erros", () => {
  const stats = getPracticeSessionStats({
    questionIds: ["q1", "q2", "q3"],
    answerState: {
      q1: { isCorrect: true },
      q2: { isCorrect: false },
      q3: { isCorrect: false },
    },
  });

  assert.deepEqual(stats.answeredQuestionIds, ["q1", "q2", "q3"]);
  assert.equal(stats.answered, 3);
  assert.equal(stats.correct, 1);
  assert.equal(stats.wrong, 2);
});

test("ids de sessao sao normalizados sem duplicar metricas", () => {
  assert.deepEqual(normalizePracticeQuestionIds(["q1", "q1", "", "q2"]), [
    "q1",
    "q2",
  ]);
});

test("respostas restauradas usam a mais recente por questao", () => {
  const latest = latestAnswerByQuestion([
    { question_id: "q1", selected_option: "A", answered_at: "2026-07-13T10:00:00Z" },
    { question_id: "q1", selected_option: "B", answered_at: "2026-07-14T10:00:00Z" },
  ]);

  assert.equal(latest.get("q1").selected_option, "B");
});

test("feedback gratuito fica curto e preserva a explicacao completa fora da UI gratuita", () => {
  const feedback = buildShortQuestionFeedback({
    isCorrect: false,
    correctOption: "C",
    explanation:
      "O enunciado indica que a concentracao no dia de trabalho e 1,59 vez a concentracao no dia de folga. Para resolver, monte T = 1,59 x F e compare todas as alternativas uma a uma. A e falsa, B contraria o texto, D inverte a razao e E ignora a unidade.",
  });

  assert.equal(
    feedback,
    "A alternativa correta e C. O enunciado indica que a concentracao no dia de trabalho e 1,59 vez a concentracao no dia de folga.",
  );
  assert.equal(feedback.split(/(?<=[.!?])\s+/).length, 2);
  assert.doesNotMatch(feedback, /compare todas as alternativas/i);
});

test("simulado em andamento mais recente e restaurado ao recarregar", () => {
  const attempt = latestActiveAttempt([
    { id: "done", status: "Finalizado", started_at: "2026-07-13T10:00:00Z" },
    { id: "old", status: "Em andamento", started_at: "2026-07-13T11:00:00Z" },
    { id: "new", status: "Em andamento", started_at: "2026-07-13T12:00:00Z" },
  ]);

  assert.equal(attempt.id, "new");
});

test("simulado restaura respostas, posicao e cronometro", () => {
  const answers = answersFromAttemptRows([
    { question_id: "q1", selected_option: "A" },
    { question_id: "q2", selected_option: "C" },
  ]);

  assert.deepEqual(answers, { q1: "A", q2: "C" });
  assert.equal(firstUnansweredIndex(["q1", "q2", "q3"], answers), 2);
  assert.equal(
    elapsedSecondsSince(
      "2026-07-13T12:00:00Z",
      new Date("2026-07-13T12:05:30Z").getTime(),
    ),
    330,
  );
});

test("simulado concluido nao volta como ativo e nao deve finalizar de novo", () => {
  assert.equal(latestActiveAttempt([{ id: "done", status: "Finalizado", started_at: "2026-07-13T10:00:00Z" }]), undefined);
  assert.equal(canFinalizeAttempt("Finalizado"), false);
  assert.equal(canFinalizeAttempt("Em andamento"), true);
});

test("praticar diferencia questoes disponiveis da quantidade da sessao", () => {
  assert.match(questionBankClientSource, /configuredSessionCount/);
  assert.match(questionBankClientSource, /disponíveis/);
  assert.match(questionBankClientSource, /nesta sessão/);
  assert.doesNotMatch(questionBankClientSource, /<p className="tnum text-sm font-semibold text-slate-700">\s*\{filtered\.length\}/);
});

test("pratica usa modo foco com saida confirmada e explicacao isolada por questao", () => {
  assert.match(questionBankClientSource, /practiceFocusActive/);
  assert.match(questionBankClientSource, /<PracticeFocusBar/);
  assert.match(questionBankClientSource, /Ajustar sessão/);
  assert.match(questionBankClientSource, /window\.confirm\(/);
  assert.match(questionBankClientSource, /beforeunload/);
  assert.match(questionBankClientSource, /Seu progresso fica salvo/);
  assert.match(questionBankClientSource, /key=\{question\.id\}/);
  assert.match(questionBankClientSource, /QuestionExplanationCreditAction/);
  assert.match(questionBankClientSource, /toggleQuestionFavoriteAction/);
});

test("simulado ativo preserva foco, nao exibe explicacao e bloqueia finalizacao repetida", () => {
  assert.match(simulationsClientSource, /beforeunload/);
  assert.match(simulationsClientSource, /finishingSimulationRef/);
  assert.match(simulationsClientSource, /if \(finishingSimulationRef\.current \|\| finished\) return/);
  assert.match(simulationsClientSource, /Sair.*sem finalizar/s);
  assert.match(simulationsClientSource, /Finalizar e ver nota/);
  assert.match(simulationsClientSource, /previousOption/);
  assert.match(simulationsClientSource, /router\.refresh\(\)/);
  assert.doesNotMatch(simulationsClientSource, /QuestionExplanationCreditAction/);
  assert.doesNotMatch(simulationsClientSource, /correct_option/);
});

test("estado local nao sobrescreve sessao persistida e avisos tecnicos nao aparecem", () => {
  assert.match(questionBankClientSource, /some\(\(questionId\) => !isLocalQuestionId\(questionId\)\)/);
  assert.match(questionBankClientSource, /window\.addEventListener\("focus", revalidateFromServer\)/);
  // Acordeões da lateral usam o componente único (details/summary nativo).
  assert.match(questionBankClientSource, /<AccordionCard key=\{question\.id\} title="Detalhes">/);
  assert.doesNotMatch(questionBankClientSource, /<details/);
  assert.doesNotMatch(simulationsClientSource, /O servidor não trouxe simulados salvos agora/);
  assert.match(simulationsClientSource, /\.filter\(\(\{ attempt \}\) => Boolean\(attempt\)\)/);
});
