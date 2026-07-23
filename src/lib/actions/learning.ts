"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { accessRequiredMessage, getAccessContext } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { diagnosisSchema, type DiagnosisInput } from "@/lib/schemas/diagnosis";
import { recalculateDiagnosisPriorities } from "@/lib/db/diagnosis";
import { addDaysISO, calculatePriorityScore, getWeekStart } from "@/lib/db/scoring";
import {
  getFallbackQuestionWithAnswer,
  isFallbackQuestionId,
  isFallbackSimulationId,
  scoreFallbackSimulation,
} from "@/lib/db/fallback-content";
import type { ActionResult } from "@/lib/actions/auth";
import type { AccessContext } from "@/lib/access";
import type { Profile } from "@/lib/db/types";
import { recordProductEvent } from "@/lib/services/product-events";
import { logServerError, publicDatabaseErrorMessage } from "@/lib/security/public-errors";
import { appDateISO, formatAppDateTime } from "@/lib/dates";
import { parseSelectedWeekdays, weekdayOffsetFromMonday } from "@/lib/weekdays";
import {
  buildQuestionAnswerRecord,
  nextReviewToggle,
} from "@/lib/questions/rules.mjs";
import {
  buildShortQuestionFeedback,
  normalizePracticeQuestionIds,
} from "@/lib/practice-session/rules.mjs";
import { isStudentReadyQuestion } from "@/lib/questions/quality";
import { calculateSimulationDurationMinutes } from "@/lib/simulations/rules";

type UserContext =
  | { error: string }
  | { supabase: SupabaseClient; user: User; profile: Profile | null; access: AccessContext };

type SimulationAnswerQuestion = Parameters<typeof isStudentReadyQuestion>[0] & {
  correct_option: string;
};

type PracticeSessionInput = {
  id?: string;
  focusMode: string;
  sessionSize: string;
  filters: Record<string, string>;
  questionIds: string[];
  currentIndex: number;
  startedAt: string;
};

type PracticeSessionMutationResult =
  | { ok: true; id: string | null }
  | { ok: false; message: string };

type PracticeSessionStatsResult =
  | { ok: true; answered: number; correct: number; wrong: number }
  | { ok: false; message: string };

async function getUserContext(): Promise<UserContext> {
  if (!isSupabaseConfigured()) {
    return { error: "Configure o Supabase para salvar dados reais." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const access = getAccessContext((profile as Profile | null) ?? null);
  if (!access.hasPlatformAccess) {
    return {
      error: access.expired ? "Seu acesso ao Pontua Enem expirou." : accessRequiredMessage(),
    };
  }

  return {
    supabase,
    user,
    profile: (profile as Profile | null) ?? null,
    access,
  };
}

function learningError(scope: string, error: unknown, fallback = "Não foi possível salvar agora.") {
  logServerError(scope, error);
  return { ok: false, message: publicDatabaseErrorMessage(error, fallback) };
}

function practiceSessionMutationError(
  scope: string,
  error: unknown,
): PracticeSessionMutationResult {
  const result = learningError(scope, error);
  return { ok: false, message: result.message };
}

function practiceSessionStatsError(
  scope: string,
  error: unknown,
): PracticeSessionStatsResult {
  const result = learningError(scope, error);
  return { ok: false, message: result.message };
}

export async function saveDiagnosisAction(
  input: DiagnosisInput,
): Promise<ActionResult> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };

  const parsed = diagnosisSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = context;
  const { error } = await supabase
    .from("profiles")
    .update({
      target_course: parsed.data.target_course,
      target_university: parsed.data.target_university,
      target_score: parsed.data.target_score,
      previous_score: parsed.data.previous_score ?? null,
      weekly_hours: parsed.data.weekly_hours,
      available_days: parsed.data.available_days,
      perceived_difficulties: parsed.data.perceived_difficulties,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) return learningError("learning.getUserContext", error);

  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName: "diagnosis_completed",
    route: "/dashboard/diagnostico",
    metadata: {
      target_score: parsed.data.target_score,
      weekly_hours: parsed.data.weekly_hours,
    },
  });

  await recalculateDiagnosisPriorities(
    supabase,
    user.id,
    parsed.data.perceived_difficulties,
  );

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Diagnóstico atualizado e prioridades recalculadas." };
}

export async function submitQuestionAnswerAction(input: {
  questionId: string;
  selectedOption: string;
  responseTimeSeconds?: number;
  source?: "question_bank" | "review" | "high_priority";
  practiceSession?: PracticeSessionInput;
}): Promise<
  ActionResult & {
    isCorrect?: boolean;
    explanation?: string;
    correctOption?: string;
    practiceSessionId?: string;
  }
> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };

  const { supabase, user } = context;

  if (isFallbackQuestionId(input.questionId)) {
    const question = getFallbackQuestionWithAnswer(input.questionId);
    if (!question) {
      return { ok: false, message: "Questão não encontrada no acervo local." };
    }

    const { result } = buildQuestionAnswerRecord({
      userId: user.id,
      question,
      selectedOption: input.selectedOption,
      responseTimeSeconds: input.responseTimeSeconds,
    });

    await recordProductEvent({
      supabase,
      userId: user.id,
      eventName:
        input.source === "high_priority"
          ? "high_priority_question_completed"
          : "question_answered",
      route:
        input.source === "high_priority"
          ? "/dashboard/praticar?tab=banco&focus=priority"
          : "/dashboard/praticar?tab=banco",
      metadata: {
        question_id: question.id,
        is_correct: result.isCorrect,
        source: "fallback_official_import",
      },
    });

    return {
      ok: true,
      message: result.isCorrect ? "Resposta correta." : "Resposta registrada para revisão.",
      isCorrect: result.isCorrect,
      explanation: buildShortQuestionFeedback({
        isCorrect: result.isCorrect,
        correctOption: question.correct_option,
        explanation: result.explanation,
      }),
      correctOption: question.correct_option,
    };
  }

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select(
      "id, topic_id, correct_option, explanation, is_demo, reviewed, review_status, source_verified, answer_verified, media_required, statement, topics (*), question_options (option_key, option_text), question_media (url)",
    )
    .eq("id", input.questionId)
    .single();

  if (questionError || !question) {
    if (questionError) logServerError("learning.submitQuestionAnswer.question", questionError);
    return { ok: false, message: "Questão não encontrada." };
  }

  if (!isStudentReadyQuestion(question)) {
    return {
      ok: false,
      message: "Esta questão ainda está em revisão editorial e não pode ser respondida.",
    };
  }

  const { row, result } = buildQuestionAnswerRecord({
    userId: user.id,
    question,
    selectedOption: input.selectedOption,
    responseTimeSeconds: input.responseTimeSeconds,
  });

  const practiceSessionResult =
    input.practiceSession && input.source !== "review"
      ? await ensurePracticeSession({
          supabase,
          userId: user.id,
          source: input.source ?? "question_bank",
          snapshot: input.practiceSession,
        })
      : { ok: true as const, id: null };
  if (!practiceSessionResult.ok) return practiceSessionResult;

  const answerRow = {
    ...row,
    practice_session_id: practiceSessionResult.id,
  };
  let error: unknown = null;
  if (practiceSessionResult.id) {
    const { data: existing, error: existingError } = await supabase
      .from("user_question_answers")
      .select("id")
      .eq("user_id", user.id)
      .eq("practice_session_id", practiceSessionResult.id)
      .eq("question_id", question.id)
      .maybeSingle();

    if (existingError) {
      error = existingError;
    } else if (existing) {
      const { error: updateError } = await supabase
        .from("user_question_answers")
        .update(answerRow)
        .eq("id", existing.id)
        .eq("user_id", user.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("user_question_answers")
        .insert(answerRow);
      error = insertError;
    }
  } else {
    const { error: insertError } = await supabase.from("user_question_answers").insert(row);
    error = insertError;
  }

  if (error) return learningError("learning.saveDiagnosis", error);

  if (practiceSessionResult.id) {
    await refreshPracticeSessionStats(supabase, user.id, practiceSessionResult.id);
  }

  await refreshTopicPerformance(user.id, question.topic_id);
  await autoCompleteStudyPlanItem(supabase, user.id, question.topic_id);
  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName:
      input.source === "high_priority"
        ? "high_priority_question_completed"
        : "question_answered",
    route:
      input.source === "high_priority"
        ? "/dashboard/praticar?tab=banco&focus=priority"
        : "/dashboard/praticar?tab=banco",
    metadata: {
      question_id: question.id,
      is_correct: result.isCorrect,
    },
  });
  revalidatePath("/dashboard", "layout");

  return {
    ok: true,
    message: result.isCorrect ? "Resposta correta." : "Resposta registrada para revisão.",
    isCorrect: result.isCorrect,
    explanation: buildShortQuestionFeedback({
      isCorrect: result.isCorrect,
      correctOption: question.correct_option,
      explanation: result.explanation,
    }),
    correctOption: question.correct_option,
    practiceSessionId: practiceSessionResult.id ?? undefined,
  };
}

export async function updatePracticeSessionProgressAction(input: {
  practiceSessionId: string;
  currentIndex: number;
}): Promise<ActionResult> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };
  const { supabase, user } = context;
  const { error } = await supabase
    .from("practice_sessions")
    .update({
      current_index: Math.max(0, Math.floor(input.currentIndex) || 0),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.practiceSessionId)
    .eq("user_id", user.id)
    .eq("status", "Em andamento");

  if (error) return learningError("learning.practiceSession.progress", error);
  return { ok: true, message: "Progresso salvo." };
}

