import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatDateTime, getWeekStart } from "@/lib/db/scoring";
import { prioritizeTopics } from "@/lib/study/priorities";
import { appDateISO } from "@/lib/dates";
import {
  getFallbackQuestionRecords,
  getFallbackSimulations,
  getFallbackTopicsWithPerformance,
} from "@/lib/db/fallback-content";
import type {
  ActivityRecord,
  AreaMetric,
  CreditsData,
  DashboardEssayCreditData,
  EssayCorrectionData,
  EssaySubmissionDetail,
  EssaySubmissionWithProfile,
  Profile,
  QuestionRecord,
  SimulationWithQuestions,
  StudyPlanWithItems,
  TopicWithSubject,
} from "@/lib/db/types";
import { canEditEditorial } from "@/lib/editorial/rules.mjs";
import { isProfilePhotoDataUrl } from "@/lib/profile-photo";
import { isStudentReadyQuestion } from "@/lib/questions/quality";

type QueryError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function logQueryError(queryName: string, error: QueryError | null) {
  if (!error) {
    return;
  }

  console.error(`[Pontua Enem db] ${queryName}`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

// O gabarito (correct_option) e a resolução (explanation) nunca devem chegar ao
// cliente junto da questão: o payload RSC é inspecionável e revelaria a resposta
// antes do envio. Esses campos voltam apenas na resposta da action, após responder.
function stripAnswerKey<T extends { correct_option: string; explanation: string }>(
  question: T,
): T {
  return { ...question, correct_option: "", explanation: "" };
}

async function attachQuestionMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  questions: QuestionRecord[],
) {
  const questionIds = questions.map((question) => question.id);
  if (!questionIds.length) {
    return questions;
  }

  const { data, error } = await supabase
    .from("question_media")
    .select("*")
    .in("question_id", questionIds)
    .order("sort_order", { ascending: true });

  if (error) {
    return questions.map((question) => ({ ...question, question_media: [] }));
  }

  const mediaByQuestion = new Map<string, NonNullable<QuestionRecord["question_media"]>>();
  for (const media of data ?? []) {
    const current = mediaByQuestion.get(media.question_id) ?? [];
    current.push(media);
    mediaByQuestion.set(media.question_id, current);
  }

  return questions.map((question) => ({
    ...question,
    question_media: mediaByQuestion.get(question.id) ?? [],
  }));
}

export async function requireUser() {
  if (!isSupabaseConfigured()) {
    redirect("/login?setup=supabase");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function requirePlatformAccess() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logQueryError("profiles.require_platform_access", error);
    redirect("/checkout");
  }

  const access = getAccessContext((profile as Profile | null) ?? null);
  if (!access.hasPlatformAccess) {
    redirect(access.expired ? "/acesso-expirado" : "/checkout");
  }

  return { supabase, user, profile: (profile as Profile | null) ?? null, access };
}

export async function getDashboardIdentity() {
  const { user, profile, access } = await requirePlatformAccess();
  const metadataFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  return {
    userId: user.id,
    fullName:
      profile?.full_name?.trim() ||
      metadataFullName.trim() ||
      "Estudante Pontua Enem",
    email: profile?.email || user.email || "",
    accessLevel: access.level,
    betaTester: access.betaTester,
    profilePhotoUrl: getProfilePhotoUrl(profile),
  };
}

export type PublicViewer = {
  fullName: string;
  email: string;
  profilePhotoUrl: string;
  hasPlatformAccess: boolean;
};

// Identidade leve para páginas públicas (header): não exige login nem acesso pago.
export async function getPublicViewer(): Promise<PublicViewer | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logQueryError("profiles.public_viewer", error);
  }

  const profile = (data as Profile | null) ?? null;
  const access = getAccessContext(profile);
  const metadataFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  return {
    fullName:
      profile?.full_name?.trim() || metadataFullName.trim() || "Estudante Pontua Enem",
    email: profile?.email || user.email || "",
    profilePhotoUrl: getProfilePhotoUrl(profile),
    hasPlatformAccess: access.hasPlatformAccess,
  };
}

function getProfilePhotoUrl(profile: Profile | null) {
  const preferences = profile?.study_preferences;
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) {
    return "";
  }

  const value = preferences.profile_photo_url;
  return isProfilePhotoDataUrl(value) ? value : "";
}

export async function getProfile(): Promise<Profile | null> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logQueryError("profiles.select.by_user_id", error);
    return null;
  }

  return data;
}

