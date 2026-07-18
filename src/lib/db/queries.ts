import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  calculatePriorityScore,
  formatDateTime,
  getWeekStart,
} from "@/lib/db/scoring";
import type {
  ActivityRecord,
  AreaMetric,
  Profile,
  QuestionRecord,
  SimulationWithQuestions,
  StudyPlanWithItems,
  TopicWithSubject,
} from "@/lib/db/types";

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

  console.error(`[NexoENEM db] ${queryName}`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
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
    fullName:
      profile?.full_name?.trim() ||
      metadataFullName.trim() ||
      "Estudante NexoENEM",
    email: profile?.email || user.email || "",
    accessLevel: access.level,
    betaTester: access.betaTester,
  };
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
    throw new Error(error.message);
  }

  return attachQuestionMedia(supabase, (data ?? []) as unknown as QuestionRecord[]);
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
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as TopicWithSubject[];
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

  const priorities = topics
    .map((topic) => {
      const performance = topic.user_topic_performance?.[0];
      return {
        topic,
        performance,
        score: performance?.priority_score || calculatePriorityScore(topic, performance),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

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
    .order("title");

  if (error) {
    logQueryError("simulations.with_questions_and_user_attempts", error);
    throw new Error(error.message);
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

  return simulations.map((simulation) => ({
    ...simulation,
    simulation_questions: simulation.simulation_questions.map((item) => ({
      ...item,
      questions: {
        ...item.questions,
        question_media: mediaByQuestion.get(item.questions.id) ?? [],
      },
    })),
  }));
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

export async function getHighPriorityQuestionRecords() {
  const questions = await getQuestionRecords();

  const reviewedHighPriority = questions.filter(
    (question) =>
      question.reviewed &&
      question.review_status === "approved" &&
      question.source_verified &&
      question.answer_verified &&
      question.confidence_level &&
      question.priority_reason &&
      [
        "Potencial muito alto de recorrencia do conteudo",
        "Alta prioridade",
      ].includes(question.recurrence_category),
  );

  const source = reviewedHighPriority.length
    ? reviewedHighPriority
    : questions.filter((question) => question.is_demo);

  return source
    .map((question) => {
      const topicScore = calculatePriorityScore(question.topics);
      const editorialScore = Number(question.priority_score ?? 0);
      return {
        question,
        score: Number((topicScore + editorialScore).toFixed(2)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.question);
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