async function ensurePracticeSession({
  supabase,
  userId,
  source,
  snapshot,
}: {
  supabase: SupabaseClient;
  userId: string;
  source: "question_bank" | "review" | "high_priority";
  snapshot: PracticeSessionInput;
}): Promise<PracticeSessionMutationResult> {
  const questionIds = normalizePracticeQuestionIds(snapshot.questionIds).filter(
    (questionId) => !isFallbackQuestionId(questionId),
  );
  if (!questionIds.length) return { ok: true, id: null };

  if (snapshot.id) {
    const { data: existing, error } = await supabase
      .from("practice_sessions")
      .select("id, status")
      .eq("id", snapshot.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return practiceSessionMutationError("learning.practiceSession.load", error);
    if (!existing) return { ok: false, message: "SessÃ£o nÃ£o encontrada. Reabra o treino." };
    if (existing.status !== "Em andamento") {
      return { ok: false, message: "Esta sessÃ£o jÃ¡ foi encerrada. Inicie outra." };
    }

    const { error: updateError } = await supabase
      .from("practice_sessions")
      .update(buildPracticeSessionUpdate(snapshot, questionIds))
      .eq("id", existing.id)
      .eq("user_id", userId)
      .eq("status", "Em andamento");
    if (updateError) {
      return practiceSessionMutationError("learning.practiceSession.update", updateError);
    }
    return { ok: true, id: existing.id };
  }

  const { data: active, error: activeError } = await supabase
    .from("practice_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("source", source)
    .eq("status", "Em andamento")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeError) {
    return practiceSessionMutationError("learning.practiceSession.active", activeError);
  }

  if (active) {
    const { error } = await supabase
      .from("practice_sessions")
      .update(buildPracticeSessionUpdate(snapshot, questionIds))
      .eq("id", active.id)
      .eq("user_id", userId)
      .eq("status", "Em andamento");
    if (error) {
      return practiceSessionMutationError("learning.practiceSession.activeUpdate", error);
    }
    return { ok: true, id: active.id };
  }

  const { data: created, error: createError } = await supabase
    .from("practice_sessions")
    .insert({
      user_id: userId,
      source,
      ...buildPracticeSessionUpdate(snapshot, questionIds),
    })
    .select("id")
    .single();

  if (createError || !created) {
    if (createError) {
      const { data: existing } = await supabase
        .from("practice_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("source", source)
        .eq("status", "Em andamento")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return { ok: true, id: existing.id };
    }
    return practiceSessionMutationError("learning.practiceSession.create", createError);
  }

  return { ok: true, id: created.id };
}

function buildPracticeSessionUpdate(
  snapshot: PracticeSessionInput,
  questionIds: string[],
) {
  const startedAt = new Date(snapshot.startedAt);
  return {
    focus_mode: snapshot.focusMode,
    session_size: snapshot.sessionSize,
    filters: snapshot.filters,
    question_ids: questionIds,
    current_index: Math.max(0, Math.floor(snapshot.currentIndex) || 0),
    started_at: Number.isNaN(startedAt.getTime())
      ? new Date().toISOString()
      : startedAt.toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function refreshPracticeSessionStats(
  supabase: SupabaseClient,
  userId: string,
  practiceSessionId: string,
) {
  const stats = await readPracticeSessionAnswerStats({
    supabase,
    userId,
    practiceSessionId,
  });
  if (!stats.ok) return;

  await supabase
    .from("practice_sessions")
    .update({
      answered_count: stats.answered,
      correct_count: stats.correct,
      wrong_count: stats.wrong,
      updated_at: new Date().toISOString(),
    })
    .eq("id", practiceSessionId)
    .eq("user_id", userId)
    .eq("status", "Em andamento");
}

async function readPracticeSessionAnswerStats({
  supabase,
  userId,
  practiceSessionId,
}: {
  supabase: SupabaseClient;
  userId: string;
  practiceSessionId: string;
}): Promise<PracticeSessionStatsResult> {
  const { data: answers, error } = await supabase
    .from("user_question_answers")
    .select("question_id, is_correct")
    .eq("user_id", userId)
    .eq("practice_session_id", practiceSessionId);

  if (error) return practiceSessionStatsError("learning.practiceSession.stats", error);

  const latestQuestionIds = new Set<string>();
  let correct = 0;
  for (const answer of answers ?? []) {
    if (latestQuestionIds.has(answer.question_id)) continue;
    latestQuestionIds.add(answer.question_id);
    if (answer.is_correct) correct += 1;
  }

  return {
    ok: true,
    answered: latestQuestionIds.size,
    correct,
    wrong: latestQuestionIds.size - correct,
  };
}

export async function finishPracticeSessionAction(input: {
  practiceSessionId?: string;
  questionIds: string[];
  startedAt: string;
  source?: "question_bank" | "review" | "high_priority";
}): Promise<
  ActionResult & {
    answered?: number;
    correct?: number;
    wrong?: number;
  }
> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };

  const { supabase, user } = context;
  if (input.practiceSessionId) {
    const { data: session, error: sessionError } = await supabase
      .from("practice_sessions")
      .select("*")
      .eq("id", input.practiceSessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (sessionError) return learningError("learning.finishPracticeSession.session", sessionError);
    if (!session) return { ok: false, message: "SessÃ£o nÃ£o encontrada. Reabra o treino." };

    if (session.status === "Finalizado") {
      return {
        ok: true,
        message: "SessÃ£o jÃ¡ finalizada.",
        answered: session.answered_count,
        correct: session.correct_count,
        wrong: session.wrong_count,
      };
    }

    const stats = await readPracticeSessionAnswerStats({
      supabase,
      userId: user.id,
      practiceSessionId: session.id,
    });
    if (!stats.ok) return stats;
    if (stats.answered === 0) {
      return {
        ok: false,
        message: "Responda pelo menos uma questÃ£o da sessÃ£o antes de finalizar.",
      };
    }

    const finishedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("practice_sessions")
      .update({
        status: "Finalizado",
        finished_at: finishedAt,
        updated_at: finishedAt,
        answered_count: stats.answered,
        correct_count: stats.correct,
        wrong_count: stats.wrong,
      })
      .eq("id", session.id)
      .eq("user_id", user.id)
      .eq("status", "Em andamento")
      .select("id")
      .maybeSingle();

    if (updateError) return learningError("learning.finishPracticeSession.update", updateError);
    if (!updated) {
      return {
        ok: true,
        message: "SessÃ£o jÃ¡ finalizada.",
        answered: stats.answered,
        correct: stats.correct,
        wrong: stats.wrong,
      };
    }

    await recordPracticeSessionCompleted({
      supabase,
      userId: user.id,
      source: input.source ?? session.source,
      questionCount: session.question_ids.length,
      answered: stats.answered,
      correct: stats.correct,
      wrong: stats.wrong,
    });

    revalidatePracticeSessionPaths();

    return {
      ok: true,
      message:
        stats.wrong > 0
          ? "SessÃ£o finalizada. Seus erros jÃ¡ estÃ£o na revisÃ£o."
          : "SessÃ£o finalizada. Seu desempenho foi atualizado.",
      answered: stats.answered,
      correct: stats.correct,
      wrong: stats.wrong,
    };
  }

  const questionIds = Array.from(
    new Set(
      input.questionIds
        .filter((questionId) => !isFallbackQuestionId(questionId))
        .filter(Boolean),
    ),
  );
  if (!questionIds.length) {
    return { ok: false, message: "Responda pelo menos uma questão da sessão antes de finalizar." };
  }

  const { data: answers, error } = await supabase
    .from("user_question_answers")
    .select("question_id, is_correct, answered_at")
    .eq("user_id", user.id)
    .in("question_id", questionIds);

  if (error) return learningError("learning.finishPracticeSession.answers", error);

  const latestByQuestion = new Map<
    string,
    { question_id: string; is_correct: boolean; answered_at: string }
  >();
  for (const answer of answers ?? []) {
    const current = latestByQuestion.get(answer.question_id);
    if (
      !current ||
      new Date(answer.answered_at).getTime() > new Date(current.answered_at).getTime()
    ) {
      latestByQuestion.set(answer.question_id, answer);
    }
  }

  const finalizedAnswers = Array.from(latestByQuestion.values());
  const answered = finalizedAnswers.length;
  const correct = finalizedAnswers.filter((answer) => answer.is_correct).length;
  const wrong = answered - correct;
  if (answered === 0) {
    return { ok: false, message: "Responda pelo menos uma questÃ£o da sessÃ£o antes de finalizar." };
  }

  await recordPracticeSessionCompleted({
    supabase,
    userId: user.id,
    source: input.source ?? "question_bank",
    questionCount: questionIds.length,
    answered,
    correct,
    wrong,
  });

  revalidatePracticeSessionPaths();

  return {
    ok: true,
    message:
      wrong > 0
        ? "Sessão finalizada. Seus erros já estão na revisão."
        : "Sessão finalizada. Seu desempenho foi atualizado.",
    answered,
    correct,
    wrong,
  };
}

async function recordPracticeSessionCompleted({
  supabase,
  userId,
  source,
  questionCount,
  answered,
  correct,
  wrong,
}: {
  supabase: SupabaseClient;
  userId: string;
  source: "question_bank" | "review" | "high_priority";
  questionCount: number;
  answered: number;
  correct: number;
  wrong: number;
}) {
  await recordProductEvent({
    supabase,
    userId,
    eventName: "practice_session_completed",
    route:
      source === "high_priority"
        ? "/dashboard/praticar?tab=banco&focus=priority"
        : source === "review"
          ? "/dashboard/praticar?tab=revisao"
          : "/dashboard/praticar?tab=banco",
    metadata: {
      question_count: questionCount,
      answered,
      correct_answers: correct,
      wrong_answers: wrong,
      source,
    },
  });
}

function revalidatePracticeSessionPaths() {
  revalidatePath("/dashboard/praticar");
  revalidatePath("/dashboard/revisao");
  revalidatePath("/dashboard/desempenho");
  revalidatePath("/dashboard", "layout");
}

export async function addQuestionReviewAction(questionId: string): Promise<ActionResult> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };
  const { supabase, user } = context;
  const { error } = await supabase.from("user_question_reviews").upsert(
    {
      user_id: user.id,
      question_id: questionId,
      mastered: false,
    },
    { onConflict: "user_id,question_id" },
  );

  if (error) return learningError("learning.answerFallbackQuestion", error);
  revalidatePath("/dashboard/praticar");
  return { ok: true, message: "Questão adicionada à revisão." };
}

export async function toggleQuestionReviewAction(
  questionId: string,
): Promise<ActionResult & { reviewed?: boolean }> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };
  const { supabase, user } = context;

  const { data: existing, error: selectError } = await supabase
    .from("user_question_reviews")
    .select("id")
    .eq("user_id", user.id)
    .eq("question_id", questionId)
    .maybeSingle();

  if (selectError) return learningError("learning.toggleQuestionBookmark.select", selectError);

  const toggle = nextReviewToggle(existing, user.id, questionId);

  if (toggle.operation === "delete") {
    const { error } = await supabase
      .from("user_question_reviews")
      .delete()
      .eq("id", toggle.id)
      .eq("user_id", user.id);

    if (error) return learningError("learning.toggleQuestionBookmark.delete", error);
    revalidatePath("/dashboard/praticar");
    return { ok: true, reviewed: toggle.reviewed, message: toggle.message };
  }

  if (!toggle.row) {
    return { ok: false, message: "Não foi possível marcar a questão para revisão." };
  }

  const { error } = await supabase.from("user_question_reviews").insert(toggle.row);

  if (error) return learningError("learning.toggleQuestionBookmark.insert", error);
  revalidatePath("/dashboard/praticar");
  return { ok: true, reviewed: toggle.reviewed, message: toggle.message };
}

