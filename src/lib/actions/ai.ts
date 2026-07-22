"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { accessRequiredMessage, getAccessContext } from "@/lib/access";
import type { ActionResult } from "@/lib/actions/auth";
import {
  AI_PERFORMANCE_ANALYSIS_CREDIT_COST,
  AI_QUESTION_EXPLANATION_CREDIT_COST,
  AI_STUDY_PLAN_CREDIT_COST,
} from "@/lib/ai/credits";
import { getWeekStart } from "@/lib/db/scoring";
import type {
  CreditLedgerEntry,
  Profile,
  QuestionMedia,
  QuestionOption,
  Subject,
  Topic,
} from "@/lib/db/types";
import {
  getFallbackQuestionWithAnswer,
  isFallbackQuestionId,
} from "@/lib/db/fallback-content";
import { isStudentReadyQuestion } from "@/lib/questions/quality";
import { generateGroqText, GroqConfigurationError } from "@/lib/services/groq";
import { recordProductEvent } from "@/lib/services/product-events";
import { logServerError } from "@/lib/security/public-errors";
import {
  checkRateLimit,
  rateLimitedResult,
  userRateLimitIdentifier,
} from "@/lib/security/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

type AiActionResult = ActionResult & {
  output?: string;
  cost?: number;
  balanceAfter?: number;
  model?: string;
};

type UserContext =
  | { error: string }
  | {
      supabase: AppSupabaseClient;
      user: User;
      profile: Profile | null;
    };

type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type AiQuestion = {
  id: string;
  statement: string;
  difficulty: string;
  year: number;
  source: string;
  exam_name: string | null;
  exam_day: string | null;
  exam_color: string | null;
  question_number: number | null;
  reviewed: boolean;
  review_status: string;
  source_verified: boolean;
  answer_verified: boolean;
  media_required: boolean;
  media_url?: string | null;
  correct_option: string;
  explanation: string;
  subjects: Pick<Subject, "name" | "area">;
  topics: Pick<Topic, "name">;
  question_options: Array<Pick<QuestionOption, "option_key" | "option_text">>;
  question_media?: Array<Pick<QuestionMedia, "url" | "media_type" | "caption" | "alt_text">>;
};

const questionExplanationSchema = z.object({
  questionId: z.string().trim().min(1),
  selectedOption: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.enum(["A", "B", "C", "D", "E"]))
    .optional(),
});

async function getUserContext(): Promise<UserContext> {
  if (!isSupabaseConfigured()) {
    return { error: "Configure o Supabase para usar a IA com creditos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessao expirada. Entre novamente." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logServerError("ai.getUserContext.profile", error, { userId: user.id });
    return { error: "Nao foi possivel carregar seu perfil agora." };
  }

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
  };
}

