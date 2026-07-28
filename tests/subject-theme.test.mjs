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

test("nenhum tema usa violet/purple, proibidos pelo DESIGN.md", () => {
  // Escalas violet e purple do Tailwind (400-800), banidas como cor no produto.
  const banned =
    /#(?:a78bfa|8b5cf6|7c3aed|6d28d9|5b21b6|c084fc|a855f7|9333ea|7e22ce|6b21a8)/i;
  for (const theme of Object.values(subjectThemes)) {
    for (const token of [theme.color, theme.background, theme.text, theme.border, theme.accent]) {
      assert.doesNotMatch(String(token), banned);
    }
  }
});
