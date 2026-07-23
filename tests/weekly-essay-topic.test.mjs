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
  assert.match(contentSource, /active: true/);
});

test("card semanal oferece a proposta completa sem expor historico vazio", () => {
  assert.match(cardSource, /Tema sugerido da semana/);
  assert.match(cardSource, /Usar este tema/);
  assert.match(cardSource, /Ver proposta completa/);
  assert.match(cardSource, /Liberar proposta completa/);
  assert.match(cardSource, /AiResponsivePanel/);
  assert.match(cardSource, /AiConfirmationDialog/);
  assert.match(cardSource, /mode="drawer"/);
  assert.match(cardSource, /topicCount > 1/);
  assert.match(cardSource, /otherTopicsHref/);
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