export async function generateQuestionExplanationAction(
  input: z.input<typeof questionExplanationSchema>,
): Promise<AiActionResult> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };

  const parsed = questionExplanationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Questao invalida para explicacao." };
  }

  const rateLimit = await checkRateLimit({
    operation: "ai.generate",
    identifier: userRateLimitIdentifier(context.user.id),
    limit: 10,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) return rateLimitedResult(rateLimit);

  const question = await getQuestionForAi(context.supabase, parsed.data.questionId);
  if (!question) {
    return { ok: false, message: "Questao nao encontrada ou ainda em revisao editorial." };
  }

  const reservation = await reserveAiCredits({
    context,
    operation: "question_explanation",
    referenceType: isFallbackQuestionId(question.id) ? "fallback_question" : "question",
    referenceId: uuidOrNull(question.id),
    metadata: {
      question_id: question.id,
      selected_option: parsed.data.selectedOption ?? null,
      subject: question.subjects.name,
      topic: question.topics.name,
    },
  });
  if (!reservation.ok) return reservation;

  let ai: Awaited<ReturnType<typeof generateGroqText>>;
  try {
    ai = await generateGroqText({
      maxCompletionTokens: 900,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "Voce e um tutor do ENEM. Explique com clareza, em portugues do Brasil, sem inventar dados e sem resolver por atalhos enganosos. Seja direto, didatico e acolhedor.",
        },
        {
          role: "user",
          content: buildQuestionExplanationPrompt(question, parsed.data.selectedOption),
        },
      ],
    });
  } catch (error) {
    logServerError("ai.questionExplanation", error, { userId: context.user.id });
    await refundAiCreditReservation(context, reservation.ledger.id, error);
    return {
      ok: false,
      message: aiErrorMessage(error),
    };
  }

  const ledger = await confirmAiCreditReservation(context, reservation.ledger, {
    model: ai.model,
    total_tokens: ai.usage?.totalTokens ?? null,
  });

  await recordProductEvent({
    supabase: context.supabase,
    userId: context.user.id,
    eventName: "ai_question_explanation_generated",
    route: "/dashboard/praticar",
    metadata: {
      question_id: question.id,
      subject: question.subjects.name,
      topic: question.topics.name,
      cost: AI_QUESTION_EXPLANATION_CREDIT_COST,
      model: ai.model,
    },
  });
  revalidateCreditViews();

  return {
    ok: true,
    message: "Explicacao gerada com IA.",
    output: ai.content,
    cost: AI_QUESTION_EXPLANATION_CREDIT_COST,
    balanceAfter: ledger.ledger.balance_after,
    model: ai.model,
  };
}

export async function generatePerformanceAnalysisAction(): Promise<AiActionResult> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };

  const rateLimit = await checkRateLimit({
    operation: "ai.generate",
    identifier: userRateLimitIdentifier(context.user.id),
    limit: 10,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) return rateLimitedResult(rateLimit);

  const answerRows = await getRecentAnswerRows(context.supabase, context.user.id);
  if (!answerRows.ok) return { ok: false, message: answerRows.message };
  if (!answerRows.answers.length) {
    return {
      ok: false,
      message: "Responda algumas questoes antes de gerar a analise de desempenho.",
    };
  }

  const reservation = await reserveAiCredits({
    context,
    operation: "performance_analysis",
    referenceType: "performance_analysis",
    referenceId: null,
    metadata: {
      answers_analyzed: answerRows.answers.length,
    },
  });
  if (!reservation.ok) return reservation;

  let ai: Awaited<ReturnType<typeof generateGroqText>>;
  try {
    ai = await generateGroqText({
      maxCompletionTokens: 1_000,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content:
            "Voce e um analista pedagogico do ENEM. Gere diagnosticos acionaveis, sem prometer previsao de prova e sem sugerir abandonar areas inteiras.",
        },
        {
          role: "user",
          content: buildPerformanceAnalysisPrompt(answerRows.answers),
        },
      ],
    });
  } catch (error) {
    logServerError("ai.performanceAnalysis", error, { userId: context.user.id });
    await refundAiCreditReservation(context, reservation.ledger.id, error);
    return {
      ok: false,
      message: aiErrorMessage(error),
    };
  }

  const ledger = await confirmAiCreditReservation(context, reservation.ledger, {
    model: ai.model,
    total_tokens: ai.usage?.totalTokens ?? null,
  });

  await recordProductEvent({
    supabase: context.supabase,
    userId: context.user.id,
    eventName: "ai_performance_analysis_generated",
    route: "/dashboard/radar?tab=desempenho",
    metadata: {
      answers_analyzed: answerRows.answers.length,
      cost: AI_PERFORMANCE_ANALYSIS_CREDIT_COST,
      model: ai.model,
    },
  });
  revalidateCreditViews();

  return {
    ok: true,
    message: "Analise de desempenho gerada com IA.",
    output: ai.content,
    cost: AI_PERFORMANCE_ANALYSIS_CREDIT_COST,
    balanceAfter: ledger.ledger.balance_after,
    model: ai.model,
  };
}

