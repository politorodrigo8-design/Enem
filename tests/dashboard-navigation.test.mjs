import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboardShellSource = fs.readFileSync(
  new URL("../src/components/dashboard/dashboard-shell.tsx", import.meta.url),
  "utf8",
);
const practicePageSource = fs.readFileSync(
  new URL("../src/app/dashboard/praticar/page.tsx", import.meta.url),
  "utf8",
);
const questionsPageSource = fs.readFileSync(
  new URL("../src/app/dashboard/questoes/page.tsx", import.meta.url),
  "utf8",
);

test("menu principal mantem acesso explicito ao banco de questoes", () => {
  assert.match(
    dashboardShellSource,
    /label:\s*"Questões",\s*href:\s*"\/dashboard\/questoes"/,
  );
  assert.match(dashboardShellSource, /"\/dashboard\/praticar"/);
  assert.doesNotMatch(
    dashboardShellSource,
    /label:\s*"Praticar",\s*href:\s*"\/dashboard\/praticar"/,
  );
});

test("rota antiga de questoes leva para a aba do banco", () => {
  assert.match(
    questionsPageSource,
    /redirect\("\/dashboard\/praticar\?tab=banco"\)/,
  );
  assert.match(practicePageSource, /title="Questões"/);
  assert.match(practicePageSource, /Banco de questões verificado/);
});