export async function markReviewMasteredAction(questionId: string): Promise<ActionResult> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };
  const { supabase, user } = context;
  const { error } = await supabase
    .from("user_question_reviews")
    .update({ mastered: true })
    .eq("user_id", user.id)
    .eq("question_id", questionId);

  if (error) return learningError("learning.updateReviewToggle", error);
  revalidatePath("/dashboard/praticar");
  return { ok: true, message: "Conteúdo marcado como dominado." };
}

export async function startSimulationAction(simulationId: string): Promise<{
  ok: boolean;
  message: string;
  userSimulationId?: string;
}> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };

  const { supabase, user } = context;
  if (isFallbackSimulationId(simulationId)) {
    return {
      ok: true,
      message: "Simulado iniciado.",
      userSimulationId: `fallback-attempt-${simulationId}`,
    };
  }

  const { data: simulation, error: simulationError } = await supabase
    .from("simulations")
    .select("id, title, status")
    .eq("id", simulationId)
    .single();

  if (simulationError || !simulation) {
    if (simulationError) logServerError("learning.submitSimulationAnswer.simulation", simulationError);
    return { ok: false, message: "Simulado não encontrado." };
  }

  const isDiagnostic = simulation.title.toLowerCase().includes("diagn");
  const { data: simulationQuestionRows, error: simulationQuestionError } = await supabase
    .from("simulation_questions")
    .select(
      "questions (correct_option, is_demo, reviewed, review_status, source_verified, answer_verified, media_required, statement, question_options (option_key, option_text), question_media (url))",
    )
    .eq("simulation_id", simulationId);
  if (simulationQuestionError) {
    return learningError("learning.submitSimulationAnswer.question", simulationQuestionError);
  }
  const totalQuestions =
    simulationQuestionRows?.filter((row) => {
      const question = Array.isArray(row.questions) ? row.questions[0] : row.questions;
      return question && isStudentReadyQuestion(question);
    }).length ?? 0;
  if (totalQuestions === 0) {
    return {
      ok: false,
      message: "Este simulado ainda não tem questões aprovadas para iniciar.",
    };
  }

  const { data: activeAttempt, error: activeAttemptError } = await supabase
    .from("user_simulations")
    .select("id")
    .eq("user_id", user.id)
    .eq("simulation_id", simulationId)
    .eq("status", "Em andamento")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeAttemptError) {
    return learningError("learning.startSimulation.activeAttempt", activeAttemptError);
  }
  if (activeAttempt) {
    return {
      ok: true,
      message: "Simulado em andamento restaurado.",
      userSimulationId: activeAttempt.id,
    };
  }

  const { data, error } = await supabase
    .from("user_simulations")
    .insert({
      user_id: user.id,
      simulation_id: simulationId,
      total_questions: totalQuestions,
      status: "Em andamento",
    })
    .select("id")
    .single();

  if (error) return learningError("learning.submitSimulationAnswer.answer", error);
  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName: "simulation_started",
    route: "/dashboard/simulados",
    metadata: { simulation_id: simulationId, diagnostic: isDiagnostic },
  });
  revalidatePath("/dashboard/simulados");
  return { ok: true, message: "Simulado iniciado.", userSimulationId: data.id };
}