export async function generateSmartStudyPlanAction(): Promise<AiActionResult> {
  const context = await getUserContext();
  if ("error" in context) return { ok: false, message: context.error };

  const rateLimit = await checkRateLimit({
    operation: "ai.generate",
    identifier: userRateLimitIdentifier(context.user.id),
    limit: 10,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) return rateLimitedResult(rateLimit);

  const planContext = await getStudyPlanContext(context.supabase, context.user.id);
  if (!planContext.ok) return { ok: false, message: planContext.message };

  const reservation = await reserveAiCredits({
    context,
    operation: "study_plan",
    referenceType: "study_plan",
    referenceId: uuidOrNull(planContext.planId),
    metadata: {
      plan_id: planContext.planId,
      weak_topics: planContext.weakTopics.length,
    },
  });
  if (!reservation.ok) return reservation;

  let ai: Awaited<ReturnType<typeof generateGroqText>>;
  try {
    ai = await generateGroqText({
      maxCompletionTokens: 1_000,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Voce e um planejador de estudos do ENEM. Ajuste a semana com foco realista, priorizando revisao de erros, recorrencia historica e energia do estudante.",
        },
        {
          role: "user",
          content: buildStudyPlanPrompt(planContext),
        },
      ],
    });
  } catch (error) {
    logServerError("ai.studyPlan", error, { userId: context.user.id });
    await refundAiCreditReservation(context, reservation.ledger.id, error);
    return {
      ok: false,
      message: aiErrorMessage(error),
    };
  }

  const ledger = await confirmAiCreditReservation(context, reservation.ledger, {
    model: ai.model,
    total_tokens: ai.usage?.totalTokens ?? null,
  });

  await recordProductEvent({
    supabase: context.supabase,
    userId: context.user.id,
    eventName: "ai_study_plan_generated",
    route: "/dashboard#plano-semana",
    metadata: {
      plan_id: planContext.planId,
      cost: AI_STUDY_PLAN_CREDIT_COST,
      model: ai.model,
    },
  });
  revalidateCreditViews();

  return {
    ok: true,
    message: "Plano inteligente gerado com IA.",
    output: ai.content,
    cost: AI_STUDY_PLAN_CREDIT_COST,
    balanceAfter: ledger.ledger.balance_after,
    model: ai.model,
  };
}

async function reserveAiCredits({
  context,
  operation,
  referenceType,
  referenceId,
  metadata,
}: {
  context: Exclude<UserContext, { error: string }>;
  operation: "question_explanation" | "performance_analysis" | "study_plan";
  referenceType: string;
  referenceId: string | null;
  metadata: Record<string, Json | undefined>;
}): Promise<
  | { ok: true; ledger: CreditLedgerEntry }
  | { ok: false; message: string }
> {
  const { data, error } = await context.supabase.rpc("reserve_ai_credits", {
    input_operation: operation,
    input_reference_type: referenceType,
    input_reference_id: referenceId,
    input_metadata: stripUndefined(metadata),
  });

  if (error || !data) {
    logServerError("ai.reserveCredits", error, {
      userId: context.user.id,
      operation,
    });
    return {
      ok: false,
      message: mapCreditError(
        error?.message ?? "Nao foi possivel reservar creditos para a IA.",
      ),
    };
  }

  return { ok: true, ledger: data };
}

async function confirmAiCreditReservation(
  context: Exclude<UserContext, { error: string }>,
  reservation: CreditLedgerEntry,
  metadata: Record<string, Json | undefined>,
): Promise<{ ok: true; ledger: CreditLedgerEntry }> {
  const { data, error } = await context.supabase.rpc("confirm_ai_credit_reservation", {
    input_ledger_id: reservation.id,
    input_metadata: stripUndefined(metadata),
  });

  if (error || !data) {
    logServerError("ai.confirmReservation", error, {
      userId: context.user.id,
      ledgerId: reservation.id,
    });
    return { ok: true, ledger: reservation };
  }

  return { ok: true, ledger: data };
}

