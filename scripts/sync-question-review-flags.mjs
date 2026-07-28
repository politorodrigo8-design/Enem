#!/usr/bin/env node
/**
 * Sincroniza a flag de revisão das questões já gravadas com o corpus aprovado
 * em supabase/imports/.
 *
 * Existe porque o acervo pode ter sido gravado por um caminho que não define
 * `reviewed`/`review_status`: nesse estado a questão fica invisível para o aluno
 * (o filtro de qualidade exige revisão aprovada) sem nenhum erro aparente.
 * Só marca o que casa, por impressão digital, com uma questão que o próprio
 * corpus declara revisada e aprovada — nunca aprova em massa.
 *
 * Nasce em pré-visualização; gravar exige --commit.
 *
 *   node scripts/sync-question-review-flags.mjs --env .env.producao
 *   node scripts/sync-question-review-flags.mjs --env .env.producao --commit
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fingerprintQuestion } from "./import-questions.mjs";

const root = process.cwd();
const argv = process.argv.slice(2);
const commit = argv.includes("--commit");
const envIndex = argv.indexOf("--env");
const envFile = envIndex >= 0 ? argv[envIndex + 1] : null;

function carregarEnv(envPath, sobrescrever) {
  if (!fs.existsSync(envPath)) return false;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!sobrescrever && process.env[key]) continue;
    process.env[key] = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
  }
  return true;
}

if (envFile) {
  if (!carregarEnv(path.resolve(root, envFile), true)) {
    console.error(`Arquivo de ambiente não encontrado: ${envFile}`);
    process.exit(1);
  }
} else {
  carregarEnv(path.join(root, ".env.local"), false);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Corpus de referência: só entra quem o próprio arquivo declara revisado.
const importsDir = path.join(root, "supabase", "imports");
const aprovadasNoCorpus = new Set();
for (const file of fs.readdirSync(importsDir).filter((f) => f.endsWith(".json"))) {
  const parsed = JSON.parse(fs.readFileSync(path.join(importsDir, file), "utf8"));
  for (const row of Array.isArray(parsed) ? parsed : parsed.questions ?? []) {
    if (row.reviewed === true && row.review_status === "approved") {
      aprovadasNoCorpus.add(fingerprintQuestion(row));
    }
  }
}

const pageSize = 500;
const alvo = [];
let total = 0;
let jaAprovadas = 0;
let foraDoCorpus = 0;
let demonstrativas = 0;

for (let from = 0; ; from += pageSize) {
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, statement, year, source, question_number, exam_name, is_demo, reviewed, review_status, question_fingerprint",
    )
    .range(from, from + pageSize - 1);
  if (error) {
    console.error("Falha ao ler questões:", error.message);
    process.exit(1);
  }
  if (!data?.length) break;

  for (const row of data) {
    total += 1;
    if (row.is_demo) {
      demonstrativas += 1;
      continue;
    }
    if (row.reviewed === true && row.review_status === "approved") {
      jaAprovadas += 1;
      continue;
    }
    const fingerprint = row.question_fingerprint || fingerprintQuestion(row);
    if (aprovadasNoCorpus.has(fingerprint)) alvo.push(row.id);
    else foraDoCorpus += 1;
  }

  if (data.length < pageSize) break;
}

console.log(`Banco de destino: ${url}`);
console.log(`Modo: ${commit ? "GRAVANDO" : "conferência (nada é gravado)"}`);
console.log("");
console.log(`Questões no banco: ${total}`);
console.log(`  demonstrativas (ignoradas): ${demonstrativas}`);
console.log(`  já revisadas e aprovadas: ${jaAprovadas}`);
console.log(`  pendentes que o corpus declara aprovadas: ${alvo.length}`);
console.log(`  pendentes SEM correspondência no corpus (não serão tocadas): ${foraDoCorpus}`);

if (!commit) {
  console.log("");
  console.log("Nada foi gravado. Repita com --commit para sincronizar.");
  process.exit(0);
}

// A lista é gravada ANTES da escrita: é o que permite desfazer exatamente as
// linhas tocadas, já que depois elas deixam de ser identificáveis pelo critério.
const rollbackPath = path.join(root, `.rollback-review-flags-${Date.now()}.json`);
fs.writeFileSync(
  rollbackPath,
  JSON.stringify({ url, geradoEm: new Date().toISOString(), ids: alvo }, null, 2),
);
console.log("");
console.log(`Lista de reversão: ${rollbackPath}`);

let atualizadas = 0;
for (let index = 0; index < alvo.length; index += 200) {
  const lote = alvo.slice(index, index + 200);
  const { error } = await supabase
    .from("questions")
    .update({ reviewed: true, review_status: "approved" })
    .in("id", lote);
  if (error) {
    console.error("Falha ao atualizar lote:", error.message);
    process.exit(1);
  }
  atualizadas += lote.length;
}

console.log("");
console.log(`Sincronizadas: ${atualizadas}`);