export async function getQuestionRecords(): Promise<QuestionRecord[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("questions")
    .select(
      `
      *,
      subjects (*),
      topics (*),
      question_options (*),
      user_question_answers (id, question_id, selected_option, is_correct, response_time_seconds, answered_at),
      user_question_reviews (id, mastered)
    `,
    )
    .eq("user_question_answers.user_id", user.id)
    .eq("user_question_reviews.user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    logQueryError("questions.with_user_answers_and_reviews", error);
    return getFallbackQuestionRecords();
  }

  const records = (data ?? []) as unknown as QuestionRecord[];
  const recordsWithMedia = await attachQuestionMedia(supabase, records);
  const readyRecords = recordsWithMedia
    .filter(isStudentReadyQuestion)
    .map(stripAnswerKey);

  return mergeQuestionRecordSources(readyRecords, getFallbackQuestionRecords());
}

export async function getTopicsWithPerformance(): Promise<TopicWithSubject[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("topics")
    .select("*, subjects (*), user_topic_performance (*)")
    .eq("user_topic_performance.user_id", user.id)
    .order("historical_recurrence", { ascending: false });

  if (error) {
    logQueryError("topics.with_subjects_and_user_performance", error);
    return getFallbackTopicsWithPerformance();
  }

  const topics = (data ?? []) as unknown as TopicWithSubject[];
  const fallbackTopics = getFallbackTopicsWithPerformance();
  return mergeTopicSources(topics, fallbackTopics);
}

export async function getAreaMetrics(): Promise<AreaMetric[]> {
  const questions = await getQuestionRecords();
  const areaMap = new Map<string, { answered: number; correct: number }>();

  questions.forEach((question) => {
    const answers = question.user_question_answers ?? [];
    answers.forEach((answer) => {
      const current = areaMap.get(question.subjects.area) ?? { answered: 0, correct: 0 };
      current.answered += 1;
      current.correct += answer.is_correct ? 1 : 0;
      areaMap.set(question.subjects.area, current);
    });
  });

  return Array.from(areaMap.entries()).map(([area, metric]) => ({
    area,
    answered: metric.answered,
    accuracy: metric.answered
      ? Math.round((metric.correct / metric.answered) * 100)
      : 0,
  }));
}

export async function getQuestionAnswerCount(): Promise<number> {
  const { supabase, user } = await requireUser();
  const { count, error } = await supabase
    .from("user_question_answers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) {
    logQueryError("user_question_answers.count.by_user_id", error);
    return 0;
  }

  return count ?? 0;
}

export async function getDashboardData() {
  const [profile, questions, topics, areaMetrics, plan] = await Promise.all([
    getProfile(),
    getQuestionRecords(),
    getTopicsWithPerformance(),
    getAreaMetrics(),
    getCurrentStudyPlan(),
  ]);

  const answers = questions.flatMap((question) => question.user_question_answers ?? []);
  const answered = answers.length;
  const correct = answers.filter((answer) => answer.is_correct).length;
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;

  const priorities = prioritizeTopics(topics).slice(0, 4);

  const recentActivities: ActivityRecord[] = answers
    .slice(-5)
    .reverse()
    .map((answer) => {
      const question = questions.find((item) => item.id === answer.question_id);
      return {
        id: answer.id,
        title: answer.is_correct ? "Questão correta registrada" : "Erro registrado",
        description: question
          ? `${question.subjects.name}: ${question.topics.name}`
          : "Resposta salva no banco.",
        timestamp: formatDateTime(answer.answered_at),
        type: "questões",
      };
    });

  const completedPlanItems =
    plan?.study_plan_items.filter((item) => item.completed).length ?? 0;
  const totalPlanItems = plan?.study_plan_items.length ?? 0;

  return {
    profile,
    answered,
    accuracy,
    correct,
    priorities,
    areaMetrics,
    recentActivities,
    planProgress: totalPlanItems
      ? Math.round((completedPlanItems / totalPlanItems) * 100)
      : 0,
    completedPlanItems,
    totalPlanItems,
  };
}