async function refundAiCreditReservation(
  context: Exclude<UserContext, { error: string }>,
  ledgerId: string,
  cause: unknown,
) {
  const { error } = await context.supabase.rpc("refund_ai_credit_reservation", {
    input_ledger_id: ledgerId,
    input_reason: aiFailureReason(cause),
  });

  if (error) {
    logServerError("ai.refundReservation", error, {
      userId: context.user.id,
      ledgerId,
    });
  }
}

async function getQuestionForAi(
  supabase: AppSupabaseClient,
  questionId: string,
): Promise<AiQuestion | null> {
  if (isFallbackQuestionId(questionId)) {
    return getFallbackQuestionWithAnswer(questionId) as AiQuestion | null;
  }

  const { data, error } = await supabase
    .from("questions")
    .select(
      "*, subjects (*), topics (*), question_options (option_key, option_text), question_media (url, media_type, caption, alt_text)",
    )
    .eq("id", questionId)
    .maybeSingle();

  if (error || !data) return null;

  const question = data as unknown as AiQuestion;
  return isStudentReadyQuestion(question) ? question : null;
}

type RecentAnswerForAi = {
  isCorrect: boolean;
  selectedOption: string;
  responseTimeSeconds: number;
  answeredAt: string;
  subject: string;
  area: string;
  topic: string;
  difficulty: string;
  year: number | null;
};

