import test from "node:test";
import assert from "node:assert/strict";
import { calculateStudyStreak } from "../src/lib/study/streak.mjs";

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
