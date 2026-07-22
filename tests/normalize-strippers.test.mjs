import test from "node:test";
import assert from "node:assert/strict";
import {
  hasControlChars,
  hasExamFooter,
  stripControlChars,
  stripExamFooters,
  stripLeadingGarbage,
  stripOptionLetterBleed,
} from "../scripts/normalize-question-imports.mjs";

test("remove rodape de caderno do fim das alternativas, preservando o texto real", () => {
  const dirty = "participação no exercício do poder. CH - 1° dia | Caderno 1 - AZUL - Página 30";
  assert.equal(hasExamFooter(dirty), true);
  const result = stripExamFooters(dirty, "option_e");
  assert.equal(result.changed, true);
  assert.equal(result.value, "participação no exercício do poder.");
});

test("stripExamFooters remove ENEN2025 e MATEMATICA E SUAS TECNOLOGIAS", () => {
  const dirty =
    "25 × 10−2 ENEN2025 ENEN2025 MATEMÁTICA E SUAS TECNOLOGIAS | 2º DIA | CADERNO 7 | AZUL";
  assert.equal(stripExamFooters(dirty, "option_e").value, "25 × 10−2");
});

test("stripExamFooters remove rodape com codigo de disciplina MT e numero de pagina", () => {
  const dirty = "apresentam propriedades mecânicas semelhantes aos convencionais. MT - 2° dia | Caderno 7 - AZUL - Página 3";
  assert.equal(
    stripExamFooters(dirty, "option_e").value,
    "apresentam propriedades mecânicas semelhantes aos convencionais.",
  );
});

test("stripExamFooters nao mexe em campo fora de conteudo nem em texto limpo", () => {
  assert.equal(stripExamFooters("Caderno de estudos do aluno.", "editorial_notes").changed, false);
  assert.equal(stripExamFooters("Uma alternativa correta e completa.", "option_a").changed, false);
});

test("remove caracteres de controle ilegiveis do PDF", () => {
  const dirty = "Vazão  por minuto.";
  assert.equal(hasControlChars(dirty), true);
  const result = stripControlChars(dirty);
  assert.equal(result.changed, true);
  assert.equal(result.value, "Vazão por minuto.");
});

test("remove prefixo de setas/mojibake do inicio do enunciado", () => {
  const dirty = "————>>>>—— enemooz Um segmento de reta está dividido.";
  const result = stripLeadingGarbage(dirty);
  assert.equal(result.changed, true);
  assert.equal(result.value, "Um segmento de reta está dividido.");
});

test("stripLeadingGarbage nao corta enunciado que ja comeca limpo", () => {
  const clean = "Um segmento de reta está dividido em duas partes.";
  assert.equal(stripLeadingGarbage(clean).changed, false);
});

test("remove letra da proxima alternativa vazada quando o padrao e sistematico", () => {
  const row = {
    option_a: "qualidade da educação formal em Miami. B",
    option_b: "prestígio da cultura cubana. C",
    option_c: "influência da música latina. D",
    option_d: "valor do esporte universitário. E",
    option_e: "fortalecimento do elo familiar.",
  };
  const result = stripOptionLetterBleed(row);
  assert.equal(result.changes.length, 4);
  assert.equal(result.row.option_a, "qualidade da educação formal em Miami.");
  assert.equal(result.row.option_e, "fortalecimento do elo familiar.");
});

test("stripOptionLetterBleed preserva letra final legitima sem padrao sistematico", () => {
  const row = {
    option_a: "A reta passa pelo ponto B",
    option_b: "Alternativa comum sem letra final.",
    option_c: "Outra alternativa comum.",
    option_d: "Mais uma alternativa.",
    option_e: "Ultima alternativa.",
  };
  const result = stripOptionLetterBleed(row);
  assert.equal(result.changes.length, 0);
  assert.equal(result.row.option_a, "A reta passa pelo ponto B");
});
