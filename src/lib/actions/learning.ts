"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { accessRequiredMessage, getAccessContext } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { diagnosisSchema, type DiagnosisInput } from "@/lib/schemas/diagnosis";
import { calculatePriorityScore, getWeekStart } from "@/lib/db/scoring";
import type { ActionResult } from "@/lib/actions/auth";
import type { AccessContext } from "@/lib/access";
import type { Profile } from "@/lib/db/types";
import { recordProductEvent } from "@/lib/services/product-events";
import {
  buildQuestionAnswerRecord,
  nextReviewToggle,
} from "@/lib/questions/rules.mjs";

type UserContext =
  | { error: string }
  | { supabase: SupabaseClient; user: User; profile: Profile | null; access: AccessContext };

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
      error: access.expired ? "Seu acesso ao NexoENEM expirou." : accessRequiredMessage(),
    };
  }

  return {
    supabase,
    user,
    profile: (profile as Profile | null) ?? null,
    access,
  };
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
    })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };

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

  const { data: topics } = await supabase.from("topics").select("*, subjects (*)");
  const upserts =
    topics?.map((topic) => {
      const areaDifficulty = Number(
        parsed.data.perceived_difficulties[
          (topic.subjects as { area: string }).area
        ] ?? 3,
      );
      const score =
        calculatePriorityScore(topic, undefined) + Number((areaDifficulty * 1.2).toFixed(2));

      return {
        user_id: user.id,
        topic_id: topic.id,
        priority_score: score,
      };
    }) ?? [];

  if (upserts.length) {
    await supabase
      .from("user_topic_performance")
      .upsert(upserts, { onConflict: "user_id,topic_id" });
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Diagnóstico salvo e prioridades recalculadas." };
}

