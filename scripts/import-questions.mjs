#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  canonicalizeQuestionTaxonomy,
  hasExamFooter,
  normalizeKey,
} from "./normalize-question-imports.mjs";

const optionKeys = ["A", "B", "C", "D", "E"];
const booleanish = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "sim", "yes"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no"].includes(normalized)) return false;
  return value;
}, z.boolean());
const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalNullableText = z.string().trim().nullable().optional().or(z.literal(""));
const reviewStatuses = ["pending", "approved", "rejected", "needs_review"];
const confidenceLevels = ["baixa", "media", "alta"];
const priorityCategories = [
  "Potencial muito alto de recorrencia do conteudo",
  "Alta prioridade",
  "Prioridade media",
  "Complementar",
];
const taxonomy = JSON.parse(
  fs.readFileSync(
    new URL("../src/lib/questions/taxonomy.json", import.meta.url),
    "utf8"
  )
);
let supabase;

export function isValidTaxonomyEntry(area, subject, topic) {
  const subjects = taxonomy.areas[area];
  if (!subjects) return { ok: false, reason: `Area fora da taxonomia: "${area}".` };
  const topics = subjects[subject];
  if (!topics) return { ok: false, reason: `Disciplina fora da taxonomia para ${area}: "${subject}".` };
  if (!topics.some((entry) => entry.topic === topic)) {
    return { ok: false, reason: `Topico fora da taxonomia para ${subject}: "${topic}".` };
  }
  return { ok: true };
}

export async function runCli(argv, root = process.cwd()) {
  const args = parseArgs(argv);

  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));

  if (!args.file) {
    printUsage();
    return 1;
  }

  const filePath = path.resolve(root, args.file);
  const format = args.format || path.extname(filePath).slice(1).toLowerCase();
  const commit = Boolean(args.commit);

  const rawRows = readRows(filePath, format);
  const report = validateRows(rawRows);

  console.log(`Arquivo: ${filePath}`);
  console.log(`Modo: ${commit ? "IMPORTAR" : "PREVIEW"}`);
  console.log(`Validadas: ${report.valid.length}`);
  console.log(`Invalidas: ${report.invalid.length}`);

  if (report.invalid.length) {
    console.log("\nInvalidas:");
    for (const item of report.invalid) {
      console.log(`- linha ${item.index + 1}: ${item.errors.join("; ")}`);
    }
  }

  if (!commit) {
    console.log("\nPreview concluido. Use --commit para importar com service role.");
    return report.invalid.length ? 1 : 0;
  }

  if (report.invalid.length) {
    console.error("\nImportacao cancelada: corrija as questoes invalidas antes de importar.");
    return 1;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para importar.");
    return 1;
  }

  supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const result = await importQuestions(report.valid);
  console.log("\nImportacao concluida:");
  console.log(`- inseridas: ${result.inserted}`);
  console.log(`- duplicadas ignoradas: ${result.duplicates}`);
  return 0;
}

function isCliEntrypoint() {
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--file") parsed.file = values[++index];
    if (value === "--format") parsed.format = values[++index];
    if (value === "--commit") parsed.commit = true;
  }
  return parsed;
}

function printUsage() {
  console.log(`
Uso:
  node scripts/import-questions.mjs --file supabase/examples/questions-import.example.json
  node scripts/import-questions.mjs --file questoes.csv --format csv
  node scripts/import-questions.mjs --file questoes.json --commit

Campos minimos:
  statement, area, subject, topic, difficulty, year, source, source_url,
  exam_name, exam_color, question_number, is_official, is_demo, is_authorial,
  is_inspired, explanation, option_a, option_b, option_c, option_d, option_e,
  correct_option
`);
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function readRows(file, detectedFormat) {
  const content = fs.readFileSync(file, "utf8");
  if (detectedFormat === "json") {
    const parsed = JSON.parse(content);
    const rows = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(rows)) {
      throw new Error("JSON precisa ser um array ou um objeto com a chave questions.");
    }
    return rows;
  }
  if (detectedFormat === "csv") {
    return parseCsv(content);
  }
  throw new Error("Formato nao suportado. Use json ou csv.");
}

