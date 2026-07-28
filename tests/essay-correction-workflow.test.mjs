import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminDetailSource = readFileSync(
  new URL(
    "../src/app/dashboard/redacoes/[id]/essay-admin-detail-client.tsx",
    import.meta.url,
  ),
  "utf8",
);
const studentDetailSource = readFileSync(
  new URL("../src/app/dashboard/correcao-redacao/[id]/page.tsx", import.meta.url),
  "utf8",
);
const studentListSource = readFileSync(
  new URL("../src/app/dashboard/correcao-redacao/essay-correction-client.tsx", import.meta.url),
  "utf8",
);
const feedbackViewSource = readFileSync(
  new URL("../src/components/dashboard/essay-feedback-view.tsx", import.meta.url),
  "utf8",
);
const actionsSource = readFileSync(
  new URL("../src/lib/actions/credits.ts", import.meta.url),
  "utf8",
);

test("admin corrige uma submissao assumida com notas e feedback", () => {
  assert.match(adminDetailSource, /<CardTitle>Correção<\/CardTitle>/);
  assert.match(adminDetailSource, /Correção geral/);
  assert.match(adminDetailSource, /Competência 1/);
  assert.match(adminDetailSource, /Competência 5/);
  assert.match(adminDetailSource, /Notas internas/);
  assert.match(adminDetailSource, /Enviar correção/);
  assert.match(adminDetailSource, /essay\.status === "in_review"/);
  assert.match(actionsSource, /essayCompletionSchema/);
  assert.match(actionsSource, /input_competence_1_score/);
  assert.match(actionsSource, /input_general_feedback/);
});

test("aluno ve resultado sem perder suporte a texto online e anexos", () => {
  assert.match(studentDetailSource, /<EssayFeedbackView essay=\{essay\} \/>/);
  assert.match(studentDetailSource, /essay\.delivery_type === "online"/);
  assert.match(studentDetailSource, /Texto digitado/);
  assert.match(studentDetailSource, /<EssayFilesViewer files=\{essay\.essay_submission_files \?\? \[\]\} \/>/);
  assert.match(feedbackViewSource, /Correção recebida/);
  assert.match(feedbackViewSource, /Comentário geral/);
  assert.match(feedbackViewSource, /\/1000/);
  assert.match(feedbackViewSource, /\/200/);
});

test("aviso de correcao pronta e temporario", () => {
  assert.match(studentListSource, /READY_CORRECTION_NOTICE_DURATION_MS/);
  assert.match(studentListSource, /setTimeout/);
  assert.match(studentListSource, /rememberDismissedReadyCorrection/);
  assert.match(studentListSource, /localStorage/);
  assert.match(studentListSource, /readyCorrection && readyCorrectionVisible/);
});