export async function saveSimulationAnswerAction(input: {
  userSimulationId: string;
  questionId: string;
  selectedOption: string;
  responseTimeSeconds?: number;
}): Promise<ActionResult> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };

  const { supabase, user } = context;
  if (
    input.userSimulationId.startsWith("fallback-attempt-") ||
    isFallbackQuestionId(input.questionId)
  ) {
    return { ok: true, message: "Resposta salva nesta sessão." };
  }

  const { attempt, question, error } = await getSimulationAttemptQuestion({
    supabase,
    userId: user.id,
    userSimulationId: input.userSimulationId,
    questionId: input.questionId,
  });
  if (error) return error;

  if (!isStudentReadyQuestion(question)) {
    return {
      ok: false,
      message: "Esta questão ainda está em revisão editorial e não pode ser salva no simulado.",
    };
  }

  const writeResult = await writeSimulationAnswer({
    supabase,
    userSimulationId: attempt.id,
    questionId: input.questionId,
    selectedOption: input.selectedOption,
    correctOption: question.correct_option,
    responseTimeSeconds: input.responseTimeSeconds,
  });
  if (!writeResult.ok) return writeResult;

  return { ok: true, message: "Resposta salva." };
}

export async function finishSimulationAction(
  userSimulationId: string,
  submittedAnswers?: Record<string, string>,
): Promise<
  ActionResult & {
    results?: Array<{ questionId: string; isCorrect: boolean }>;
    correct?: number;
    total?: number;
    percentage?: number;
  }
> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };

  const { supabase, user } = context;
  const { data: simulation, error: simulationError } = await supabase
    .from("user_simulations")
    .select("id, simulation_id, total_questions, correct_answers, score_percentage, status")
    .eq("id", userSimulationId)
    .eq("user_id", user.id)
    .single();

  if (simulationError || !simulation) {
    if (simulationError) logServerError("learning.finishSimulation.simulation", simulationError);
    return { ok: false, message: "Simulado não encontrado." };
  }

  const { data: questionRows, error: questionError } = await supabase
    .from("simulation_questions")
    .select(
      "question_id, questions (topic_id, correct_option, is_demo, reviewed, review_status, source_verified, answer_verified, media_required, statement, question_options (option_key, option_text), question_media (url))",
    )
    .eq("simulation_id", simulation.simulation_id);

  if (questionError) return learningError("learning.finishSimulation.questions", questionError);

  const questionById = new Map<string, SimulationAnswerQuestion & { topic_id?: string }>();
  for (const row of questionRows ?? []) {
    const question = Array.isArray(row.questions) ? row.questions[0] : row.questions;
    if (question && isStudentReadyQuestion(question)) {
      questionById.set(row.question_id as string, question);
    }
  }

  const { data: answers, error: answersError } = await supabase
    .from("user_simulation_answers")
    .select("question_id, selected_option, is_correct")
    .eq("user_simulation_id", userSimulationId);

  if (answersError) return learningError("learning.finishSimulation.answers", answersError);

  const selectedByQuestion = new Map<string, string>();
  for (const answer of answers ?? []) {
    selectedByQuestion.set(answer.question_id, answer.selected_option);
  }

  if (simulation.status === "Finalizado") {
    const storedResults = Array.from(selectedByQuestion.entries())
      .filter(([questionId]) => questionById.has(questionId))
      .map(([questionId, selectedOption]) => ({
        questionId,
        isCorrect: questionById.get(questionId)!.correct_option === selectedOption,
      }));
    const storedCorrect = storedResults.filter((answer) => answer.isCorrect).length;
    const storedTotal = simulation.total_questions || questionById.size || storedResults.length;
    return {
      ok: true,
      message: "Simulado jÃ¡ finalizado.",
      results: storedResults,
      correct: storedCorrect,
      total: storedTotal,
      percentage: storedTotal ? Math.round((storedCorrect / storedTotal) * 100) : 0,
    };
  }

  for (const [questionId, selectedOption] of Object.entries(submittedAnswers ?? {})) {
    const question = questionById.get(questionId);
    if (!question) continue;
    selectedByQuestion.set(questionId, selectedOption);
    const writeResult = await writeSimulationAnswer({
      supabase,
      userSimulationId,
      questionId,
      selectedOption,
      correctOption: question.correct_option,
    });
    if (!writeResult.ok) return writeResult;
  }

  const results = Array.from(selectedByQuestion.entries())
    .filter(([questionId]) => questionById.has(questionId))
    .map(([questionId, selectedOption]) => ({
      questionId,
      isCorrect: questionById.get(questionId)!.correct_option === selectedOption,
    }));

  const answered = results.length;
  const correct = results.filter((answer) => answer.isCorrect).length;
  // Percentual sobre o total de questões do simulado, não sobre as respondidas.
  const totalQuestions = simulation.total_questions || questionById.size || answered;
  const percentage = totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0;
  const { data: finalizedAttempt, error } = await supabase
    .from("user_simulations")
    .update({
      finished_at: new Date().toISOString(),
      correct_answers: correct,
      score_percentage: percentage,
      status: "Finalizado",
    })
    .eq("id", userSimulationId)
    .eq("user_id", user.id)
    .eq("status", "Em andamento")
    .select("id")
    .maybeSingle();

  if (error) return learningError("learning.finishSimulation.update", error);
  if (!finalizedAttempt) {
    return {
      ok: true,
      message: "Simulado jÃ¡ finalizado.",
      results,
      correct,
      total: totalQuestions,
      percentage,
    };
  }

  // Simulado não é uma ilha: as respostas entram no mesmo histórico da
  // prática, alimentando desempenho, revisão de erros e sequência de estudo.
  if (results.length) {
    const answerRows = results.map(({ questionId, isCorrect }) => ({
      user_id: user.id,
      question_id: questionId,
      selected_option: selectedByQuestion.get(questionId) ?? "",
      is_correct: isCorrect,
      response_time_seconds: 0,
    }));
    const { error: logError } = await supabase
      .from("user_question_answers")
      .insert(answerRows);
    if (logError) {
      logServerError("learning.finishSimulation.answerLog", logError);
    } else {
      const topicIds = new Set(
        results
          .map(({ questionId }) => questionById.get(questionId)?.topic_id)
          .filter((topicId): topicId is string => Boolean(topicId)),
      );
      for (const topicId of topicIds) {
        await refreshTopicPerformance(user.id, topicId);
      }
    }
  }

  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName: "simulation_completed",
    route: "/dashboard/simulados",
    metadata: { total_questions: totalQuestions, correct_answers: correct },
  });
  revalidatePath("/dashboard/simulados");
  revalidatePath("/dashboard", "layout");
  return {
    ok: true,
    message: "Simulado finalizado.",
    results,
    correct,
    total: totalQuestions,
    percentage,
  };
}

