"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { accessRequiredMessage, getAccessContext } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { diagnosisSchema, type DiagnosisInput } from "@/lib/schemas/diagnosis";
import { recalculateDiagnosisPriorities } from "@/lib/db/diagnosis";
import { calculatePriorityScore, getWeekStart } from "@/lib/db/scoring";
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
import { formatAppDateTime } from "@/lib/dates";
import {
  buildQuestionAnswerRecord,
  nextReviewToggle,
} from "@/lib/questions/rules.mjs";
import { isStudentReadyQuestion } from "@/lib/questions/quality";
import { calculateSimulationDurationMinutes } from "@/lib/simulations/rules";

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

function learningError(scope: string, error: unknown, fallback = "Nao foi possivel salvar agora.") {
  logServerError(scope, error);
  return { ok: false, message: publicDatabaseErrorMessage(error, fallback) };
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
}): Promise<
  ActionResult & { isCorrect?: boolean; explanation?: string; correctOption?: string }
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
      explanation: result.explanation,
      correctOption: question.correct_option,
    };
  }

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select(
      "id, topic_id, correct_option, explanation, is_demo, reviewed, review_status, source_verified, answer_verified, media_required, media_url, statement, topics (*), question_options (option_key, option_text), question_media (url)",
    )
    .eq("id", input.questionId)
    .single();

  if (questionError || !question) {
    if (questionError) logServerError("learning.submitQuestionAnswer.question", questionError);
    return { ok: false, message: "Questao nao encontrada." };
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
  const { error } = await supabase.from("user_question_answers").insert(row);

  if (error) return learningError("learning.saveDiagnosis", error);

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
    explanation: result.explanation,
    correctOption: question.correct_option,
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
    return { ok: false, message: "Simulado nao encontrado." };
  }

  const isDiagnostic = simulation.title.toLowerCase().includes("diagn");
  const { data: simulationQuestionRows, error: simulationQuestionError } = await supabase
    .from("simulation_questions")
    .select(
      "questions (correct_option, is_demo, reviewed, review_status, source_verified, answer_verified, media_required, media_url, statement, question_options (option_key, option_text), question_media (url))",
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

  const { supabase } = context;
  if (
    input.userSimulationId.startsWith("fallback-attempt-") ||
    isFallbackQuestionId(input.questionId)
  ) {
    return { ok: true, message: "Resposta salva nesta sessão." };
  }

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select(
      "correct_option, is_demo, reviewed, review_status, source_verified, answer_verified, media_required, media_url, statement, question_options (option_key, option_text), question_media (url)",
    )
    .eq("id", input.questionId)
    .single();

  if (questionError || !question) {
    if (questionError) logServerError("learning.submitSimulationAnswer.questionRow", questionError);
    return { ok: false, message: "Questao nao encontrada." };
  }

  if (!isStudentReadyQuestion(question)) {
    return {
      ok: false,
      message: "Esta questão ainda está em revisão editorial e não pode ser salva no simulado.",
    };
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

  if (error) return learningError("learning.submitQuestionAnswer", error);
  return { ok: true, message: "Resposta salva." };
}

export async function finishSimulationAction(
  userSimulationId: string,
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
  const { data: answers, error: answersError } = await supabase
    .from("user_simulation_answers")
    .select("question_id, is_correct")
    .eq("user_simulation_id", userSimulationId);

  if (answersError) return learningError("learning.finishSimulation.answers", answersError);

  const { data: simulation, error: simulationError } = await supabase
    .from("user_simulations")
    .select("total_questions")
    .eq("id", userSimulationId)
    .eq("user_id", user.id)
    .single();

  if (simulationError || !simulation) {
    if (simulationError) logServerError("learning.finishSimulation.simulation", simulationError);
    return { ok: false, message: "Simulado nao encontrado." };
  }

  const answered = answers?.length ?? 0;
  const correct = answers?.filter((answer) => answer.is_correct).length ?? 0;
  // Percentual sobre o total de questões do simulado, não sobre as respondidas.
  const totalQuestions = simulation.total_questions || answered;
  const percentage = totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0;
  const results = (answers ?? []).map((answer) => ({
    questionId: answer.question_id,
    isCorrect: Boolean(answer.is_correct),
  }));

  const { error } = await supabase
    .from("user_simulations")
    .update({
      finished_at: new Date().toISOString(),
      correct_answers: correct,
      score_percentage: percentage,
      status: "Finalizado",
    })
    .eq("id", userSimulationId)
    .eq("user_id", user.id);

  if (error) return learningError("learning.finishSimulation.update", error);
  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName: "simulation_completed",
    route: "/dashboard/simulados",
    metadata: { total_questions: totalQuestions, correct_answers: correct },
  });
  revalidatePath("/dashboard/simulados");
  return {
    ok: true,
    message: "Simulado finalizado.",
    results,
    correct,
    total: totalQuestions,
    percentage,
  };
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
  const { supabase, user } = context;

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
      "id, topic_id, difficulty, language, is_demo, reviewed, review_status, source_verified, answer_verified, media_required, media_url, statement, correct_option, subjects!inner(area), topics(name), question_options(option_key, option_text), question_media(url)",
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
    return { ok: false, message: "Nao foi possivel criar plano." };
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
