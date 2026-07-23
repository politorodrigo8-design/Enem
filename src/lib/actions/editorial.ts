"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ActionResult } from "@/lib/actions/auth";
import { logServerError, publicDatabaseErrorMessage } from "@/lib/security/public-errors";
import {
  canEditEditorial,
  firstEditorialValidationMessage,
  normalizeDifficulty,
} from "@/lib/editorial/rules.mjs";

const optionSchema = z.object({
  id: z.string().uuid().optional(),
  option_key: z.enum(["A", "B", "C", "D", "E"]),
  option_text: z.string().trim().min(1),
}).strict();

const editorialQuestionSchema = z.object({
  id: z.string().uuid(),
  statement: z.string().trim().min(10),
  explanation: z.string().trim().min(10),
  difficulty: z.enum(["Baixa", "Média", "Media", "Alta"]),
  review_status: z.enum(["pending", "approved", "rejected", "needs_review"]),
  reviewed: z.boolean(),
  source_verified: z.boolean(),
  answer_verified: z.boolean(),
  media_verified: z.boolean(),
  media_required: z.boolean(),
  topic: z.string().trim().min(2),
  subject: z.string().trim().min(2),
  area: z.string().trim().min(2),
  discipline: z.string().trim().optional(),
  subtopic: z.string().trim().optional(),
  correct_option: z.enum(["A", "B", "C", "D", "E"]),
  editorial_notes: z.string().trim().optional(),
  classification_version: z.string().trim().min(2),
  options: z.array(optionSchema).length(5),
}).strict();

export type EditorialQuestionInput = z.infer<typeof editorialQuestionSchema>;

type AdminQueryResult = {
  data: Record<string, unknown> | Record<string, unknown>[] | null;
  error: { message: string } | null;
};

type AdminSingleQueryResult = {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
};

type AdminQuery = {
  upsert: (values: Record<string, unknown>, options?: Record<string, string>) => AdminQuery;
  insert: (values: Record<string, unknown>) => AdminQuery;
  update: (values: Record<string, unknown>) => AdminQuery;
  select: (columns: string) => AdminQuery;
  eq: (column: string, value: unknown) => AdminQuery;
  single: () => Promise<AdminSingleQueryResult>;
  maybeSingle: () => Promise<AdminSingleQueryResult>;
  then: Promise<AdminQueryResult>["then"];
};

type AdminWriter = {
  from: (table: string) => AdminQuery;
};

function editorialError(scope: string, error: unknown, fallback = "Não foi possível salvar agora.") {
  logServerError(scope, error);
  return { ok: false, message: publicDatabaseErrorMessage(error, fallback) };
}

async function requireAdminEditor(): Promise<{ user: { id: string } } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("access_level")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logServerError("editorial.requireAdminEditor.profile", error, { userId: user.id });
    return { error: publicDatabaseErrorMessage(error) };
  }
  if (!canEditEditorial(profile?.access_level)) {
    return { error: "Apenas administradores podem editar questões." };
  }

  if (!isSupabaseAdminConfigured()) {
    return { error: "Configure SUPABASE_SERVICE_ROLE_KEY para salvar edições editoriais." };
  }

  return { user };
}

export async function updateEditorialQuestionAction(
  input: EditorialQuestionInput,
): Promise<ActionResult> {
  const adminContext = await requireAdminEditor();
  if ("error" in adminContext) return { ok: false, message: adminContext.error };

  const parsed = editorialQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const value = parsed.data;
  if (
    value.review_status === "approved" &&
    (!value.reviewed || !value.source_verified || !value.answer_verified)
  ) {
    return {
      ok: false,
      message: "Aprovação exige reviewed, source_verified e answer_verified.",
    };
  }

  const admin = createAdminClient() as unknown as AdminWriter;

  const { data: mediaRows, error: mediaError } = await admin
    .from("question_media")
    .select("id, url, verified")
    .eq("question_id", value.id);

  if (mediaError) return editorialError("editorial.media.select", mediaError);

  const mediaRecords = Array.isArray(mediaRows) ? mediaRows : [];
  const validationMessage = firstEditorialValidationMessage(value, mediaRecords);
  if (validationMessage) return { ok: false, message: validationMessage };

  const subjectSlug = slugify(`${value.area}-${value.subject}`);
  const topicSlug = slugify(`${value.area}-${value.subject}-${value.topic}`);

  const { data: subject, error: subjectError } = await admin
    .from("subjects")
    .upsert(
      { area: value.area, name: value.subject, slug: subjectSlug },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (subjectError || !subject) {
    return editorialError(
      "editorial.subject.upsert",
      subjectError,
      "Não foi possível salvar disciplina.",
    );
  }
  const subjectId = String(subject.id);

  // Não usar upsert por slug: em conflito o PostgREST faria UPDATE de todas as
  // colunas enviadas, zerando historical_recurrence/priority_weight/strategic_importance
  // (curadoria) de um tópico já existente e corrompendo o priority_score de todos.
  // Só inserimos quando o tópico ainda não existe.
  const { data: existingTopic, error: existingTopicError } = await admin
    .from("topics")
    .select("id")
    .eq("slug", topicSlug)
    .maybeSingle();

  if (existingTopicError) {
    return editorialError("editorial.topic.select", existingTopicError);
  }

  let topicId: string;
  if (existingTopic) {
    topicId = String(existingTopic.id);
  } else {
    const { data: topic, error: topicError } = await admin
      .from("topics")
      .insert({
        subject_id: subjectId,
        name: value.topic,
        slug: topicSlug,
        historical_recurrence: 0,
        priority_weight: 0,
        difficulty_level: normalizeDifficulty(value.difficulty),
        strategic_importance: 0,
      })
      .select("id")
      .single();

    if (topicError || !topic) {
      return editorialError(
        "editorial.topic.insert",
        topicError,
        "Não foi possível salvar tópico.",
      );
    }
    topicId = String(topic.id);
  }

  const now = new Date().toISOString();
  const { error: questionError } = await admin
    .from("questions")
    .update({
      statement: value.statement,
      explanation: value.explanation,
      difficulty: normalizeDifficulty(value.difficulty),
      subject_id: subjectId,
      topic_id: topicId,
      discipline: value.discipline || value.subject,
      subtopic: value.subtopic || null,
      correct_option: value.correct_option,
      review_status: value.review_status,
      reviewed: value.reviewed,
      source_verified: value.source_verified,
      answer_verified: value.answer_verified,
      media_verified: value.media_verified,
      media_required: value.media_required,
      editorial_notes: value.editorial_notes || null,
      classification_version: value.classification_version,
      reviewed_by: value.reviewed ? "admin-editor" : null,
      reviewed_at: value.reviewed ? now : null,
      last_editorial_review_at: now,
      editorial_reviewer: "admin-editor",
    })
    .eq("id", value.id);

  if (questionError) return editorialError("editorial.question.update", questionError);

  for (const option of value.options) {
    const { error } = await admin
      .from("question_options")
      .update({ option_text: option.option_text })
      .eq("question_id", value.id)
      .eq("option_key", option.option_key);

    if (error) return editorialError("editorial.option.update", error);
  }

  revalidatePath("/dashboard/editorial");
  revalidatePath("/dashboard/praticar");
  return { ok: true, message: "Questão salva com sucesso." };
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
