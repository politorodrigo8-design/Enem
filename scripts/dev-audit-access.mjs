#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = parseArgs(process.argv.slice(2));
const root = process.cwd();

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

if (!args.email) {
  console.error("Uso: node scripts/dev-audit-access.mjs --email auditoria.local@example.com --role admin");
  process.exit(1);
}

const role = args.role || "admin";
if (!["admin", "beta", "paid"].includes(role)) {
  console.error("--role precisa ser admin, beta ou paid.");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente local.");
  process.exit(1);
}

assertLocalSupabaseUrl(supabaseUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const user = await findOrCreateUser(args.email, Boolean(args.create));
const expiresAt = args.expires || "2026-11-30T23:59:59-03:00";

const { error } = await supabase.from("profiles").upsert(
  {
    id: user.id,
    email: user.email || args.email,
    full_name: "Auditoria local NexoENEM",
    access_level: role,
    beta_tester: role === "beta",
    access_expires_at: expiresAt,
  },
  { onConflict: "id" },
);

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log("Acesso local de auditoria atualizado.");
console.log(`- email: ${args.email}`);
console.log(`- role: ${role}`);
console.log(`- user_id: ${user.id}`);
console.log("- senha: nao exibida");

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--email") parsed.email = values[++index];
    if (value === "--role") parsed.role = values[++index];
    if (value === "--expires") parsed.expires = values[++index];
    if (value === "--create") parsed.create = true;
  }
  return parsed;
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function assertLocalSupabaseUrl(value) {
  const host = new URL(value).hostname;
  if (!["localhost", "127.0.0.1", "0.0.0.0"].includes(host)) {
    throw new Error("Este script recusa Supabase remoto. Use apenas o stack local.");
  }
}

async function findOrCreateUser(email, createIfMissing) {
  const existing = await findUserByEmail(email);
  if (existing) return existing;

  if (!createIfMissing) {
    throw new Error("Usuario nao encontrado. Use --create e defina NEXO_AUDIT_PASSWORD.");
  }

  const password = process.env.NEXO_AUDIT_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("NEXO_AUDIT_PASSWORD precisa ter pelo menos 8 caracteres.");
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Auditoria local NexoENEM" },
  });

  if (error) throw new Error(error.message);
  return data.user;
}

async function findUserByEmail(email) {
  let page = 1;
  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(error.message);
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 100) return null;
    page += 1;
  }
  return null;
}
