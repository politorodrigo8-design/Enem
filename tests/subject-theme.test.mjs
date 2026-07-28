import test from "node:test";
import assert from "node:assert/strict";
import {
  getAreaTheme,
  getSubjectTheme,
  normalizeSubjectName,
  subjectThemes,
} from "../src/lib/subjects/subject-theme.mjs";

test("normaliza aliases reais de materias do ENEM", () => {
  assert.equal(normalizeSubjectName("Português"), "lingua_portuguesa");
  assert.equal(normalizeSubjectName("Língua Portuguesa"), "lingua_portuguesa");
  assert.equal(normalizeSubjectName("Ciências Biológicas"), "biologia");
  assert.equal(normalizeSubjectName("Matemática e suas Tecnologias"), "matematica");
});

test("materias ficam agrupadas nas areas corretas", () => {
  assert.equal(getSubjectTheme("Física").area, "Ciencias da Natureza");
  assert.equal(getSubjectTheme("Geografia").area, "Ciencias Humanas");
  assert.equal(getSubjectTheme("Educação Física").area, "Linguagens");
  assert.equal(getAreaTheme("Ciências da Natureza").id, "natureza");
});

test("fallback de materia desconhecida preserva nome original e contraste neutro", () => {
  const theme = getSubjectTheme("Astronomia");
  assert.equal(theme.id, "astronomia");
  assert.equal(theme.label, "Astronomia");
  assert.equal(theme.unmapped, true);
  assert.match(theme.text, /^#/);
  assert.match(theme.background, /^#/);
});

test("temas usam tokens completos em vez de classes tailwind dinamicas", () => {
  for (const theme of Object.values(subjectThemes)) {
    assert.match(theme.color, /^#[0-9a-f]{6}$/i);
    assert.match(theme.background, /^#[0-9a-f]{6}$/i);
    assert.match(theme.border, /^#[0-9a-f]{6}$/i);
    assert.doesNotMatch(`${theme.color} ${theme.background}`, /bg-\$\{|text-\$\{/);
  }
  assert.notEqual(getSubjectTheme("Física").color, getSubjectTheme("Matemática").color);
});
