#!/usr/bin/env node
/**
 * Publica todo o acervo de supabase/imports/ no banco, em um comando.
 *
 * O acervo não vem por migração: `supabase db reset` recria só o seed.sql, e sem
 * rodar isto o banco fica com as questões demonstrativas apenas. Nasce em
 * pré-visualização; a gravação exige --commit.
 *
 *   node scripts/import-question-bank.mjs                    # confere, não grava
 *   node scripts/import-question-bank.mjs --commit           # grava no banco do .env.local
 *   node scripts/import-question-bank.mjs --env .env.prod --commit
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const importsDir = path.join(root, "supabase", "imports");
const argv = process.argv.slice(2);
const commit = argv.includes("--commit");
const envIndex = argv.indexOf("--env");
const envFile = envIndex >= 0 ? argv[envIndex + 1] : null;

if (envIndex >= 0 && !envFile) {
  console.error("--env exige o caminho de um arquivo. Ex.: --env .env.producao");
  process.exit(1);
}

function carregarEnv(env, envPath, sobrescrever) {
  if (!fs.existsSync(envPath)) return false;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!sobrescrever && env[key]) continue;
    env[key] = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
  }
  return true;
}

// O env é carregado aqui também (e não só no processo filho) para que a linha
// "Banco de destino" mostre o banco real antes de gravar. Confirmar o destino
// pela tela é a única defesa contra publicar no banco errado.
const env = { ...process.env };
if (envFile) {
  const envPath = path.resolve(root, envFile);
  if (!carregarEnv(env, envPath, true)) {
    console.error(`Arquivo de ambiente não encontrado: ${envPath}`);
    process.exit(1);
  }
} else {
  carregarEnv(env, path.join(root, ".env.local"), false);
  carregarEnv(env, path.join(root, ".env"), false);
}

const files = fs
  .readdirSync(importsDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

if (!files.length) {
  console.error(`Nenhum arquivo .json em ${importsDir}.`);
  process.exit(1);
}

// Nunca imprimir o valor: só o destino, para conferir o banco antes de gravar.
const target = env.NEXT_PUBLIC_SUPABASE_URL ?? "(NEXT_PUBLIC_SUPABASE_URL ausente)";
console.log(`Banco de destino: ${target}`);
console.log(`Modo: ${commit ? "GRAVANDO" : "conferência (nada é gravado)"}`);
console.log(`Arquivos: ${files.length}`);
console.log("");

let inseridas = 0;
let duplicadas = 0;
let invalidas = 0;
let falhou = false;

for (const file of files) {
  const args = ["scripts/import-questions.mjs", "--file", path.join("supabase", "imports", file)];
  if (commit) args.push("--commit");

  const saida = await new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: root, env });
    let buffer = "";
    child.stdout.on("data", (chunk) => (buffer += chunk));
    child.stderr.on("data", (chunk) => (buffer += chunk));
    child.on("close", (code) => resolve({ code, buffer }));
  });

  const numero = (label) => Number(saida.buffer.match(new RegExp(`${label}:\\s*(\\d+)`))?.[1] ?? 0);
  const arquivoInvalidas = numero("Invalidas");
  const arquivoInseridas = numero("inseridas");
  const arquivoDuplicadas = numero("duplicadas ignoradas");

  invalidas += arquivoInvalidas;
  inseridas += arquivoInseridas;
  duplicadas += arquivoDuplicadas;

  if (saida.code !== 0) {
    falhou = true;
    console.error(`✗ ${file}`);
    console.error(saida.buffer.trim());
    continue;
  }

  const detalhe = commit
    ? `inseridas ${arquivoInseridas}, já existentes ${arquivoDuplicadas}`
    : `validadas ${numero("Validadas")}, inválidas ${arquivoInvalidas}`;
  console.log(`✓ ${file} — ${detalhe}`);
}

console.log("");
if (commit) {
  console.log(`Total inserido: ${inseridas} | já existentes: ${duplicadas}`);
} else {
  console.log(`Total inválidas: ${invalidas}`);
  console.log("Nada foi gravado. Repita com --commit para publicar no banco.");
}

process.exit(falhou ? 1 : 0);
