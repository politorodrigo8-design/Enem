#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildQuestionAuditReport } from "../src/lib/questions/audit-rules.mjs";

const argv = process.argv.slice(2);
const format = valueAfter("--format") ?? "json";
const envFile = valueAfter("--env");

loadEnv(envFile ? path.resolve(process.cwd(), envFile) : path.join(process.cwd(), ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const questions = [];
const pageSize = 500;

for (let from = 0; ; from += pageSize) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, statement, correct_option, media_required, media_url, source, year, subjects(area,name), topics(name), question_options(option_key, option_text), question_media(url)")
    .range(from, from + pageSize - 1);
  if (error) {
    console.error("Falha ao ler questoes:", error.message);
    process.exit(1);
  }
  questions.push(...(data ?? []));
  if (!data || data.length < pageSize) break;
}

const report = buildQuestionAuditReport(questions);
if (format === "csv") {
  console.log(toCsv(report));
} else {
  console.log(JSON.stringify({ generated_at: new Date().toISOString(), total_questions: questions.length, issue_count: report.length, issues: report }, null, 2));
}

function valueAfter(flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : null;
}

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (process.env[key]) continue;
    process.env[key] = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
  }
}

function toCsv(rows) {
  const headers = ["id", "origin", "year", "area", "subject", "problem", "severity", "confidence", "reason", "recommended_action"];
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