async function getSimulationAttemptQuestion({
  supabase,
  userId,
  userSimulationId,
  questionId,
}: {
  supabase: SupabaseClient;
  userId: string;
  userSimulationId: string;
  questionId: string;
}): Promise<
  | {
      attempt: { id: string; simulation_id: string; status: string };
      question: SimulationAnswerQuestion;
      error?: never;
    }
  | { attempt?: never; question?: never; error: ActionResult }
> {
  const { data: attempt, error: attemptError } = await supabase
    .from("user_simulations")
    .select("id, simulation_id, status")
    .eq("id", userSimulationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (attemptError) {
    return { error: learningError("learning.saveSimulationAnswer.attempt", attemptError) };
  }

  if (!attempt) {
    return {
      error: {
        ok: false,
        message: "Tentativa de simulado não encontrada. Inicie o simulado novamente.",
      },
    };
  }

  if (attempt.status === "Finalizado") {
    return {
      error: {
        ok: false,
        message: "Este simulado já foi finalizado. Inicie uma nova tentativa.",
      },
    };
  }

  const { data: simulationQuestion, error: questionError } = await supabase
    .from("simulation_questions")
    .select(
      "questions (correct_option, is_demo, reviewed, review_status, source_verified, answer_verified, media_required, statement, question_options (option_key, option_text), question_media (url))",
    )
    .eq("simulation_id", attempt.simulation_id)
    .eq("question_id", questionId)
    .maybeSingle();

  if (questionError) {
    return { error: learningError("learning.saveSimulationAnswer.question", questionError) };
  }

  const question = Array.isArray(simulationQuestion?.questions)
    ? simulationQuestion.questions[0]
    : simulationQuestion?.questions;

  if (!question) {
    return {
      error: {
        ok: false,
        message: "Esta questão não faz parte desta tentativa. Reabra o simulado.",
      },
    };
  }

  return { attempt, question };
}

async function writeSimulationAnswer({
  supabase,
  userSimulationId,
  questionId,
  selectedOption,
  correctOption,
  responseTimeSeconds,
}: {
  supabase: SupabaseClient;
  userSimulationId: string;
  questionId: string;
  selectedOption: string;
  correctOption: string;
  responseTimeSeconds?: number;
}): Promise<ActionResult> {
  const row = {
    user_simulation_id: userSimulationId,
    question_id: questionId,
    selected_option: selectedOption,
    is_correct: correctOption === selectedOption,
    response_time_seconds: responseTimeSeconds ?? 0,
  };

  const { data: existing, error: existingError } = await supabase
    .from("user_simulation_answers")
    .select("id")
    .eq("user_simulation_id", userSimulationId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existingError) return learningError("learning.writeSimulationAnswer.select", existingError);

  if (existing) {
    const { error } = await supabase
      .from("user_simulation_answers")
      .update(row)
      .eq("id", existing.id);
    if (error) return learningError("learning.writeSimulationAnswer.update", error);
    return { ok: true, message: "Resposta salva." };
  }

  const { error } = await supabase.from("user_simulation_answers").insert(row);
  if (error) return learningError("learning.writeSimulationAnswer.insert", error);
  return { ok: true, message: "Resposta salva." };
}

export async function finishFallbackSimulationAction(input: {
  simulationId: string;
  answers: Record<string, string>;
}): Promise<
  ActionResult & {
    results?: Array<{ questionId: string; isCorrect: boolean }>;
    correct?: number;
    total?: number;
    percentage?: number;
  }
> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };

  const result = scoreFallbackSimulation(input.simulationId, input.answers);
  if (!result) {
    return { ok: false, message: "Simulado não encontrado no acervo local." };
  }

  await recordProductEvent({
    supabase: context.supabase,
    userId: context.user.id,
    eventName: "simulation_completed",
    route: "/dashboard/simulados",
    metadata: {
      simulation_id: input.simulationId,
      total_questions: result.total,
      correct_answers: result.correct,
      source: "fallback_official_import",
    },
  });

  return {
    ok: true,
    message: "Simulado finalizado.",
    ...result,
  };
}

const SIMULATION_AREAS = [
  "Matematica",
  "Ciencias da Natureza",
  "Ciencias Humanas",
  "Linguagens",
] as const;

type SimulationArea = (typeof SIMULATION_AREAS)[number];

const SIMULATION_AREA_ALIASES: Record<SimulationArea, string[]> = {
  Matematica: ["Matematica", "Matemática"],
  "Ciencias da Natureza": ["Ciencias da Natureza", "Ciências da Natureza"],
  "Ciencias Humanas": ["Ciencias Humanas", "Ciências Humanas"],
  Linguagens: ["Linguagens"],
};

export type GenerateSimulationCriteria = {
  title?: string;
  areas: string[];
  topics?: string[];
  questionCount: number;
  difficulty?: "Baixa" | "Média" | "Alta" | null;
  prioritizeWeaknesses?: boolean;
  foreignLanguage?: "en" | "es";
};

export async function generateSimulationAction(
  criteria: GenerateSimulationCriteria,
): Promise<{ ok: boolean; message: string; simulationId?: string }> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };
  return createGeneratedSimulation(context.supabase, context.user, criteria);
}

