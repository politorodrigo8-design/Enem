import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const aiActionSource = readFileSync(
  new URL("../src/lib/actions/ai.ts", import.meta.url),
  "utf8",
);
const aiUiSource = readFileSync(
  new URL("../src/components/dashboard/ai-credit-actions.tsx", import.meta.url),
  "utf8",
);
const creditsPageSource = readFileSync(
  new URL("../src/app/dashboard/creditos/page.tsx", import.meta.url),
  "utf8",
);

test("acoes de IA usam JSON estruturado e validacao Zod antes de confirmar credito", () => {
  assert.match(aiActionSource, /explanationResultSchema = z\.object/);
  assert.match(aiActionSource, /performanceResultSchema = z\.object/);
  assert.match(aiActionSource, /studyPlanResultSchema = z\.object/);
  assert.match(aiActionSource, /validateQuestionExplanation\(ai\.content/);
  assert.match(aiActionSource, /validatePerformanceAnalysis\(ai\.content/);
  assert.match(aiActionSource, /validateStudyPlan\(ai\.content/);
  assert.match(aiActionSource, /const ledger = await confirmAiCreditReservation/);
});

test("validacoes impedem IA de alterar gabarito, metricas objetivas e datas do plano", () => {
  assert.match(aiActionSource, /parsed\.correctAnswer\.option !== question\.correct_option/);
  assert.match(aiActionSource, /parsed\.metrics\.answered !== expected\.answered/);
  assert.match(aiActionSource, /parsed\.metrics\.accuracy !== expected\.accuracy/);
  assert.match(aiActionSource, /day\.date < allowedStart/);
  assert.match(aiActionSource, /totalMinutes > availableMinutes/);
});

test("aplicar plano inteligente preserva historico e nao aciona cobranca", () => {
  const applyAction =
    aiActionSource.match(/export async function applySmartStudyPlanAction[\s\S]+?\n}/)?.[0] ?? "";
  assert.match(applyAction, /update\(\{ status: "Arquivado" \}\)/);
  assert.match(applyAction, /insert\(\{ user_id: context\.user\.id, week_start: weekStart, status: "Ativo" \}\)/);
  assert.match(applyAction, /from\("study_plan_items"\)\.insert/);
  assert.doesNotMatch(applyAction, /reserveAiCredits|confirmAiCreditReservation/);
});

test("interface publica nao expõe provedor, modelo ou textos antigos das features", () => {
  const publicAiText = `${aiUiSource}\n${creditsPageSource}`;
  assert.doesNotMatch(publicAiText, /Groq ativa|Modelo:|llama-3\.3|assuntos para atacar|Tira duvida|Explicar questao|Gerar analise|Otimizar plano/);
});

test("interface renderiza paineis estruturados com custo, saldo e estados esperados", () => {
  assert.match(aiUiSource, /ResponsivePanel/);
  assert.match(aiUiSource, /QuestionExplanationView/);
  assert.match(aiUiSource, /PerformanceAnalysisView/);
  assert.match(aiUiSource, /SmartStudyPlanView/);
  assert.match(aiUiSource, /Custo: \{cost\} cr[eé]dito/);
  assert.match(aiUiSource, /Saldo após esta explicação/);
  assert.match(aiUiSource, /Saldo após esta análise/);
  assert.match(aiUiSource, /Saldo após este plano/);
  assert.match(aiUiSource, /Preparando uma explicação personalizada/);
  assert.match(aiUiSource, /Analisando seus resultados recentes/);
  assert.match(aiUiSource, /Organizando sua semana de estudos/);
});