function parseCsv(content) {
  const rows = [];
  const lines = content.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines.shift() || "");
  for (const line of lines) {
    const values = splitCsvLine(line);
    rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  }
  return rows;
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current);
  return values.map((value) => value.trim());
}

export function getQuestionSchema() {
  return z.object({
    statement: z.string().trim().min(10),
    area: z.string().trim().min(2),
    subject: z.string().trim().min(2),
    topic: z.string().trim().min(2),
    difficulty: z.enum(["Baixa", "Media", "Média", "Alta"]),
    year: z.coerce.number().int().min(1998).max(2100),
    source: z.string().trim().min(3),
    source_url: optionalText,
    exam_name: z.string().trim().min(2).default("ENEM"),
    exam_color: z.string().optional().or(z.literal("")),
    question_number: z.coerce.number().int().positive().optional().or(z.literal("")),
    is_official: booleanish,
    is_demo: booleanish,
    is_authorial: booleanish,
    is_inspired: booleanish,
    explanation: z.string().trim().min(10),
    option_a: z.string().trim().min(1),
    option_b: z.string().trim().min(1),
    option_c: z.string().trim().min(1),
    option_d: z.string().trim().min(1),
    option_e: z.string().trim().min(1),
    correct_option: z.enum(["A", "B", "C", "D", "E"]),
    language: z.enum(["en", "es"]).nullable().optional(),
    exam_edition: optionalNullableText,
    exam_day: optionalNullableText,
    discipline: optionalNullableText,
    subtopic: optionalNullableText,
    competence: optionalNullableText,
    skill: optionalNullableText,
    content_recurrence: optionalNullableText,
    charge_pattern: optionalNullableText,
    estimated_priority: z.enum(priorityCategories).default("Complementar"),
    priority_score: z.coerce.number().min(0).max(100).default(0),
    confidence_level: z.enum(confidenceLevels).nullable().optional(),
    priority_reason: optionalNullableText,
    official_source: optionalNullableText,
    official_exam_url: optionalNullableText,
    official_answer_key_url: optionalNullableText,
    priority_is_educational_estimate: booleanish.optional().default(true),
    last_editorial_review_at: optionalNullableText,
    editorial_reviewer: optionalNullableText,
    reviewed: booleanish.optional().default(false),
    review_status: z.enum(reviewStatuses).default("pending"),
    reviewed_by: optionalNullableText,
    reviewed_at: optionalNullableText,
    editorial_notes: optionalNullableText,
    source_verified: booleanish.optional().default(false),
    answer_verified: booleanish.optional().default(false),
    media_verified: booleanish.optional().default(false),
    media_required: booleanish.optional().default(false),
    media_url: optionalNullableText,
    media_type: optionalNullableText,
    media_alt: optionalNullableText,
    media_caption: optionalNullableText,
    source_pdf: optionalNullableText,
    source_page: z.coerce.number().int().positive().optional().or(z.literal("")),
    media_width: z.coerce.number().int().positive().optional().or(z.literal("")),
    media_height: z.coerce.number().int().positive().optional().or(z.literal("")),
    classification_version: z.string().trim().min(2).default("beta-2026-07"),
    recurrence_category: z.enum(priorityCategories).default("Complementar"),
  })
  .superRefine((value, ctx) => {
    const taxonomyCheck = isValidTaxonomyEntry(value.area, value.subject, value.topic);
    if (!taxonomyCheck.ok) {
      ctx.addIssue({ code: "custom", message: taxonomyCheck.reason });
    }
    const kindCount = [value.is_official, value.is_authorial, value.is_inspired].filter(Boolean).length;
    if (kindCount === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Marque a questao como oficial, autoral ou inspirada.",
      });
    }
    if (value.is_official && value.is_inspired) {
      ctx.addIssue({
        code: "custom",
        message: "Questao inspirada nao pode ser marcada como oficial.",
      });
    }
    if (value.is_official && !value.source_url && !value.official_exam_url && !value.official_source) {
      ctx.addIssue({
        code: "custom",
        message: "Questao oficial precisa de source_url, official_exam_url ou official_source.",
      });
    }
    if (
      !value.source_verified ||
      !value.answer_verified ||
      !value.reviewed ||
      value.review_status !== "approved"
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Importacao permite apenas questoes com fonte, gabarito e revisao aprovados.",
      });
    }
    if (value.media_required && !value.media_verified) {
      ctx.addIssue({
        code: "custom",
        message: "Questao com midia precisa de media_verified=true antes da importacao.",
      });
    }
    if (value.media_required && !value.media_url) {
      ctx.addIssue({
        code: "custom",
        message: "Questao com midia obrigatoria precisa de media_url.",
      });
    }
    if (value.media_url && !isValidMediaUrl(value.media_url)) {
      ctx.addIssue({
        code: "custom",
        message: "media_url precisa ser http(s) ou caminho local iniciado por /.",
      });
    }
    if (
      ["Potencial muito alto de recorrencia do conteudo", "Alta prioridade"].includes(
        value.recurrence_category,
      ) &&
      (!value.confidence_level || !value.priority_reason || value.priority_reason.trim().length < 12)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Alta prioridade requer confidence_level e priority_reason revisados.",
      });
    }
  });
}

