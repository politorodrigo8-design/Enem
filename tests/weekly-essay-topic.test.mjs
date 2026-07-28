import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contentSource = readFileSync(
  new URL("../src/data/weekly-essay-topics.ts", import.meta.url),
  "utf8",
);
const essayClientSource = readFileSync(
  new URL("../src/app/dashboard/correcao-redacao/essay-correction-client.tsx", import.meta.url),
  "utf8",
);
const cardSource = readFileSync(
  new URL("../src/app/dashboard/correcao-redacao/weekly-essay-topic-card.tsx", import.meta.url),
  "utf8",
);

test("tema sugerido semanal mantem conteudo editorial estruturado", () => {
  assert.match(contentSource, /type WeeklyEssayTopic = \{/);
  assert.match(contentSource, /id: string/);
  assert.match(contentSource, /title: string/);
  assert.match(contentSource, /shortDescription: string/);
  assert.match(contentSource, /command: string/);
  assert.match(contentSource, /motivatingTexts: Array/);
  assert.match(contentSource, /discussionAxes: string\[\]/);
  assert.match(contentSource, /suggestedRepertoires: string\[\]/);
  assert.match(contentSource, /startsAt: string/);
  assert.match(contentSource, /endsAt: string/);
  assert.match(contentSource, /active: boolean/);
  assert.match(contentSource, /WEEKLY_ESSAY_TOPIC_UNLOCK_COST = 1/);
  assert.match(contentSource, /Desafios para combater a desinformação entre jovens no Brasil/);
  assert.match(contentSource, /2026-07-27-envelhecimento-populacional/);
  assert.match(contentSource, /active: true/);
});

test("tema sugerido troca por rotacao deterministica de periodo", () => {
  assert.match(contentSource, /getActiveWeeklyEssayTopic\(currentDate = todayInSaoPaulo\(\)\)/);
  assert.match(contentSource, /ESSAY_TOPIC_ROTATION_DAYS/);
  assert.match(contentSource, /Math\.floor\(daysBetween\(firstStart, currentDate\) \/ ESSAY_TOPIC_ROTATION_DAYS\)/);
  assert.match(contentSource, /periodIndex % activeTopics\.length/);
});

test("a rotacao garante tema ativo continuo a partir da primeira data publicada", () => {
  // A rotação nunca deixa a tela vazia após a primeira data publicada; o antigo
  // fallback de "proposta mais recente" (isCurrentWeek) virou código morto e saiu.
  assert.doesNotMatch(contentSource, /isCurrentWeek/);
  assert.match(essayClientSource, /getActiveWeeklyEssayTopic\(\)/);
});

test("card mostra o ultimo dia em que o tema vale, nao a data exclusiva de troca", () => {
  assert.match(cardSource, /formatTopicDate\(addDaysISO\(topic\.endsAt, -1\)\)/);
});

test("card semanal oferece a proposta completa sem expor historico vazio", () => {
  assert.match(cardSource, /Tema de hoje/);
  assert.match(cardSource, /não\s+representa previsão do ENEM/);
  assert.match(cardSource, /Usar este tema/);
  assert.match(cardSource, /Ver proposta completa/);
  assert.match(cardSource, /Liberar proposta completa/);
  assert.match(cardSource, /AiResponsivePanel/);
  assert.match(cardSource, /AiConfirmationDialog/);
  assert.match(cardSource, /mode="drawer"/);
  assert.match(cardSource, /não devem ser copiados integralmente/);
});

test("usar tema sugerido apenas preenche campo e confirma substituicao", () => {
  const useSuggestedTopic =
    essayClientSource.match(/function useSuggestedTopic\(\) \{[\s\S]+?\n  \}/)?.[0] ?? "";
  assert.match(useSuggestedTopic, /window\.confirm/);
  assert.match(useSuggestedTopic, /setTheme\(suggestedTheme\)/);
  assert.match(useSuggestedTopic, /themeInputRef\.current\?\.focus/);
  assert.doesNotMatch(useSuggestedTopic, /submitEssayCorrectionAction/);
  assert.doesNotMatch(useSuggestedTopic, /submitOnlineEssayCorrectionAction/);
});
