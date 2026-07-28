#!/usr/bin/env node
/**
 * Diz quantas questões realmente chegam ao aluno, aplicando as mesmas regras de
 * `isStudentReadyQuestion` (src/lib/questions/quality.ts) e informando o motivo
 * de cada descarte.
 *
 * Existe porque acervo quebrado não avisa ninguém: a tela mostra o número que
 * tem como se fosse o certo. Foi assim que um banco com 892 questões acabou
 * servindo 11 (todas pendentes de revisão, sobraram só as demonstrativas).
 *
 *   node scripts/check-question-bank.mjs
 *   node scripts/check-question-bank.mjs --env .env.producao
 *   node scripts/check-question-bank.mjs --minimo 1000   # sai com erro se ficar abaixo
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  cleanQuestionStatement,
  hasOcrResidue,
  optionRefersToImage,
} from "../src/lib/questions/rules.mjs";

const root = process.cwd();
const argv = process.argv.slice(2);
const envIndex = argv.indexOf("--env");
const envFile = envIndex >= 0 ? argv[envIndex + 1] : null;
const minimoIndex = argv.indexOf("--minimo");
const minimo = minimoIndex >= 0 ? Number(argv[minimoIndex + 1]) : null;

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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const requiredOptionKeys = ["A", "B", "C", "D", "E"];
const brokenTextFragments = [
  "[object object]",
  "undefined",
  "lorem ipsum",
  "sem enunciado",
  "alternativa a:",
];

function hasUsableText(value, minLength) {
  const normalized = value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
  if (normalized.length < minLength) return false;
  return !brokenTextFragments.some((fragment) => normalized.includes(fragment));
}

// Espelha isStudentReadyQuestion. Se aquele arquivo mudar, este precisa mudar
// junto — o teste em tests/question-rules.test.mjs trava a regra principal.
function motivoDeDescarte(q) {
  if (q.is_demo) return "demonstrativa (nunca vai para o aluno)";
  if (!q.reviewed || q.review_status !== "approved") return "sem revisão aprovada";
  if (!q.source_verified) return "fonte não verificada";
  if (!q.answer_verified) return "gabarito não verificado";

  const statement = cleanQuestionStatement(q.statement);
  if (!hasUsableText(statement, 40)) return "enunciado curto ou corrompido";
  if (hasOcrResidue(statement)) return "resíduo de digitalização no enunciado";

  const hasMedia = Boolean(q.question_media?.some((m) => m.url));
  const options = (q.question_options ?? []).map((o) => ({
    key: o.option_key.trim().toUpperCase(),
    text: o.option_text.trim(),
  }));
  const keys = new Set(options.map((o) => o.key));
  if (!requiredOptionKeys.every((k) => keys.has(k))) return "falta alternativa de A a E";

  const req = options.filter((o) => requiredOptionKeys.includes(o.key));
  const texts = req.map((o) => o.text.replace(/\s+/g, " ").toLowerCase());
  if (new Set(texts).size !== texts.length) return "alternativas repetidas";
  if (!req.every((o) => hasUsableText(o.text, 2))) return "alternativa vazia";
  if (!hasMedia && req.some((o) => optionRefersToImage(o.text)))
    return "alternativa remete a imagem ausente";
  if (q.media_required && !hasMedia) return "imagem obrigatória ausente";

  const correct = q.correct_option?.trim().toUpperCase();
  if (correct && !keys.has(correct)) return "gabarito fora das alternativas";
  return null;
}

const pageSize = 500;
const descartes = new Map();
let total = 0;
let disponiveis = 0;

for (let from = 0; ; from += pageSize) {
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, statement, correct_option, is_demo, reviewed, review_status, source_verified, answer_verified, media_required, question_options (option_key, option_text), question_media (url)",
    )
    .range(from, from + pageSize - 1);
  if (error) {
    console.error("Falha ao ler questões:", error.message);
    process.exit(1);
  }
  if (!data?.length) break;

  for (const q of data) {
    total += 1;
    const motivo = motivoDeDescarte(q);
    if (!motivo) disponiveis += 1;
    else descartes.set(motivo, (descartes.get(motivo) ?? 0) + 1);
  }
  if (data.length < pageSize) break;
}

console.log(`Banco: ${url}`);
console.log(`Questões cadastradas: ${total}`);
console.log(`Disponíveis para o aluno: ${disponiveis}`);
if (descartes.size) {
  console.log("");
  console.log("Descartadas:");
  for (const [motivo, n] of [...descartes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${motivo}`);
  }
}

if (minimo !== null && Number.isFinite(minimo) && disponiveis < minimo) {
  console.error("");
  console.error(`FALHOU: esperado ao menos ${minimo} questões disponíveis, encontrado ${disponiveis}.`);
  process.exit(1);
}