async function getRecentAnswerRows(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<
  | { ok: true; answers: RecentAnswerForAi[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("user_question_answers")
    .select(
      "is_correct, selected_option, response_time_seconds, answered_at, questions!inner(difficulty, year, subjects(name, area), topics(name))",
    )
    .eq("user_id", userId)
    .order("answered_at", { ascending: false })
    .limit(60);

  if (error) {
    logServerError("ai.recentAnswers", error, { userId });
    return { ok: false, message: "Nao foi possivel carregar seu desempenho recente." };
  }

  const answers = ((data ?? []) as unknown as Array<{
    is_correct: boolean;
    selected_option: string;
    response_time_seconds: number | null;
    answered_at: string;
    questions:
      | {
          difficulty: string;
          year: number | null;
          subjects: Pick<Subject, "name" | "area"> | Array<Pick<Subject, "name" | "area">> | null;
          topics: Pick<Topic, "name"> | Array<Pick<Topic, "name">> | null;
        }
      | Array<{
          difficulty: string;
          year: number | null;
          subjects: Pick<Subject, "name" | "area"> | Array<Pick<Subject, "name" | "area">> | null;
          topics: Pick<Topic, "name"> | Array<Pick<Topic, "name">> | null;
        }>
      | null;
  }>).flatMap((row) => {
    const question = firstRelation(row.questions);
    const subject = firstRelation(question?.subjects);
    const topic = firstRelation(question?.topics);
    if (!question || !subject || !topic) return [];

    return {
      isCorrect: Boolean(row.is_correct),
      selectedOption: row.selected_option,
      responseTimeSeconds: row.response_time_seconds ?? 0,
      answeredAt: row.answered_at,
      subject: subject.name,
      area: subject.area,
      topic: topic.name,
      difficulty: question.difficulty,
      year: question.year,
    };
  });

  return { ok: true, answers };
}

type StudyPlanContextForAi = {
  planId: string | null;
  weekStart: string;
  weeklyHours: number;
  availableDays: string;
  targetCourse: string;
  targetScore: number | null;
  tasks: Array<{
    date: string;
    durationMinutes: number;
    questionGoal: number;
    completed: boolean;
    subject: string;
    area: string;
    topic: string;
  }>;
  weakTopics: Array<{
    subject: string;
    area: string;
    topic: string;
    accuracy: number;
    answered: number;
    priorityScore: number;
  }>;
};

async function getStudyPlanContext(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<
  | (StudyPlanContextForAi & { ok: true })
  | { ok: false; message: string }
> {
  const weekStart = getWeekStart();
  const [profileResult, planResult, performanceResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("target_course, target_score, weekly_hours, available_days")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("study_plans")
      .select("id, week_start, study_plan_items (*, topics (*, subjects (*)))")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_topic_performance")
      .select("total_answers, accuracy_percentage, priority_score, topics (*, subjects (*))")
      .eq("user_id", userId)
      .order("priority_score", { ascending: false })
      .limit(10),
  ]);

  if (profileResult.error) {
    logServerError("ai.studyPlanContext.profile", profileResult.error, { userId });
    return { ok: false, message: "Nao foi possivel carregar seu perfil de estudos." };
  }
  if (planResult.error) {
    logServerError("ai.studyPlanContext.plan", planResult.error, { userId });
    return { ok: false, message: "Nao foi possivel carregar seu plano atual." };
  }
  if (performanceResult.error) {
    logServerError("ai.studyPlanContext.performance", performanceResult.error, { userId });
    return { ok: false, message: "Nao foi possivel carregar seu desempenho por assunto." };
  }

  const profile = profileResult.data as
    | {
        target_course: string | null;
        target_score: number | null;
        weekly_hours: number | null;
        available_days: string | null;
      }
    | null;
  const plan = planResult.data as unknown as
    | {
        id: string;
        week_start: string;
        study_plan_items: Array<{
          scheduled_date: string;
          duration_minutes: number;
          question_goal: number;
          completed: boolean;
          topics: Topic & { subjects: Subject };
        }>;
      }
    | null;
  const weakTopics = ((performanceResult.data ?? []) as unknown as Array<{
    total_answers: number;
    accuracy_percentage: number;
    priority_score: number;
    topics: (Topic & { subjects: Subject }) | Array<Topic & { subjects: Subject }> | null;
  }>).flatMap((row) => {
    const topic = firstRelation(row.topics);
    const subject = topic ? firstRelation(topic.subjects) : null;
    if (!topic || !subject) return [];
    return {
      subject: subject.name,
      area: subject.area,
      topic: topic.name,
      accuracy: row.accuracy_percentage,
      answered: row.total_answers,
      priorityScore: row.priority_score,
    };
  });

  return {
    ok: true,
    planId: plan?.id ?? null,
    weekStart,
    weeklyHours: profile?.weekly_hours ?? 7,
    availableDays: profile?.available_days ?? "Segunda, Terca, Quarta, Quinta, Sexta",
    targetCourse: profile?.target_course || "Nao informado",
    targetScore: profile?.target_score ?? null,
    tasks:
      plan?.study_plan_items.map((item) => ({
        date: item.scheduled_date,
        durationMinutes: item.duration_minutes,
        questionGoal: item.question_goal,
        completed: item.completed,
        subject: item.topics.subjects.name,
        area: item.topics.subjects.area,
        topic: item.topics.name,
      })) ?? [],
    weakTopics,
  };
}

function buildQuestionExplanationPrompt(question: AiQuestion, selectedOption?: string) {
  const options = question.question_options
    .slice()
    .sort((a, b) => a.option_key.localeCompare(b.option_key));
  const selected = selectedOption
    ? options.find((option) => option.option_key === selectedOption)
    : null;

  return [
    "Explique esta questao para um estudante do ENEM.",
    "",
    `Area: ${question.subjects.area}`,
    `Disciplina: ${question.subjects.name}`,
    `Assunto: ${question.topics.name}`,
    `Fonte: ${question.exam_name || question.source} ${question.year}`,
    `Dificuldade: ${question.difficulty}`,
    "",
    `Enunciado:\n${clip(question.statement, 4_500)}`,
    "",
    `Alternativas:\n${options
      .map((option) => `${option.option_key}) ${clip(option.option_text, 900)}`)
      .join("\n")}`,
    "",
    selected
      ? `Alternativa marcada pelo aluno: ${selected.option_key}) ${clip(selected.option_text, 900)}`
      : "Alternativa marcada pelo aluno: nao informada",
    `Gabarito oficial: ${question.correct_option}`,
    `Resolucao editorial disponivel:\n${clip(question.explanation || "Nao informada.", 2_500)}`,
    "",
    "Formato da resposta: explique o raciocinio em 3 a 5 paragrafos curtos; diga por que o gabarito faz sentido; se houver alternativa marcada, compare-a com o gabarito; finalize com uma dica pratica para proximas questoes desse assunto.",
  ].join("\n");
}

function buildPerformanceAnalysisPrompt(answers: RecentAnswerForAi[]) {
  const total = answers.length;
  const correct = answers.filter((answer) => answer.isCorrect).length;
  const rows = answers
    .map(
      (answer, index) =>
        `${index + 1}. ${answer.isCorrect ? "acerto" : "erro"} | ${answer.area} | ${answer.subject} | ${answer.topic} | dificuldade ${answer.difficulty} | ${answer.responseTimeSeconds}s`,
    )
    .join("\n");

  return [
    "Analise o desempenho recente deste aluno.",
    `Total analisado: ${total}`,
    `Acertos: ${correct}`,
    `Erros: ${total - correct}`,
    "",
    "Respostas recentes, da mais nova para a mais antiga:",
    rows,
    "",
    "Formato da resposta: comece com um diagnostico em uma frase; depois liste 3 padroes de erro; indique 3 proximos focos de treino; feche com uma meta pratica para os proximos 7 dias. Nao prometa previsao exata do ENEM.",
  ].join("\n");
}

function buildStudyPlanPrompt(context: StudyPlanContextForAi) {
  const tasks = context.tasks.length
    ? context.tasks
        .map(
          (task) =>
            `${task.date}: ${task.area} / ${task.subject} / ${task.topic}, ${task.durationMinutes} min, ${task.questionGoal} questoes, ${task.completed ? "concluido" : "pendente"}`,
        )
        .join("\n")
    : "Nenhum item gerado ainda.";
  const weakTopics = context.weakTopics.length
    ? context.weakTopics
        .map(
          (topic, index) =>
            `${index + 1}. ${topic.area} / ${topic.subject} / ${topic.topic}: ${topic.accuracy}% de acerto em ${topic.answered} respostas, prioridade ${Math.round(topic.priorityScore)}`,
        )
        .join("\n")
    : "Sem desempenho pessoal suficiente; usar recorrencia e equilibrio entre areas.";

  return [
    "Ajuste o plano semanal deste aluno.",
    `Semana inicial: ${context.weekStart}`,
    `Horas semanais: ${context.weeklyHours}`,
    `Dias disponiveis: ${context.availableDays}`,
    `Curso alvo: ${context.targetCourse}`,
    `Nota alvo: ${context.targetScore ?? "Nao informada"}`,
    "",
    "Plano atual:",
    tasks,
    "",
    "Topicos fracos ou prioritarios:",
    weakTopics,
    "",
    "Formato da resposta: entregue uma sugestao objetiva de ajuste da semana, com prioridades por dia quando possivel, revisao de erros, quantidade aproximada de questoes e um criterio claro para saber se o plano funcionou. Nao apague descanso nem proponha carga irrealista.",
  ].join("\n");
}

function revalidateCreditViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/creditos");
  revalidatePath("/dashboard/radar");
  revalidatePath("/dashboard/praticar");
}

function mapCreditError(message: string) {
  if (message.includes("insufficient credits")) {
    return "Saldo insuficiente para usar esta acao de IA.";
  }
  if (message.includes("platform access required")) {
    return accessRequiredMessage();
  }
  return "Nao foi possivel reservar creditos para a IA.";
}

function aiErrorMessage(error: unknown) {
  if (error instanceof GroqConfigurationError) {
    return "A chave da Groq ainda nao esta configurada no servidor.";
  }
  return "Nao foi possivel gerar a resposta da IA agora. Tente novamente em instantes.";
}

function aiFailureReason(error: unknown) {
  if (error instanceof GroqConfigurationError) return "provider_not_configured";
  return error instanceof Error ? error.name || "provider_failed" : "provider_failed";
}

function clip(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3)}...`
    : normalized;
}

function uuidOrNull(value: string | null | undefined) {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function stripUndefined(metadata: Record<string, Json | undefined>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  ) as Record<string, Json>;
}