/** Refaz um simulado gerado com um sorteio novo de questões (mesmos critérios). */
export async function regenerateSimulationAction(
  simulationId: string,
): Promise<{ ok: boolean; message: string; simulationId?: string }> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };
  const { supabase, user } = context;

  const { data: simulation, error } = await supabase
    .from("simulations")
    .select("id, title, is_generated, created_by, criteria")
    .eq("id", simulationId)
    .single();

  if (error || !simulation) {
    if (error) logServerError("learning.regenerateSimulation.load", error);
    return { ok: false, message: "Simulado não encontrado." };
  }
  if (!simulation.is_generated || simulation.created_by !== user.id) {
    return { ok: false, message: "Este simulado não pode ser refeito com novo sorteio." };
  }

  const stored = (simulation.criteria ?? {}) as Record<string, unknown>;
  return createGeneratedSimulation(supabase, user, {
    title: simulation.title,
    areas: Array.isArray(stored.areas) ? (stored.areas as string[]) : [],
    topics: Array.isArray(stored.topics) ? (stored.topics as string[]) : undefined,
    questionCount: Number(stored.question_count) || 30,
    difficulty:
      stored.difficulty === "Baixa" || stored.difficulty === "Média" || stored.difficulty === "Alta"
        ? stored.difficulty
        : null,
    prioritizeWeaknesses: Boolean(stored.prioritize_weaknesses),
    foreignLanguage: stored.foreign_language === "es" ? "es" : "en",
  });
}

async function createGeneratedSimulation(
  supabase: SupabaseClient,
  user: User,
  criteria: GenerateSimulationCriteria,
): Promise<{ ok: boolean; message: string; simulationId?: string }> {
  const areas = Array.from(
    new Set(
      (criteria.areas ?? [])
        .map(normalizeSimulationArea)
        .filter((area): area is SimulationArea => Boolean(area)),
    ),
  );
  if (!areas.length) {
    return { ok: false, message: "Escolha pelo menos uma área da prova." };
  }
  const questionCount = Math.floor(criteria.questionCount);
  if (!Number.isFinite(questionCount) || questionCount < 5 || questionCount > 90) {
    return { ok: false, message: "O simulado precisa ter entre 5 e 90 questões." };
  }
  const foreignLanguage = criteria.foreignLanguage === "es" ? "es" : "en";
  const queryAreas = Array.from(
    new Set(areas.flatMap((area) => SIMULATION_AREA_ALIASES[area])),
  );

  let query = supabase
    .from("questions")
    .select(
      "id, topic_id, difficulty, language, is_demo, reviewed, review_status, source_verified, answer_verified, media_required, statement, correct_option, subjects!inner(area), topics(name), question_options(option_key, option_text), question_media(url)",
    )
    .in("subjects.area", queryAreas)
    .or(`language.is.null,language.eq.${foreignLanguage}`);
  if (criteria.difficulty) {
    query = query.eq("difficulty", criteria.difficulty);
  }
  if (criteria.topics?.length) {
    query = query.in("topics.name", criteria.topics);
  }
  const { data: rawCandidates, error: candidatesError } = await query.limit(2000);
  if (candidatesError) return learningError("learning.generateSimulation.candidates", candidatesError);
  const candidates = (rawCandidates ?? []).filter(isStudentReadyQuestion);
  if (candidates.length < questionCount) {
    return {
      ok: false,
      message: `O banco tem ${candidates?.length ?? 0} questões para esses filtros; reduza a quantidade ou amplie os critérios.`,
    };
  }

  let weaknessByTopic = new Map<string, number>();
  if (criteria.prioritizeWeaknesses) {
    const { data: performance } = await supabase
      .from("user_topic_performance")
      .select("topic_id, priority_score")
      .eq("user_id", user.id);
    weaknessByTopic = new Map(
      (performance ?? []).map((row) => [row.topic_id as string, Number(row.priority_score) || 0]),
    );
  }

  // Sorteio balanceado: agrupa por tópico e faz round-robin para não concentrar
  // o simulado em um único assunto; com prioridade, tópicos mais fracos vêm antes.
  const byTopic = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const key = (candidate.topic_id as string) ?? "sem-topico";
    if (!byTopic.has(key)) byTopic.set(key, []);
    byTopic.get(key)!.push(candidate);
  }
  const groups = Array.from(byTopic.entries());
  for (const [, group] of groups) group.sort(() => Math.random() - 0.5);
  groups.sort(([topicA], [topicB]) => {
    if (!criteria.prioritizeWeaknesses) return Math.random() - 0.5;
    return (weaknessByTopic.get(topicB) ?? 0) - (weaknessByTopic.get(topicA) ?? 0);
  });
  const picked: string[] = [];
  let round = 0;
  while (picked.length < questionCount) {
    let addedThisRound = false;
    for (const [, group] of groups) {
      if (picked.length >= questionCount) break;
      const candidate = group[round];
      if (candidate) {
        picked.push(candidate.id as string);
        addedThisRound = true;
      }
    }
    if (!addedThisRound) break;
    round += 1;
  }
  if (picked.length < questionCount) {
    return { ok: false, message: "Não foi possível montar o simulado com os filtros atuais." };
  }

  const title =
    criteria.title?.trim() ||
    `Simulado personalizado — ${formatAppDateTime(new Date(), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })}`;
  const { data: simulation, error: simulationError } = await supabase
    .from("simulations")
    .insert({
      title,
      description: `Gerado a partir do banco de questões (${areas.join(", ")}).`,
      duration_minutes: calculateSimulationDurationMinutes(questionCount),
      difficulty: criteria.difficulty ?? "Média",
      status: "Disponível",
      created_by: user.id,
      is_generated: true,
      criteria: {
        areas,
        topics: criteria.topics ?? null,
        question_count: questionCount,
        difficulty: criteria.difficulty ?? null,
        prioritize_weaknesses: Boolean(criteria.prioritizeWeaknesses),
        foreign_language: foreignLanguage,
      },
    })
    .select("id")
    .single();
  if (simulationError || !simulation) {
    if (simulationError) logServerError("learning.generateSimulation.create", simulationError);
    return { ok: false, message: "Falha ao criar o simulado." };
  }

  const { error: questionsError } = await supabase.from("simulation_questions").insert(
    picked.map((questionId, index) => ({
      simulation_id: simulation.id,
      question_id: questionId,
      position: index + 1,
    })),
  );
  if (questionsError) {
    await supabase.from("simulations").delete().eq("id", simulation.id);
    return learningError("learning.generateSimulation.questions", questionsError);
  }

  revalidatePath("/dashboard/simulados");
  return {
    ok: true,
    message: `Simulado montado com ${picked.length} questões do banco.`,
    simulationId: simulation.id,
  };
}

