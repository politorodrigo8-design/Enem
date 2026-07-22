import test from "node:test";
import assert from "node:assert/strict";
import {
  ESSAY_CREDIT_COST,
  buildEssayStoragePath,
  canConfirmEssaySubmission,
  debitEssayCredits,
  isFinalizedOrConfirmedStatus,
  validateEssayFileBatch,
} from "../src/lib/essays/rules.mjs";

const mb = 1024 * 1024;

test("permite envio com saldo suficiente e debita exatamente 10 creditos", () => {
  assert.equal(ESSAY_CREDIT_COST, 10);
  assert.equal(debitEssayCredits(25), 15);
});

test("bloqueia confirmacao sem saldo", () => {
  assert.equal(
    canConfirmEssaySubmission({ status: "uploading", fileCount: 1, balance: 9 }),
    false,
  );
  assert.throws(() => debitEssayCredits(9), /insufficient credits/);
});

test("aceita multiplas imagens e preserva ordem pelo caminho gerado", () => {
  const result = validateEssayFileBatch([
    { name: "p1.png", type: "image/png", size: 2 * mb },
    { name: "p2.jpg", type: "image/jpeg", size: 2 * mb },
  ]);
  assert.equal(result.ok, true);

  const path = buildEssayStoragePath({
    userId: "11111111-1111-1111-1111-111111111111",
    submissionId: "22222222-2222-2222-2222-222222222222",
    pageOrder: 2,
    randomId: "33333333-3333-3333-3333-333333333333",
    mimeType: "image/jpeg",
  });
  assert.equal(
    path,
    "essays/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/2-33333333-3333-3333-3333-333333333333.jpg",
  );
});

test("aceita PDF valido como arquivo unico", () => {
  assert.equal(
    validateEssayFileBatch([{ name: "redacao.pdf", type: "application/pdf", size: 4 * mb }]).ok,
    true,
  );
});

test("rejeita tipo invalido", () => {
  const result = validateEssayFileBatch([{ name: "script.exe", type: "application/x-msdownload", size: 1000 }]);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /PDF, PNG, JPG ou JPEG/);
});

test("rejeita excesso de tamanho por arquivo e total", () => {
  assert.equal(
    validateEssayFileBatch([{ name: "grande.png", type: "image/png", size: 11 * mb }]).ok,
    false,
  );
  assert.equal(
    validateEssayFileBatch([
      { name: "p1.png", type: "image/png", size: 8 * mb },
      { name: "p2.png", type: "image/png", size: 8 * mb },
      { name: "p3.png", type: "image/png", size: 8 * mb },
      { name: "p4.png", type: "image/png", size: 8 * mb },
    ]).ok,
    false,
  );
});

test("rejeita excesso de arquivos e PDF combinado com imagens", () => {
  const fiveImages = Array.from({ length: 5 }, (_, index) => ({
    name: `p${index + 1}.png`,
    type: "image/png",
    size: mb,
  }));
  assert.equal(validateEssayFileBatch(fiveImages).ok, false);

  assert.equal(
    validateEssayFileBatch([
      { name: "redacao.pdf", type: "application/pdf", size: mb },
      { name: "extra.png", type: "image/png", size: mb },
    ]).ok,
    false,
  );
});

test("duplo clique e repeticao de idempotencia retornam submissao confirmada sem nova cobranca", () => {
  assert.equal(isFinalizedOrConfirmedStatus("pending"), true);
  assert.equal(isFinalizedOrConfirmedStatus("in_review"), true);
  assert.equal(isFinalizedOrConfirmedStatus("completed"), true);
  assert.equal(isFinalizedOrConfirmedStatus("cancelled"), true);
  assert.equal(isFinalizedOrConfirmedStatus("uploading"), false);
});

test("falha no upload e confirmacao incompleta nao podem cobrar definitivamente", () => {
  assert.equal(
    canConfirmEssaySubmission({ status: "upload_failed", fileCount: 1, balance: 50 }),
    false,
  );
  assert.equal(
    canConfirmEssaySubmission({ status: "uploading", fileCount: 0, balance: 50 }),
    false,
  );
});