const structuralContentFields = [
  "statement",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "option_e",
  "explanation",
];
const optionFields = ["option_a", "option_b", "option_c", "option_d", "option_e"];
// Alternativa que termina em conector/verbo de comando (sem fechar frase) e e longa
// demais: assinatura de enunciado empurrado para dentro da opcao pela extracao.
const danglingStemEnding =
  /(\b(é|e|será|deverá|deverá ser|corresponde a|corresponde à|tem como|igual a|próximo de|próxima de|obtida é|utilizada é|em|de|do|da|no|na|pelo|pela|para|por|que|um|uma|o|a|à|ao|aos|às|se)|[,:;])\s*$/iu;

export function detectStructuralIssues(row) {
  const issues = [];

  for (const field of structuralContentFields) {
    const value = row[field];
    if (typeof value !== "string") continue;
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) {
      issues.push(
        `${field}: caracteres de controle ilegiveis — rode scripts/normalize-question-imports.mjs --write antes de importar.`,
      );
    }
    if (hasExamFooter(value)) {
      issues.push(
        `${field}: rodape/cabecalho de caderno no texto — rode scripts/normalize-question-imports.mjs --write antes de importar.`,
      );
    }
  }

  const statement = String(row.statement ?? "").trim();
  // Truncamento/garble real: enunciado vazio, quase vazio, sequencias de setas/traços
  // de OCR, ou sem letras. (Comandos curtos de questoes de texto compartilhado sao validos.)
  if (
    statement.length < 20 ||
    /[—–\->]{6,}|>{4,}/.test(statement) ||
    !/\p{L}/u.test(statement)
  ) {
    issues.push("statement: enunciado vazio/truncado ou corrompido na extracao.");
  }

  const optionLengths = optionFields
    .map((field) => String(row[field] ?? "").trim().length)
    .sort((a, b) => a - b);
  const medianLength = optionLengths[2];
  for (const field of optionFields) {
    const value = String(row[field] ?? "").trim();
    if (!value) continue;
    const oversized = value.length > 160 && value.length > 4 * Math.max(20, medianLength);
    if (oversized && (value.includes("?") || danglingStemEnding.test(value))) {
      issues.push(
        `${field}: alternativa parece conter o enunciado/comando da questao (desalinhamento estrutural).`,
      );
    }
  }

  return issues;
}

