#!/usr/bin/env node
/**
 * Push measured recurrence into public.topics.
 *
 * Reads outputs/editorial-work/topics-recurrence.json (produced by
 * scripts/enem-recurrence-report.py) and updates historical_recurrence and
 * strategic_importance so the Radar ranks topics by what the 2020-2025 corpus
 * actually contains instead of the seed defaults.
 *
 *   node scripts/update-topic-recurrence.mjs           # preview
 *   node scripts/update-topic-recurrence.mjs --commit  # apply
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const REPORT = path.join(ROOT, "outputs", "editorial-work", "topics-recurrence.json");

// historical_recurrence is a 0-100 frequency signal; strategic_importance is the
// editorial weight the priority score adds on top.
const TIER_VALUES = {
  alta: { recurrence: 85, importance: 9 },
  media: { recurrence: 60, importance: 6 },
  baixa: { recurrence: 35, importance: 3 },
};

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const at = trimmed.indexOf("=");
    if (at === -1) continue;
    const key = trimmed.slice(0, at).trim();
    const value = trimmed.slice(at + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

const commit = process.argv.includes("--commit");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const report = JSON.parse(fs.readFileSync(REPORT, "utf8"));
const { data: topics, error } = await supabase.from("topics").select("id, name, historical_recurrence, strategic_importance");
if (error) {
  console.error("Falha ao ler topics:", error.message);
  process.exit(1);
}

const byName = new Map(topics.map((topic) => [topic.name, topic]));
let updated = 0;
let missing = 0;

for (const row of report.topics) {
  const topic = byName.get(row.topic);
  if (!topic) {
    missing += 1;
    continue;
  }
  const values = TIER_VALUES[row.measured_tier] ?? TIER_VALUES.baixa;
  if (
    topic.historical_recurrence === values.recurrence &&
    topic.strategic_importance === values.importance
  ) {
    continue;
  }
  console.log(
    `${row.area} / ${row.topic}: ${row.questions} questões em ${row.years.length} ano(s) -> ${row.measured_tier}` +
      ` (recorrência ${topic.historical_recurrence ?? "-"} -> ${values.recurrence})`,
  );
  updated += 1;
  if (commit) {
    const { error: updateError } = await supabase
      .from("topics")
      .update({
        historical_recurrence: values.recurrence,
        strategic_importance: values.importance,
      })
      .eq("id", topic.id);
    if (updateError) {
      console.error(`  falha: ${updateError.message}`);
      process.exit(1);
    }
  }
}

console.log(`\n${commit ? "Atualizados" : "A atualizar"}: ${updated} tópico(s).`);
if (missing) console.log(`${missing} tópico(s) do relatório ainda não existem no banco.`);