export async function getSimulations(): Promise<SimulationWithQuestions[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("simulations")
    .select(
      `
      *,
      simulation_questions (
        position,
        questions (
          *,
          subjects (*),
          topics (*),
          question_options (*)
        )
      ),
      user_simulations (*)
    `,
    )
    .eq("user_simulations.user_id", user.id)
    .order("title")
    .order("started_at", { referencedTable: "user_simulations", ascending: false });

  if (error) {
    logQueryError("simulations.with_questions_and_user_attempts", error);
    return getFallbackSimulations();
  }

  const simulations = (data ?? []) as unknown as SimulationWithQuestions[];
  const questions = simulations
    .flatMap((simulation) =>
      simulation.simulation_questions.map((item) => item.questions).filter(Boolean),
    );
  const questionsWithMedia = await attachQuestionMedia(supabase, questions);
  const mediaByQuestion = new Map(
    questionsWithMedia.map((question) => [question.id, question.question_media ?? []]),
  );

  const readySimulations = simulations.map((simulation) => ({
    ...simulation,
    simulation_questions: simulation.simulation_questions
      .map((item) => ({
        ...item,
        questions: {
          ...item.questions,
          question_media: mediaByQuestion.get(item.questions.id) ?? [],
        },
      }))
      .filter((item) => isStudentReadyQuestion(item.questions))
      .map((item) => ({
        ...item,
        questions: stripAnswerKey(item.questions),
      })),
  }));
  const usableSimulations = readySimulations.filter(
    (simulation) => simulation.simulation_questions.length > 0,
  );

  return mergeSimulationSources(usableSimulations, getFallbackSimulations());
}

export async function getCurrentStudyPlan(): Promise<StudyPlanWithItems | null> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("study_plans")
    .select("*, study_plan_items (*, topics (*, subjects (*)))")
    .eq("user_id", user.id)
    .eq("week_start", getWeekStart())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logQueryError("study_plans.current_week_with_items", error);
    throw new Error(error.message);
  }

  return data as unknown as StudyPlanWithItems | null;
}

export type TodayStudyData = {
  todayItem: StudyPlanWithItems["study_plan_items"][number] | null;
  nextItem: StudyPlanWithItems["study_plan_items"][number] | null;
  dailyGoal: number;
  answeredToday: number;
  streak: number;
};