export function validateRows(rows) {
  const valid = [];
  const invalid = [];
  const seen = new Set();
  const questionSchema = getQuestionSchema();

  rows.forEach((row, index) => {
    const parsed = questionSchema.safeParse(canonicalizeQuestionTaxonomy(row));
    if (!parsed.success) {
      invalid.push({
        index,
        errors: parsed.error.issues.map((issue) => issue.message),
      });
      return;
    }

    const structuralIssues = detectStructuralIssues(parsed.data);
    if (structuralIssues.length) {
      invalid.push({ index, errors: structuralIssues });
      return;
    }

    const fingerprint = fingerprintQuestion(parsed.data);
    if (seen.has(fingerprint)) {
      invalid.push({ index, errors: ["Questao duplicada dentro do arquivo."] });
      return;
    }
    seen.add(fingerprint);
    valid.push(parsed.data);
  });

  return { valid, invalid };
}

export function fingerprintQuestion(question) {
  return [
    normalize(question.statement),
    question.year,
    normalize(question.source),
    question.question_number || "",
  ].join("|");
}

export function normalize(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

export async function importQuestions(questions) {
  let inserted = 0;
  let duplicates = 0;

  for (const question of questions) {
    const duplicate = await findDuplicate(question);
    if (duplicate) {
      duplicates += 1;
      continue;
    }

    let insertedQuestionId = null;
    try {
      const subject = await upsertSubject(question);
      const topic = await upsertTopic(question, subject.id);
      const { data: insertedQuestion, error: questionError } = await supabase
        .from("questions")
        .insert({
          statement: question.statement,
          subject_id: subject.id,
          topic_id: topic.id,
          difficulty: toDatabaseDifficulty(question.difficulty),
          year: question.year,
          source: question.source,
          source_url: question.source_url || null,
          exam_name: question.exam_name,
          exam_color: question.exam_color || null,
          question_number: question.question_number || null,
          is_official: question.is_official,
          is_demo: question.is_demo,
          is_authorial: question.is_authorial,
          is_inspired: question.is_inspired,
          explanation: question.explanation,
          correct_option: question.correct_option,
          language: question.language || null,
          exam_edition: question.exam_edition || null,
          exam_day: question.exam_day || null,
          discipline: question.discipline || question.subject,
          subtopic: question.subtopic || null,
          competence: question.competence || null,
          skill: question.skill || null,
          content_recurrence: question.content_recurrence || null,
          charge_pattern: question.charge_pattern || null,
          estimated_priority: question.estimated_priority,
          priority_score: question.priority_score,
          confidence_level: question.confidence_level || null,
          priority_reason: question.priority_reason || null,
          official_source: question.official_source || null,
          official_exam_url: question.official_exam_url || null,
          official_answer_key_url: question.official_answer_key_url || null,
          priority_is_educational_estimate: question.priority_is_educational_estimate,
          last_editorial_review_at: question.last_editorial_review_at || null,
          editorial_reviewer: question.editorial_reviewer || null,
          reviewed: question.reviewed,
          review_status: question.review_status,
          reviewed_by: question.reviewed_by || null,
          reviewed_at: question.reviewed_at || null,
          editorial_notes: question.editorial_notes || null,
          source_verified: question.source_verified,
          answer_verified: question.answer_verified,
          media_verified: question.media_verified,
          media_required: question.media_required,
          classification_version: question.classification_version,
          recurrence_category: question.recurrence_category,
        })
        .select("id")
        .single();

      if (questionError) throw new Error(questionError.message);
      insertedQuestionId = insertedQuestion.id;

      const options = optionKeys.map((key) => ({
        question_id: insertedQuestion.id,
        option_key: key,
        option_text: question[`option_${key.toLowerCase()}`],
      }));
      const { error: optionsError } = await supabase.from("question_options").insert(options);
      if (optionsError) throw new Error(optionsError.message);

      if (question.media_url) {
        const { error: mediaError } = await supabase.from("question_media").upsert(
          {
            question_id: insertedQuestion.id,
            media_type: question.media_type || "image",
            url: question.media_url,
            alt_text:
              question.media_alt || `Midia da questao ${question.question_number || ""}`.trim(),
            caption: question.media_caption || question.editorial_notes || null,
            source_pdf: question.source_pdf || question.official_source || null,
            source_page: question.source_page || null,
            width: question.media_width || null,
            height: question.media_height || null,
            verified: question.media_verified,
          },
          { onConflict: "question_id,url" },
        );
        if (mediaError) throw new Error(mediaError.message);
      }

      inserted += 1;
    } catch (error) {
      if (insertedQuestionId) {
        await supabase.from("questions").delete().eq("id", insertedQuestionId);
      }
      throw error;
    }
  }

  return { inserted, duplicates };
}

async function findDuplicate(question) {
  let query = supabase
    .from("questions")
    .select("id, statement, year, source, question_number, question_fingerprint")
    .eq("year", question.year)
    .eq("source", question.source)
    .limit(20);

  if (question.question_number) {
    query = query.eq("question_number", Number(question.question_number));
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).some(
    (item) =>
      item.question_fingerprint === fingerprintQuestion(question) ||
      fingerprintQuestion(item) === fingerprintQuestion(question) ||
      normalize(item.statement) === normalize(question.statement),
  );
}

async function upsertSubject(question) {
  const slug = canonicalSubjectSlug(question.area, question.subject);
  const existing = await findSubjectBySlugOrName(slug, question.area, question.subject);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("subjects")
    .upsert({ name: question.subject, area: question.area, slug }, { onConflict: "slug" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function upsertTopic(question, subjectId) {
  const existing = await findTopicByName(subjectId, question.topic);
  if (existing) return existing;

  const slug = slugify(`${question.area}-${question.subject}-${question.topic}`);
  const { data, error } = await supabase
    .from("topics")
    .upsert(
      {
        subject_id: subjectId,
        name: question.topic,
        slug,
        historical_recurrence: 0,
        priority_weight: question.priority_score || 0,
        difficulty_level: toDatabaseDifficulty(question.difficulty),
        strategic_importance: 0,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function findSubjectBySlugOrName(slug, area, subject) {
  const { data, error } = await supabase
    .from("subjects")
    .select("id,name,area,slug")
    .or(`slug.eq.${slug},name.eq.${subject}`)
    .limit(50);
  if (error) throw new Error(error.message);

  const bySlug = (data ?? []).find((item) => item.slug === slug);
  if (bySlug) return bySlug;

  return (data ?? []).find(
    (item) =>
      normalizeKey(item.area) === normalizeKey(area) &&
      normalizeKey(item.name) === normalizeKey(subject),
  );
}

async function findTopicByName(subjectId, topic) {
  const { data, error } = await supabase
    .from("topics")
    .select("id,name,slug")
    .eq("subject_id", subjectId)
    .limit(200);
  if (error) throw new Error(error.message);

  return (data ?? []).find((item) => normalizeKey(item.name) === normalizeKey(topic));
}

function canonicalSubjectSlug(area, subject) {
  const key = `${normalizeKey(area)}|${normalizeKey(subject)}`;
  const seededSlugs = {
    "matematica|matematica": "matematica",
    "ciencias da natureza|biologia": "biologia",
    "ciencias da natureza|fisica": "fisica",
    "ciencias da natureza|quimica": "quimica",
    "ciencias humanas|geografia": "geografia",
    "ciencias humanas|historia": "historia",
    "ciencias humanas|sociologia": "sociologia",
    "linguagens|linguagens": "linguagens",
    "redacao|redacao": "redacao",
  };
  return seededSlugs[key] ?? slugify(`${area}-${subject}`);
}

function toDatabaseDifficulty(value) {
  return value === "Media" ? "Média" : value;
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidMediaUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

if (isCliEntrypoint()) {
  const exitCode = await runCli(process.argv.slice(2), process.cwd());
  process.exit(exitCode);
}