export async function submitQuestionAnswerAction(input: {
  questionId: string;
  selectedOption: string;
  responseTimeSeconds?: number;
  source?: "question_bank" | "review" | "high_priority";
}): Promise<ActionResult & { isCorrect?: boolean; explanation?: string }> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };

  const { supabase, user } = context;

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id, topic_id, correct_option, explanation, topics (*)")
    .eq("id", input.questionId)
    .single();

  if (questionError || !question) {
    return { ok: false, message: questionError?.message ?? "Questão não encontrada." };
  }

  const { row, result } = buildQuestionAnswerRecord({
    userId: user.id,
    question,
    selectedOption: input.selectedOption,
    responseTimeSeconds: input.responseTimeSeconds,
  });
  const { error } = await supabase.from("user_question_answers").insert(row);

  if (error) return { ok: false, message: error.message };

  await refreshTopicPerformance(user.id, question.topic_id);
  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName:
      input.source === "high_priority"
        ? "high_priority_question_completed"
        : "question_answered",
    route:
      input.source === "high_priority"
        ? "/dashboard/treino-prioritario"
        : "/dashboard/questoes",
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
    explanation: result.explanation,
  };
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

  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/revisao");
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

  if (selectError) return { ok: false, message: selectError.message };

  const toggle = nextReviewToggle(existing, user.id, questionId);

  if (toggle.operation === "delete") {
    const { error } = await supabase
      .from("user_question_reviews")
      .delete()
      .eq("id", toggle.id)
      .eq("user_id", user.id);

    if (error) return { ok: false, message: error.message };
    revalidatePath("/dashboard/questoes");
    revalidatePath("/dashboard/revisao");
    return { ok: true, reviewed: toggle.reviewed, message: toggle.message };
  }

  if (!toggle.row) {
    return { ok: false, message: "Nao foi possivel montar o favorito da questao." };
  }

  const { error } = await supabase.from("user_question_reviews").insert(toggle.row);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/questoes");
  revalidatePath("/dashboard/revisao");
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

  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/revisao");
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
  const { data: simulation, error: simulationError } = await supabase
    .from("simulations")
    .select("id, title, status")
    .eq("id", simulationId)
    .single();

  if (simulationError || !simulation) {
    return { ok: false, message: simulationError?.message ?? "Simulado não encontrado." };
  }

  const isDiagnostic = simulation.title.toLowerCase().includes("diagn");
  const { count } = await supabase
    .from("simulation_questions")
    .select("*", { count: "exact", head: true })
    .eq("simulation_id", simulationId);

  const { data, error } = await supabase
    .from("user_simulations")
    .insert({
      user_id: user.id,
      simulation_id: simulationId,
      total_questions: count ?? 0,
      status: "Em andamento",
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
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

  const { supabase } = context;
  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("correct_option")
    .eq("id", input.questionId)
    .single();

  if (questionError || !question) {
    return { ok: false, message: questionError?.message ?? "Questão não encontrada." };
  }

  const { error } = await supabase.from("user_simulation_answers").upsert(
    {
      user_simulation_id: input.userSimulationId,
      question_id: input.questionId,
      selected_option: input.selectedOption,
      is_correct: question.correct_option === input.selectedOption,
      response_time_seconds: input.responseTimeSeconds ?? 0,
    },
    { onConflict: "user_simulation_id,question_id" },
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Resposta salva." };
}

export async function finishSimulationAction(
  userSimulationId: string,
): Promise<ActionResult> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };

  const { supabase, user } = context;
  const { data: answers, error: answersError } = await supabase
    .from("user_simulation_answers")
    .select("is_correct")
    .eq("user_simulation_id", userSimulationId);

  if (answersError) return { ok: false, message: answersError.message };

  const total = answers?.length ?? 0;
  const correct = answers?.filter((answer) => answer.is_correct).length ?? 0;
  const percentage = total ? Math.round((correct / total) * 100) : 0;

  const { error } = await supabase
    .from("user_simulations")
    .update({
      finished_at: new Date().toISOString(),
      correct_answers: correct,
      score_percentage: percentage,
      status: "Finalizado",
    })
    .eq("id", userSimulationId);

  if (error) return { ok: false, message: error.message };
  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName: "simulation_completed",
    route: "/dashboard/simulados",
    metadata: { total_questions: total, correct_answers: correct },
  });
  revalidatePath("/dashboard/simulados");
  return { ok: true, message: "Simulado finalizado." };
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
    return { ok: false, message: planError?.message ?? "Não foi possível criar plano." };
  }

  const availableDays = parseAvailableDays(profile?.available_days);
  const weeklyHours = profile?.weekly_hours ?? 7;
  const duration = Math.max(35, Math.round((weeklyHours * 60) / Math.max(availableDays.length, 1)));

  const items = topics.slice(0, availableDays.length).map((topic, index) => ({
    study_plan_id: plan.id,
    topic_id: topic.id,
    scheduled_date: addDays(weekStart, index).toISOString().slice(0, 10),
    duration_minutes: duration,
    question_goal: 10 + index * 2,
  }));

  if (items.length) {
    const { error } = await supabase.from("study_plan_items").insert(items);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard/plano");
  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName: "study_plan_generated",
    route: "/dashboard/plano",
    metadata: { item_count: items.length },
  });
  return { ok: true, message: "Plano semanal gerado com regras." };
}

export async function completeStudyPlanItemAction(itemId: string): Promise<ActionResult> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };
  const { supabase, user } = context;
  const { error } = await supabase
    .from("study_plan_items")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) return { ok: false, message: error.message };
  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName: "study_plan_item_completed",
    route: "/dashboard/plano",
    metadata: { item_id: itemId },
  });
  revalidatePath("/dashboard/plano");
  return { ok: true, message: "Atividade concluída." };
}

async function refreshTopicPerformance(userId: string, topicId: string) {
  const supabase = await createClient();
  const { data: answers } = await supabase
    .from("user_question_answers")
    .select("is_correct, questions!inner(topic_id)")
    .eq("user_id", userId)
    .eq("questions.topic_id", topicId);
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

function parseAvailableDays(value?: string | null) {
  const days = value
    ?.split(/,| e /)
    .map((day) => day.trim())
    .filter(Boolean);

  return days?.length ? days.slice(0, 7) : ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date;
}