/** Dados da meta diária: item do plano de hoje, questões de hoje e sequência de dias. */
export async function getTodayStudy(
  plan: StudyPlanWithItems | null,
  profile: Profile | null,
): Promise<TodayStudyData> {
  const { supabase, user } = await requireUser();
  const today = appDateISO();

  const items = (plan?.study_plan_items ?? [])
    .slice()
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  const todayItem = items.find((item) => item.scheduled_date === today) ?? null;
  const nextItem =
    items.find((item) => item.scheduled_date > today && !item.completed) ?? null;

  const since = new Date();
  since.setDate(since.getDate() - 120);
  const { data: recentAnswers, error } = await supabase
    .from("user_question_answers")
    .select("answered_at")
    .eq("user_id", user.id)
    .gte("answered_at", since.toISOString())
    .order("answered_at", { ascending: false })
    .limit(3000);

  if (error) {
    logQueryError("user_question_answers.recent_for_streak", error);
  }

  const answerDates = new Set(
    (recentAnswers ?? []).map((answer) => appDateISO(answer.answered_at)),
  );
  const answeredToday = (recentAnswers ?? []).filter(
    (answer) => appDateISO(answer.answered_at) === today,
  ).length;

  // Sequência: dias consecutivos com pelo menos uma questão respondida.
  // Se hoje ainda não estudou, a sequência vigente termina ontem (não zera).
  let streak = 0;
  const cursor = new Date();
  if (!answerDates.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (answerDates.has(appDateISO(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    todayItem,
    nextItem,
    dailyGoal: getDailyQuestionGoal(profile, todayItem?.question_goal),
    answeredToday,
    streak,
  };
}

export function getDailyQuestionGoal(
  profile: Profile | null,
  planGoal?: number | null,
) {
  const preferences = profile?.study_preferences;
  const stored =
    preferences && typeof preferences === "object" && !Array.isArray(preferences)
      ? Number(preferences.daily_question_goal)
      : NaN;

  if (Number.isFinite(stored) && stored >= 5 && stored <= 60) return stored;
  if (planGoal && planGoal > 0) return planGoal;
  return 10;
}

export async function getReviewQuestions() {
  const questions = await getQuestionRecords();
  return questions.filter((question) => {
    const hasWrongAnswer = question.user_question_answers?.some(
      (answer) => !answer.is_correct,
    );
    const isMarked = Boolean(question.user_question_reviews?.length);
    return hasWrongAnswer || isMarked;
  });
}

function mergeTopicSources(primary: TopicWithSubject[], fallback: TopicWithSubject[]) {
  const seen = new Set(primary.map(topicSignature));
  const merged = [...primary];

  for (const topic of fallback) {
    const signature = topicSignature(topic);
    if (seen.has(signature)) continue;
    seen.add(signature);
    merged.push(topic);
  }

  return merged.sort(
    (a, b) =>
      Number(b.historical_recurrence ?? 0) - Number(a.historical_recurrence ?? 0) ||
      a.subjects.area.localeCompare(b.subjects.area) ||
      a.name.localeCompare(b.name),
  );
}

function topicSignature(topic: TopicWithSubject) {
  return normalizeQuestionKey([
    topic.subjects.area,
    topic.subjects.name,
    topic.name,
  ]);
}

function mergeSimulationSources(
  primary: SimulationWithQuestions[],
  fallback: SimulationWithQuestions[],
) {
  const seen = new Set(primary.map(simulationSignature));
  const merged = [...primary];

  for (const simulation of fallback) {
    const signature = simulationSignature(simulation);
    if (seen.has(signature)) continue;
    seen.add(signature);
    merged.push(simulation);
  }

  return merged;
}

function simulationSignature(simulation: SimulationWithQuestions) {
  return normalizeQuestionKey([simulation.title]);
}

function mergeQuestionRecordSources(
  primary: QuestionRecord[],
  fallback: QuestionRecord[],
) {
  const seen = new Set(primary.map(questionSignature));
  const merged = [...primary];

  for (const question of fallback) {
    const signature = questionSignature(question);
    if (seen.has(signature)) continue;
    seen.add(signature);
    merged.push(question);
  }

  return merged.sort((a, b) => {
    const officialDelta = Number(b.is_official) - Number(a.is_official);
    if (officialDelta) return officialDelta;
    const yearDelta = Number(b.year) - Number(a.year);
    if (yearDelta) return yearDelta;
    return Number(b.priority_score ?? 0) - Number(a.priority_score ?? 0);
  });
}

function questionSignature(question: QuestionRecord) {
  if (question.is_official && question.question_number) {
    return normalizeQuestionKey([
      question.exam_name || "ENEM",
      question.year,
      question.exam_day || "",
      question.question_number,
      question.language || "",
    ]);
  }

  return normalizeQuestionKey([
    question.statement,
    question.year,
    question.source,
    question.question_number || "",
  ]);
}

function normalizeQuestionKey(parts: Array<string | number>) {
  return parts
    .join("|")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function getRadarMethodologyVersions() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("radar_methodology_versions")
    .select("*")
    .order("last_updated_at", { ascending: false });

  if (error) {
    logQueryError("radar_methodology_versions.select", error);
    return [];
  }

  return data ?? [];
}

const essayStatusPriority: Record<string, number> = {
  uploading: 4,
  pending: 0,
  in_review: 1,
  completed: 2,
  cancelled: 3,
  upload_failed: 5,
};

export async function getCreditsData({
  ledgerPage = 1,
  ledgerPageSize = 8,
}: {
  ledgerPage?: number;
  ledgerPageSize?: number;
} = {}): Promise<CreditsData> {
  const { supabase, user } = await requirePlatformAccess();

  const { data: account, error: accountError } = await supabase.rpc(
    "ensure_credit_account",
    { target_user_id: user.id },
  );
  if (accountError || !account) {
    logQueryError("credit_accounts.ensure", accountError);
    throw new Error(accountError?.message ?? "Não foi possível carregar créditos.");
  }

  const safeLedgerPageSize = Math.max(1, Math.floor(ledgerPageSize));
  const requestedLedgerPage = Math.max(1, Math.floor(ledgerPage));
  const { count: ledgerTotal, error: ledgerCountError } = await supabase
    .from("credit_ledger")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (ledgerCountError) {
    logQueryError("credit_ledger.count", ledgerCountError);
  }

  const safeLedgerTotal = ledgerTotal ?? 0;
  const ledgerPageCount = Math.max(1, Math.ceil(safeLedgerTotal / safeLedgerPageSize));
  const currentLedgerPage = Math.min(requestedLedgerPage, ledgerPageCount);
  const ledgerFrom = (currentLedgerPage - 1) * safeLedgerPageSize;
  const ledgerTo = ledgerFrom + safeLedgerPageSize - 1;

  const [ledgerResult, essaysResult] = await Promise.all([
    supabase
      .from("credit_ledger")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(ledgerFrom, ledgerTo),
    supabase
      .from("essay_submissions")
      .select("*")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(5),
  ]);

  if (ledgerResult.error) {
    logQueryError("credit_ledger.recent", ledgerResult.error);
  }
  if (essaysResult.error) {
    logQueryError("essay_submissions.recent", essaysResult.error);
  }

  return {
    account,
    ledger: ledgerResult.data ?? [],
    ledgerPage: currentLedgerPage,
    ledgerPageSize: safeLedgerPageSize,
    ledgerTotal: safeLedgerTotal,
    recentEssays: essaysResult.data ?? [],
  };
}

export async function getDashboardEssayCreditData(): Promise<DashboardEssayCreditData> {
  const { supabase, user } = await requirePlatformAccess();

  const { data: account, error: accountError } = await supabase.rpc(
    "ensure_credit_account",
    { target_user_id: user.id },
  );
  if (accountError || !account) {
    logQueryError("credit_accounts.ensure_for_dashboard", accountError);
    throw new Error(accountError?.message ?? "Não foi possível carregar créditos.");
  }

  const [
    ledgerResult,
    recentEssayResult,
    totalResult,
    pendingResult,
    inReviewResult,
    completedResult,
  ] = await Promise.all([
    supabase
      .from("credit_ledger")
      .select("*")
      .eq("user_id", user.id)
      .lt("amount", 0)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("essay_submissions")
      .select("*")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(1),
    supabase
      .from("essay_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("essay_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("essay_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "in_review"),
    supabase
      .from("essay_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed"),
  ]);

  if (ledgerResult.error) logQueryError("credit_ledger.latest_debit", ledgerResult.error);
  if (recentEssayResult.error) logQueryError("essay_submissions.latest", recentEssayResult.error);
  if (totalResult.error) logQueryError("essay_submissions.count.total", totalResult.error);
  if (pendingResult.error) logQueryError("essay_submissions.count.pending", pendingResult.error);
  if (inReviewResult.error) logQueryError("essay_submissions.count.in_review", inReviewResult.error);
  if (completedResult.error) logQueryError("essay_submissions.count.completed", completedResult.error);

  return {
    account,
    latestDebit: ledgerResult.data?.[0] ?? null,
    latestEssay: recentEssayResult.data?.[0] ?? null,
    essayCounts: {
      total: totalResult.count ?? 0,
      pending: pendingResult.count ?? 0,
      inReview: inReviewResult.count ?? 0,
      completed: completedResult.count ?? 0,
    },
  };
}

export async function getEssayCorrectionData(): Promise<EssayCorrectionData> {
  const { supabase, user } = await requirePlatformAccess();

  const { data: account, error: accountError } = await supabase.rpc(
    "ensure_credit_account",
    { target_user_id: user.id },
  );
  if (accountError || !account) {
    logQueryError("credit_accounts.ensure_for_essay", accountError);
    throw new Error(accountError?.message ?? "Não foi possível carregar créditos.");
  }

  const [submissionsResult, topicUnlocksResult] = await Promise.all([
    supabase
      .from("essay_submissions")
      .select("*, essay_submission_files(*)")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .order("page_order", { referencedTable: "essay_submission_files", ascending: true })
      .limit(8),
    supabase
      .from("credit_ledger")
      .select("metadata")
      .eq("user_id", user.id)
      .eq("reason", "weekly_essay_topic"),
  ]);

  if (submissionsResult.error) {
    logQueryError("essay_submissions.by_user", submissionsResult.error);
  }
  if (topicUnlocksResult.error) {
    logQueryError("credit_ledger.weekly_topic_unlocks", topicUnlocksResult.error);
  }

  return {
    account,
    submissions: submissionsResult.data ?? [],
    weeklyTopicUnlocks: (topicUnlocksResult.data ?? [])
      .map((entry) =>
        typeof entry.metadata === "object" &&
        entry.metadata &&
        !Array.isArray(entry.metadata) &&
        "topic_id" in entry.metadata &&
        typeof entry.metadata.topic_id === "string"
          ? entry.metadata.topic_id
          : null,
      )
      .filter((topicId): topicId is string => Boolean(topicId)),
  };
}

async function requireEssayAdminAccess() {
  const context = await requirePlatformAccess();
  if (!canEditEditorial(context.profile?.access_level)) {
    redirect("/dashboard");
  }
  return context;
}

export type AdminEssayQueueFilters = {
  status?: string;
  from?: string;
  to?: string;
  student?: string;
  responsible?: string;
  unassigned?: string;
};

export async function getAdminEssayQueue(
  filters: AdminEssayQueueFilters = {},
): Promise<EssaySubmissionWithProfile[]> {
  const { supabase } = await requireEssayAdminAccess();

  let query = supabase
    .from("essay_submissions")
    .select("*, essay_submission_files(*)")
    .order("submitted_at", { ascending: true })
    .order("page_order", { referencedTable: "essay_submission_files", ascending: true })
    .limit(300);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.from) {
    query = query.gte("submitted_at", `${filters.from}T00:00:00.000Z`);
  }
  if (filters.to) {
    query = query.lte("submitted_at", `${filters.to}T23:59:59.999Z`);
  }
  if (filters.unassigned === "1") {
    query = query.is("assigned_admin_id", null);
  }

  const { data, error } = await query;
  if (error) {
    logQueryError("essay_submissions.admin_queue", error);
    throw new Error(error.message);
  }

  const student = filters.student?.trim().toLowerCase();
  const responsible = filters.responsible?.trim().toLowerCase();
  const rawRows = (data ?? []) as EssaySubmissionWithProfile[];
  const userIds = Array.from(new Set(rawRows.map((item) => item.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", userIds)
    : { data: [] };
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const adminIds = Array.from(
    new Set(rawRows.map((item) => item.assigned_admin_id).filter(Boolean)),
  ) as string[];
  const { data: adminProfiles } = adminIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", adminIds)
    : { data: [] };
  const adminProfilesById = new Map(
    (adminProfiles ?? []).map((profile) => [profile.id, profile]),
  );
  const rows = rawRows.map((item) => ({
    ...item,
    profiles: profilesById.get(item.user_id) ?? null,
    assigned_admin_profile: item.assigned_admin_id
      ? adminProfilesById.get(item.assigned_admin_id) ?? null
      : null,
  })).filter((item) => {
    if (!student) return true;
    const profile = item.profiles;
    return (
      profile?.full_name?.toLowerCase().includes(student) ||
      profile?.email?.toLowerCase().includes(student)
    );
  }).filter((item) => {
    if (!responsible) return true;
    const profile = item.assigned_admin_profile;
    return (
      item.assigned_admin_id?.toLowerCase().includes(responsible) ||
      profile?.full_name?.toLowerCase().includes(responsible) ||
      profile?.email?.toLowerCase().includes(responsible)
    );
  });

  return rows.sort((a, b) => {
    const statusDelta =
      (essayStatusPriority[a.status] ?? 99) - (essayStatusPriority[b.status] ?? 99);
    if (statusDelta) return statusDelta;
    return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
  });
}

export async function getAdminEssayDetail(id: string): Promise<EssaySubmissionDetail | null> {
  const { supabase } = await requireEssayAdminAccess();

  const { data, error } = await supabase
    .from("essay_submissions")
    .select("*, essay_submission_files(*), essay_submission_events(*), essay_correction_results(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logQueryError("essay_submissions.admin_detail", error);
    throw new Error(error.message);
  }
  if (!data) return null;

  const detail = data as unknown as EssaySubmissionDetail;
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", detail.user_id)
    .maybeSingle();
  detail.profiles = studentProfile ?? null;

  if (detail.assigned_admin_id) {
    const { data: assigned } = await supabase
      .from("profiles")
      .select("full_name,email")
      .eq("id", detail.assigned_admin_id)
      .maybeSingle();
    detail.assigned_admin_profile = assigned ?? null;
  }
  if (detail.completed_by) {
    const { data: completedBy } = await supabase
      .from("profiles")
      .select("full_name,email")
      .eq("id", detail.completed_by)
      .maybeSingle();
    detail.completed_by_profile = completedBy ?? null;
  }

  detail.essay_submission_files = [...(detail.essay_submission_files ?? [])].sort(
    (a, b) => a.page_order - b.page_order,
  );

  detail.essay_submission_events = [...(detail.essay_submission_events ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return detail;
}

export async function getStudentEssayDetail(id: string): Promise<EssaySubmissionDetail | null> {
  const { supabase, user } = await requirePlatformAccess();

  const { data, error } = await supabase
    .from("essay_submissions")
    .select("*, essay_submission_files(*), essay_submission_events(*), essay_correction_results(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logQueryError("essay_submissions.student_detail", error);
    throw new Error(error.message);
  }
  if (!data) return null;

  const detail = data as unknown as EssaySubmissionDetail;
  detail.essay_submission_files = [...(detail.essay_submission_files ?? [])].sort(
    (a, b) => a.page_order - b.page_order,
  );
  return detail;
}
