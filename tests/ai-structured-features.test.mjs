import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const aiActionSource = readFileSync(
  new URL("../src/lib/actions/ai.ts", import.meta.url),
  "utf8",
);
const aiUiEntrySource = readFileSync(
  new URL("../src/components/dashboard/ai-credit-actions.tsx", import.meta.url),
  "utf8",
);
const aiUiSource = [
  aiUiEntrySource,
  ...readSources(new URL("../src/components/dashboard/ai/", import.meta.url)),
].join("\n");
const creditsPageSource = readFileSync(
  new URL("../src/app/dashboard/creditos/page.tsx", import.meta.url),
  "utf8",
);
const legalConfigSource = readFileSync(
  new URL("../src/lib/legal/config.ts", import.meta.url),
  "utf8",
);

function readSources(directoryUrl) {
  return readdirSync(directoryUrl, { withFileTypes: true }).flatMap((entry) => {
    const childUrl = new URL(entry.name, directoryUrl);
    if (entry.isDirectory()) return readSources(new URL(`${entry.name}/`, directoryUrl));
    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) return [];
    return readFileSync(childUrl, "utf8");
  });
}

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

test("explicacao de questao recebe contexto completo e nao finge ver imagem", () => {
  assert.match(aiActionSource, /Descricao de midia disponivel/);
  assert.match(aiActionSource, /Nao afirme ter visto imagem/);
  assert.match(aiActionSource, /Gabarito real, que não pode ser alterado/);
  assert.match(aiActionSource, /Alternativa marcada pelo aluno/);
  assert.match(aiActionSource, /alternativesAnalysis deve conter SOMENTE as alternativas incorretas existentes/);
  assert.match(aiActionSource, /missing_alternative_analysis/);
  assert.match(aiActionSource, /generic_alternative_explanation/);
  assert.match(aiUiSource, /Por que as outras estão erradas/);
});

test("aplicar plano inteligente preserva historico e nao aciona cobranca", () => {
  const applyAction =
    aiActionSource.match(/export async function applySmartStudyPlanAction[\s\S]+?\n}/)?.[0] ?? "";
  assert.match(applyAction, /update\(\{ status: "Arquivado" \}\)/);
  assert.match(applyAction, /insert\(\{ user_id: context\.user\.id, week_start: weekStart, status: "Ativo" \}\)/);
  assert.match(applyAction, /from\("study_plan_items"\)\.insert/);
  assert.doesNotMatch(applyAction, /reserveAiCredits|confirmAiCreditReservation/);
});

test("falha de geracao estorna o credito e a mensagem depende do estorno", () => {
  assert.equal((aiActionSource.match(/return aiGenerationFailure\(\{/g) ?? []).length, 3);
  assert.match(aiActionSource, /return \{ refunded: false \}/);
  assert.match(aiActionSource, /refunded\s*\n?\s*\?\s*"Seu crédito foi devolvido/);
  assert.match(aiActionSource, /legalContacts\.supportEmail/);
  assert.match(legalConfigSource, /supportEmail:\s*"pontuaenem\.suporte@gmail\.com"/);
});

test("acoes de IA nao reservam credito com o provedor indisponivel", () => {
  assert.equal((aiActionSource.match(/if \(!isGroqConfigured\(\)\) return aiUnavailableResult\(\);/g) ?? []).length, 3);
  assert.match(aiActionSource, /nenhum crédito foi usado/);
});

test("interface publica nao expõe provedor, modelo ou textos antigos das features", () => {
  const publicAiText = `${aiUiSource}\n${creditsPageSource}`;
  assert.doesNotMatch(publicAiText, /Groq ativa|Modelo:|llama-3\.3|assuntos para atacar|Tira duvida|Explicar questao|Gerar analise|Otimizar plano/);
});

test("exports publicos das acoes de IA permanecem estaveis", () => {
  assert.match(aiUiEntrySource, /export \{ QuestionExplanationCreditAction \}/);
  assert.match(aiUiEntrySource, /export \{ PerformanceAnalysisCreditAction \}/);
  assert.match(aiUiEntrySource, /export \{ SmartStudyPlanCreditAction \}/);
});

test("interface renderiza paineis estruturados com custo, saldo e estados esperados", () => {
  assert.match(aiUiSource, /AiResponsivePanel/);
  assert.match(aiUiSource, /QuestionExplanationContent/);
  assert.match(aiUiSource, /PerformanceAnalysisContent/);
  assert.match(aiUiSource, /IntelligentPlanContent/);
  assert.match(aiUiSource, /Custo: \{cost\} cr[eé]dito/);
  assert.match(aiUiSource, /Saldo após esta explicação/);
  assert.match(aiUiSource, /Saldo após esta análise/);
  assert.match(aiUiSource, /Saldo após este plano/);
  assert.match(aiUiSource, /Preparando uma explicação personalizada/);
  assert.match(aiUiSource, /Analisando seus resultados recentes/);
  assert.match(aiUiSource, /Organizando sua semana de estudos/);
});