export async function generateStudyPlanAction(): Promise<ActionResult> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };
  const { supabase, user } = context;
  const weekStart = getWeekStart();
  await supabase
    .from("study_plans")
    .update({ status: "Arquivado" })
    .eq("user_id", user.id)
    .eq("week_start", weekStart);

  const { data: profile } = await supabase
    .from("profiles")
    .select("weekly_hours, available_days")
    .eq("id", user.id)
    .single();
  const { data: performances } = await supabase
    .from("user_topic_performance")
    .select("*, topics (*)")
    .eq("user_id", user.id)
    .order("priority_score", { ascending: false })
    .limit(7);
  const { data: fallbackTopics } = await supabase
    .from("topics")
    .select("*")
    .order("historical_recurrence", { ascending: false })
    .limit(7);

  const topics =
    performances?.length
      ? performances.map((item) => item.topics as { id: string })
      : fallbackTopics ?? [];

  const { data: plan, error: planError } = await supabase
    .from("study_plans")
    .insert({ user_id: user.id, week_start: weekStart, status: "Ativo" })
    .select("id")
    .single();

  if (planError || !plan) {
    if (planError) logServerError("learning.generateStudyPlan.create", planError);
    return { ok: false, message: "Não foi possível criar o plano." };
  }

  const parsedDays = parseSelectedWeekdays(profile?.available_days);
  const availableDays = parsedDays.length
    ? parsedDays
    : (["Segunda-feira", "Quarta-feira", "Sexta-feira"] as const);
  const weeklyHours = profile?.weekly_hours ?? 7;
  // Sessão diária de questões entre 25 e 120 min — o restante da rotina do
  // aluno (aulas, resumos) acontece fora do app e não entra na conta.
  const duration = Math.min(
    120,
    Math.max(25, Math.round((weeklyHours * 60) / availableDays.length)),
  );
  const questionGoal = Math.min(25, Math.max(8, Math.round(duration / 4)));

  const items = topics.slice(0, availableDays.length).map((topic, index) => {
    const day = availableDays[index];
    const offset = weekdayOffsetFromMonday(day) ?? index;
    return {
      study_plan_id: plan.id,
      topic_id: topic.id,
      scheduled_date: addDaysISO(weekStart, offset),
      duration_minutes: duration,
      question_goal: questionGoal,
    };
  });

  if (items.length) {
    const { error } = await supabase.from("study_plan_items").insert(items);
    if (error) return learningError("learning.generateStudyPlan.items", error);
  }

  revalidatePath("/dashboard");
  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName: "study_plan_generated",
    route: "/dashboard",
    metadata: { item_count: items.length },
  });
  return { ok: true, message: "Plano da semana gerado." };
}

export async function completeStudyPlanItemAction(itemId: string): Promise<ActionResult> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };
  const { supabase, user } = context;
  const { error } = await supabase
    .from("study_plan_items")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) return learningError("learning.generateStudyPlan.plan", error);
  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName: "study_plan_item_completed",
    route: "/dashboard",
    metadata: { item_id: itemId },
  });
  revalidatePath("/dashboard");
  return { ok: true, message: "Atividade concluída." };
}

// Fecha o loop plano → prática: quando a meta de questões do assunto agendado
// para hoje é atingida, a atividade do plano é concluída sem clique manual.
async function autoCompleteStudyPlanItem(
  supabase: SupabaseClient,
  userId: string,
  topicId: string,
) {
  const today = appDateISO();
  const { data: item } = await supabase
    .from("study_plan_items")
    .select("id, question_goal, study_plans!inner(user_id, status)")
    .eq("study_plans.user_id", userId)
    .eq("study_plans.status", "Ativo")
    .eq("topic_id", topicId)
    .eq("scheduled_date", today)
    .eq("completed", false)
    .maybeSingle();
  if (!item) return;

  const { count } = await supabase
    .from("user_question_answers")
    .select("id, questions!inner(topic_id)", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("questions.topic_id", topicId)
    .gte("answered_at", `${today}T00:00:00-03:00`);

  if ((count ?? 0) >= item.question_goal) {
    await supabase
      .from("study_plan_items")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", item.id);
  }
}

async function refreshTopicPerformance(userId: string, topicId: string) {
  const supabase = await createClient();
  const { data: answers, error: answersError } = await supabase
    .from("user_question_answers")
    .select("is_correct, questions!inner(topic_id)")
    .eq("user_id", userId)
    .eq("questions.topic_id", topicId);

  // Não gravar zeros por cima do desempenho real se a leitura falhar.
  if (answersError) {
    console.error("[Pontua Enem] refreshTopicPerformance", answersError.message);
    return;
  }

  const { data: topic } = await supabase
    .from("topics")
    .select("*")
    .eq("id", topicId)
    .single();

  if (!topic) return;

  const totalAnswers = answers?.length ?? 0;
  const correctAnswers = answers?.filter((answer) => answer.is_correct).length ?? 0;
  const accuracy = totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
  const priorityScore = calculatePriorityScore(topic, {
    total_answers: totalAnswers,
    accuracy_percentage: accuracy,
  });

  await supabase.from("user_topic_performance").upsert(
    {
      user_id: userId,
      topic_id: topicId,
      total_answers: totalAnswers,
      correct_answers: correctAnswers,
      accuracy_percentage: accuracy,
      priority_score: priorityScore,
    },
    { onConflict: "user_id,topic_id" },
  );
}

function normalizeSimulationArea(value: string): SimulationArea | null {
  const normalized = value.trim();
  return (
    SIMULATION_AREAS.find((area) =>
      SIMULATION_AREA_ALIASES[area].includes(normalized),
    ) ?? null
  );
}
