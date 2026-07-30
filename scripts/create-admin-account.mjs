#!/usr/bin/env node
/**
 * Cria (ou promove) uma conta administrativa no Supabase configurado no ambiente.
 *
 * Nasce em dry-run: sem `--apply` nada é escrito, apenas o plano é impresso.
 * O e-mail já nasce confirmado — admin não passa pelo fluxo de verificação por
 * OTP, que existe para o aluno.
 *
 * Uso:
 *   node scripts/create-admin-account.mjs --email admin@exemplo.com            # dry-run
 *   node scripts/create-admin-account.mjs --email admin@exemplo.com --apply    # executa
 *   node scripts/create-admin-account.mjs --email a@b.com --password "..." --apply
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = parseArgs(process.argv.slice(2));
const root = process.cwd();

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

if (!args.email) {
  console.error(
    "Uso: node scripts/create-admin-account.mjs --email admin@exemplo.com [--password ...] [--name ...] [--apply]",
  );
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const apply = Boolean(args.apply);
const email = String(args.email).trim().toLowerCase();
const fullName = args.name ? String(args.name) : "Administração Pontua Enem";
const password = args.password ? String(args.password) : generatePassword();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(apply ? "== EXECUÇÃO REAL ==" : "== DRY-RUN (nada será alterado) ==");
console.log(`Projeto:  ${supabaseUrl}`);
console.log(`E-mail:   ${email}`);
console.log(`Nome:     ${fullName}`);
console.log("");

const existing = await findUserByEmail(email);

if (existing) {
  console.log(`Usuário já existe em auth.users (id ${existing.id}).`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("access_level,access_expires_at,full_name")
    .eq("id", existing.id)
    .maybeSingle();

  console.log(`Perfil atual: access_level=${profile?.access_level ?? "(sem perfil)"}`);
  console.log("");
  console.log("Plano:");
  console.log("  - promover perfil para access_level='admin'");
  console.log("  - remover data de expiração (acesso administrativo não expira)");
  console.log("  - marcar onboarding como concluído (admin não faz wizard de aluno)");
  console.log("  - confirmar e-mail, se ainda não confirmado");
  if (args.password) console.log("  - redefinir a senha para a informada em --password");

  if (!apply) {
    finishDryRun();
  }

  await promoteToAdmin(existing.id);
  console.log("");
  console.log("Conta promovida a administradora.");
  if (args.password) console.log(`Senha redefinida para a informada em --password.`);
  process.exit(0);
}

console.log("Usuário ainda não existe em auth.users.");
console.log("");
console.log("Plano:");
console.log("  - criar usuário com e-mail já confirmado");
console.log("  - aguardar o trigger handle_new_user criar o perfil");
console.log("  - promover o perfil para access_level='admin', sem expiração");

if (!apply) {
  console.log("");
  console.log(`Senha que seria gerada: ${password}`);
  finishDryRun();
}

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

if (createError) {
  console.error(`Falha ao criar usuário: ${createError.message}`);
  process.exit(1);
}

const userId = created.user.id;
// O trigger handle_new_user roda na transação do insert em auth.users, mas a
// leitura logo em seguida pode chegar antes da replicação do PostgREST.
await waitForProfile(userId);
await promoteToAdmin(userId);

console.log("");
console.log("Conta administrativa criada com sucesso.");
console.log(`  id:    ${userId}`);
console.log(`  email: ${email}`);
console.log(`  senha: ${password}`);
console.log("");
console.log("Guarde a senha num gerenciador — ela não fica salva em lugar nenhum.");

async function promoteToAdmin(userId) {
  const updates = {
    email,
    full_name: fullName,
    access_level: "admin",
    access_expires_at: null,
    // O middleware manda todo perfil sem onboarding para o wizard de estudo.
    // Conta administrativa não é aluno: preenchê-lo criaria metas e
    // dificuldades fictícias no perfil só para destravar o painel.
    onboarding_completed: true,
  };

  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) {
    console.error(`Falha ao atualizar o perfil: ${error.message}`);
    process.exit(1);
  }

  const attributes = { email_confirm: true };
  if (args.password) attributes.password = password;

  const { error: authError } = await supabase.auth.admin.updateUserById(userId, attributes);
  if (authError) {
    console.error(`Falha ao confirmar e-mail: ${authError.message}`);
    process.exit(1);
  }
}

async function waitForProfile(userId) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (data) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  console.error(
    "Perfil não apareceu após a criação do usuário. Verifique o trigger handle_new_user.",
  );
  process.exit(1);
}

async function findUserByEmail(target) {
  // listUsers pagina de 50 em 50; o projeto ainda é pequeno, mas paginar evita
  // um falso "não existe" quando a base crescer.
  for (let page = 1; page <= 40; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error(`Falha ao listar usuários: ${error.message}`);
      process.exit(1);
    }
    const found = data.users.find((user) => (user.email || "").toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

function finishDryRun() {
  console.log("");
  console.log("Dry-run concluído. Nada foi alterado.");
  console.log("Para executar de verdade, repita o comando com --apply.");
  process.exit(0);
}

function generatePassword() {
  // Sem caracteres ambíguos (0/O, 1/l/I) para a senha poder ser ditada.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@#$%&*?";
  const pick = (set, count) =>
    Array.from({ length: count }, () => set[crypto.randomInt(set.length)]).join("");
  return `${pick(alphabet, 16)}${pick(symbols, 2)}`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
