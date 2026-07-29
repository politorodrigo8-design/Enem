import { cache } from "react";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-config";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatDateTime, getWeekStart } from "@/lib/db/scoring";
import {
  perceivedDifficultiesFromProfile,
  prioritizeTopics,
} from "@/lib/study/priorities";
import { calculateStudyStreak } from "@/lib/study/streak.mjs";
import { appDateISO } from "@/lib/dates";
import { cleanQuestionStatement } from "@/lib/questions/rules.mjs";
import { buildAreaMetrics } from "@/lib/db/metrics";
import {
  getFallbackQuestionRecords,
  getFallbackSimulations,
  getFallbackTopicsWithPerformance,
  isFallbackQuestionId,
} from "@/lib/db/fallback-content";
import type {
  ActivityRecord,
  ActivePracticeSession,
  CreditsData,
  DashboardEssayCreditData,
  EssayCorrectionData,
  EssaySubmissionDetail,
  EssaySubmissionWithProfile,
  FeedbackInboxItem,
  FeedbackStatus,
  FeedbackType,
  AnsweredQuestionMetric,
  PracticeQuestionContent,
  PracticeQuestionRecord,
  Profile,
  QuestionRecord,
  Referral,
  ReferralDashboardData,
  SimulationWithQuestions,
  StudyPlanWithItems,
  TopicWithSubject,
} from "@/lib/db/types";
import { canEditEditorial } from "@/lib/editorial/rules.mjs";
import { isProfilePhotoDataUrl } from "@/lib/profile-photo";
import { isStudentReadyQuestion } from "@/lib/questions/quality";
import { processPendingReferralRewardsForUser } from "@/lib/referrals/server";

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

// A API do Supabase corta cada resposta em `max_rows` (supabase/config.toml).
// Precisa acompanhar esse teto: uma página maior volta cortada em silêncio.
const supabaseMaxRows = 1000;

/**
 * Lê uma tabela inteira sem descobrir o fim página a página: uma requisição
 * `head` traz a contagem e todas as páginas saem juntas. Devolve `null` no
 * primeiro erro, para o chamador decidir o fallback.
 */
async function fetchAllRows({
  queryName,
  countRows,
  fetchPage,
  pageSize = supabaseMaxRows,
}: {
  queryName: string;
  countRows: () => PromiseLike<{ count: number | null; error: QueryError | null }>;
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown[] | null; error: QueryError | null }>;
  pageSize?: number;
}): Promise<unknown[] | null> {
  const { count, error: countError } = await countRows();
  if (countError) {
    logQueryError(`${queryName}.count`, countError);
    return null;
  }

  const pageCount = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, page) =>
      fetchPage(page * pageSize, page * pageSize + pageSize - 1),
    ),
  );

  const rows: unknown[] = [];
  for (const page of pages) {
    if (page.error) {
      logQueryError(queryName, page.error);
      return null;
    }
    rows.push(...(page.data ?? []));
  }

  return rows;
}

// O gabarito (correct_option) e a resolução (explanation) nunca devem chegar ao
// cliente junto da questão: o payload RSC é inspecionável e revelaria a resposta
// antes do envio. Esses campos voltam apenas na resposta da action, após responder.
function stripAnswerKey<T extends { correct_option: string; explanation: string }>(
  question: T,
): T {
  return { ...question, correct_option: "", explanation: "" };
}

// Campos que existem no registro lido do banco e não podem sobrar no índice:
// conteúdo da questão (vai sob demanda) e gabarito (só volta pela action).
type PracticeSummaryLeftovers = Partial<
  Pick<PracticeQuestionRow, "statement" | "question_options" | "correct_option"> & {
    explanation: string;
  }
>;

function toPracticeSummary(
  question: PracticeQuestionRow | QuestionRecord,
): PracticeQuestionRecord {
  const summary: PracticeQuestionRecord & PracticeSummaryLeftovers = { ...question };
  delete summary.statement;
  delete summary.question_options;
  delete summary.correct_option;
  delete summary.explanation;
  return summary;
}

// 150 uuids ≈ 5,5 KB de URL, com folga larga para o limite do servidor.
const mediaIdBatchSize = 150;

async function attachQuestionMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  questions: QuestionRecord[],
) {
  const questionIds = questions.map((question) => question.id);
  if (!questionIds.length) {
    return questions;
  }

  // Os ids vão em lotes porque `in.(...)` viaja na URL: com o acervo inteiro a
  // requisição passava de 48 KB e o Supabase respondia 414 (URI too long). O
  // erro era silencioso — devolvia mídia vazia para TODAS as questões, e o filtro
  // de qualidade então descartava as ~194 que exigem imagem. As imagens existiam
  // no banco e nunca chegavam à tela.
  const mediaRows: NonNullable<QuestionRecord["question_media"]> = [];
  for (let index = 0; index < questionIds.length; index += mediaIdBatchSize) {
    const batch = questionIds.slice(index, index + mediaIdBatchSize);
    const { data, error } = await supabase
      .from("question_media")
      .select("*")
      .in("question_id", batch)
      .order("sort_order", { ascending: true });

    if (error) {
      logQueryError("question_media.by_question_ids", error);
      return questions.map((question) => ({ ...question, question_media: [] }));
    }

    mediaRows.push(...(data ?? []));
  }

  const mediaByQuestion = new Map<string, NonNullable<QuestionRecord["question_media"]>>();
  for (const media of mediaRows) {
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
    unreadFeedbackCount:
      access.level === "admin" ? await getUnreadFeedbackCountForAdmin() : 0,
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

// O acervo inteiro atravessa o payload RSC a cada navegação: `select *` levava
// ~3,6 MB de colunas editoriais (explanation, editorial_notes, urls de fonte,
// carimbos de revisão) que nenhuma tela renderiza.
//
// `statement` e `question_options` continuam sendo lidos aqui — o filtro de
// qualidade precisa deles e as regras vivem em TypeScript (quality.ts), não em
// SQL — mas saem do registro antes de virar payload: quem os quer usa
// getPracticeQuestionContent. Idem `correct_option`; `explanation` nem entra.
//
// `question_media` vem embutido pela FK: a versão anterior fazia ~9 requisições
// sequenciais de `in.(...)` só para colar a mídia de volta.
const practiceQuestionSelect = `
  id, statement, difficulty, year, source, exam_name, exam_color, exam_day,
  question_number, is_demo, is_official, is_authorial, is_inspired,
  priority_reason, recurrence_category, review_status, reviewed,
  source_verified, answer_verified, media_required, correct_option,
  subjects (id, name, area),
  topics (id, name),
  question_options (option_key, option_text),
  question_media (*),
  user_question_answers (id, question_id, practice_session_id, selected_option, is_correct, response_time_seconds, answered_at),
  user_question_reviews (id, mastered),
  user_question_favorites (id)
`;

type PracticeQuestionRow = PracticeQuestionRecord &
  PracticeQuestionContent & { correct_option: string };

// Sem paginar, o acervo parava de crescer para o aluno: com 1309 questões no
// banco chegavam 1000 ao servidor e 933 à tela, ou seja, ~300 questões ficavam
// invisíveis em silêncio — e o número piora a cada importação.
const fetchQuestionRows = cache(async function fetchQuestionRows(): Promise<
  PracticeQuestionRow[] | null
> {
  const { supabase, user } = await requireUser();

  const rows = await fetchAllRows({
    queryName: "questions.with_user_answers_and_reviews",
    countRows: () =>
      supabase.from("questions").select("id", { count: "exact", head: true }),
    fetchPage: (from, to) =>
      supabase
        .from("questions")
        .select(practiceQuestionSelect)
        .eq("user_question_answers.user_id", user.id)
        .eq("user_question_reviews.user_id", user.id)
        .eq("user_question_favorites.user_id", user.id)
        .order("created_at", { ascending: true })
        .range(from, to),
  });

  if (!rows) return null;
  return (rows as unknown as PracticeQuestionRow[]).filter(isStudentReadyQuestion);
});

// Cache por requisição: `/dashboard/diagnostico` chamava o acervo duas vezes
// (getDashboardData + getAreaMetrics) e baixava tudo em dobro.
export const getQuestionRecords = cache(
  async function getQuestionRecords(): Promise<PracticeQuestionRecord[]> {
    const rows = await fetchQuestionRows();

    // O acervo local só entra quando o banco não tem nada a servir (`null` cobre
    // o banco indisponível). Mesclar os dois quando o banco respondeu injetava
    // questões com id sintético `fallback-question-*`, e resposta nesse id não
    // tem onde ser gravada: user_question_answers.question_id referencia
    // questions(id). O aluno lia "Resposta correta." e nada entrava no
    // desempenho, na sequência de estudo nem na revisão de erros.
    // Para publicar o acervo local no banco: scripts/import-questions.mjs --commit.
    if (!rows?.length) return getFallbackQuestionRecords().map(toPracticeSummary);
    return rows.map(toPracticeSummary);
  },
);

/**
 * Enunciado e alternativas das questões pedidas — o que o índice do acervo
 * deixou de fora. Chamado para a questão aberta e as vizinhas, não para o banco
 * inteiro.
 */
export async function getPracticeQuestionContent(
  questionIds: string[],
): Promise<PracticeQuestionContent[]> {
  const ids = Array.from(new Set(questionIds.filter(Boolean)));
  if (!ids.length) return [];

  // Busca por id, nunca varrendo o acervo: são poucas questões por chamada e
  // reaproveitar a leitura completa aqui traria as ~1,2 mil linhas de volta a
  // cada avanço de questão.
  const localIds = ids.filter(isFallbackQuestionId);
  const databaseIds = ids.filter((id) => !isFallbackQuestionId(id));
  const content: PracticeQuestionContent[] = [];

  if (databaseIds.length) {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("questions")
      .select("id, statement, question_options (option_key, option_text)")
      .in("id", databaseIds);

    if (error) logQueryError("questions.content.by_ids", error);
    else content.push(...(data ?? []).map(toQuestionContent));
  }

  if (localIds.length) {
    const localById = new Map(
      getFallbackQuestionRecords().map((question) => [question.id, question]),
    );
    for (const id of localIds) {
      const question = localById.get(id);
      if (question) content.push(toQuestionContent(question));
    }
  }

  return content;
}

function toQuestionContent(question: {
  id: string;
  statement: string;
  question_options: Array<{ option_key: string; option_text: string }>;
}): PracticeQuestionContent {
  return {
    id: question.id,
    // O enunciado é limpo no ponto em que o conteúdo é servido: a marca d'água
    // da digitalização continua no banco, só não é exibida.
    statement: cleanQuestionStatement(question.statement),
    question_options: question.question_options.map((option) => ({
      option_key: option.option_key,
      option_text: option.option_text,
    })),
  };
}

// Resolve o id de um tópico do banco para o nome canônico do assunto. Links de
// plano de estudos apontam topic_id, mas o filtro do Praticar casa por nome —
// inclusive para questões do acervo local, cujos tópicos têm ids próprios.
export async function getTopicNameById(topicId: string): Promise<string | null> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("topics")
    .select("name")
    .eq("id", topicId)
    .maybeSingle();

  if (error) {
    logQueryError("topics.name.by_id", error);
    return null;
  }

  return data?.name ?? null;
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

type AnsweredQuestionRow = {
  id: string;
  question_id: string;
  is_correct: boolean;
  response_time_seconds: number | null;
  answered_at: string;
  questions: {
    subjects: { name: string; area: string } | null;
    topics: { name: string } | null;
  } | null;
};

/**
 * As respostas do aluno com a taxonomia da questão anexada, em ordem
 * cronológica. Desempenho e diagnóstico se apoiavam no acervo inteiro para
 * chegar nesses mesmos números: eram ~1,2 mil questões baixadas para somar
 * algumas centenas de respostas.
 */
export const getAnsweredQuestionMetrics = cache(
  async function getAnsweredQuestionMetrics(): Promise<AnsweredQuestionMetric[]> {
    const { supabase, user } = await requireUser();

    const rows = await fetchAllRows({
      queryName: "user_question_answers.with_question_taxonomy",
      countRows: () =>
        supabase
          .from("user_question_answers")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      fetchPage: (from, to) =>
        supabase
          .from("user_question_answers")
          .select(
            "id, question_id, is_correct, response_time_seconds, answered_at, questions (subjects (name, area), topics (name))",
          )
          .eq("user_id", user.id)
          .order("answered_at", { ascending: true })
          .range(from, to),
    });

    if (!rows) return [];

    return (rows as unknown as AnsweredQuestionRow[]).map((row) => ({
      id: row.id,
      question_id: row.question_id,
      is_correct: row.is_correct,
      response_time_seconds: row.response_time_seconds ?? 0,
      answered_at: row.answered_at,
      area: row.questions?.subjects?.area ?? "",
      subject: row.questions?.subjects?.name ?? "",
      topic: row.questions?.topics?.name ?? "",
    }));
  },
);


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
  const [profile, answers, topics, plan] = await Promise.all([
    getProfile(),
    getAnsweredQuestionMetrics(),
    getTopicsWithPerformance(),
    getCurrentStudyPlan(),
  ]);

  const areaMetrics = buildAreaMetrics(answers);
  const answered = answers.length;
  const correct = answers.filter((answer) => answer.is_correct).length;
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;

  const priorities = prioritizeTopics(
    topics,
    perceivedDifficultiesFromProfile(profile),
  ).slice(0, 4);

  // As respostas já vêm ordenadas por data: as cinco últimas são de fato as mais
  // recentes. Antes a lista seguia a ordem do acervo, então "atividade recente"
  // podia mostrar respostas antigas de questões cadastradas por último.
  const recentActivities: ActivityRecord[] = answers
    .slice(-5)
    .reverse()
    .map((answer) => ({
      id: answer.id,
      title: answer.is_correct ? "Questão correta registrada" : "Erro registrado",
      description:
        answer.subject && answer.topic
          ? `${answer.subject}: ${answer.topic}`
          : "Resposta salva no banco.",
      timestamp: formatDateTime(answer.answered_at),
      type: "questões",
    }));

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
      user_simulations (*, user_simulation_answers (*))
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

export async function getActivePracticeSession(
  source: "question_bank" | "review" | "high_priority" = "question_bank",
): Promise<ActivePracticeSession | null> {
  const { supabase, user } = await requireUser();
  const { data: session, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("source", source)
    .eq("status", "Em andamento")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logQueryError("practice_sessions.active", error);
    return null;
  }

  if (!session) return null;

  const { data: answers, error: answersError } = await supabase
    .from("user_question_answers")
    .select("question_id, selected_option, is_correct, answered_at, questions (correct_option, explanation)")
    .eq("user_id", user.id)
    .eq("practice_session_id", session.id);

  if (answersError) {
    logQueryError("practice_sessions.active.answers", answersError);
  }

  return {
    ...session,
    answers: (answers ?? []).map((answer) => {
      const question = Array.isArray(answer.questions)
        ? answer.questions[0]
        : answer.questions;
      return {
        question_id: answer.question_id,
        selected_option: answer.selected_option,
        is_correct: answer.is_correct,
        answered_at: answer.answered_at,
        correct_option: question?.correct_option ?? "",
        explanation: question?.explanation ?? null,
      };
    }),
  } as ActivePracticeSession;
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
  studiedToday: boolean;
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

  // Sequência: dias consecutivos com resposta ou atividade do plano concluída.
  // Se hoje ainda não estudou, a sequência vigente termina ontem (não zera).
  const { data: recentCompletedItems, error: completedItemsError } = await supabase
    .from("study_plan_items")
    .select("completed_at, study_plans!inner(user_id)")
    .eq("study_plans.user_id", user.id)
    .eq("completed", true)
    .not("completed_at", "is", null)
    .gte("completed_at", since.toISOString())
    .order("completed_at", { ascending: false })
    .limit(300);

  if (completedItemsError) {
    logQueryError("study_plan_items.recent_completed_for_streak", completedItemsError);
  }

  const studyDates = new Set(answerDates);
  for (const item of recentCompletedItems ?? []) {
    if (item.completed_at) studyDates.add(appDateISO(item.completed_at));
  }
  const studiedToday = studyDates.has(today);

  return {
    todayItem,
    nextItem,
    dailyGoal: getDailyQuestionGoal(profile, todayItem?.question_goal),
    answeredToday,
    studiedToday,
    streak: calculateStudyStreak(studyDates, today),
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

  await processPendingReferralRewardsForUser(user.id);

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
    referrals: await getReferralDashboardData(supabase, user.id),
  };
}

export async function getReferralAccountSummary() {
  const { supabase, user } = await requirePlatformAccess();
  const { data, error } = await supabase.rpc("ensure_referral_code", {
    target_user_id: user.id,
  });

  if (error) {
    logQueryError("referrals.ensure_code.settings", error);
    return { referralCode: "" };
  }

  return { referralCode: data ?? "" };
}

/** Dados do programa de indicação para a página dedicada /dashboard/indicacoes. */
export async function getReferralPageData(): Promise<ReferralDashboardData> {
  const { supabase, user } = await requirePlatformAccess();
  return getReferralDashboardData(supabase, user.id);
}

async function getReferralDashboardData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ReferralDashboardData> {
  const [codeResult, referralsResult, ledgerResult] = await Promise.all([
    supabase.rpc("ensure_referral_code", { target_user_id: userId }),
    supabase
      .from("referrals")
      .select("*")
      .eq("referrer_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("credit_ledger")
      .select("amount, reason, metadata")
      .eq("user_id", userId)
      .in("reason", ["referral_referrer_bonus", "referral_bonus_reversal"]),
  ]);

  if (codeResult.error) logQueryError("referrals.ensure_code.credits", codeResult.error);
  if (referralsResult.error) logQueryError("referrals.dashboard", referralsResult.error);
  if (ledgerResult.error) logQueryError("credit_ledger.referral_totals", ledgerResult.error);

  const referrals = (referralsResult.data ?? []) as Referral[];
  const referredNames = await getReferredFirstNames(referrals);
  const totalCreditsEarned = (ledgerResult.data ?? []).reduce((total, entry) => {
    if (entry.reason === "referral_referrer_bonus") return total + entry.amount;
    if (
      entry.reason === "referral_bonus_reversal" &&
      isObjectRecord(entry.metadata) &&
      entry.metadata.reward_role === "referrer"
    ) {
      return total + entry.amount;
    }
    return total;
  }, 0);

  return {
    referralCode: codeResult.data ?? "",
    convertedInvites: referrals.filter((referral) => Boolean(referral.purchased_at)).length,
    pendingRewards: referrals.filter((referral) =>
      ["payment_confirmed", "pending_release"].includes(referral.status),
    ).length,
    confirmedRewards: referrals.filter(
      (referral) =>
        referral.status === "reward_granted" &&
        Boolean(referral.referrer_reward_granted_at) &&
        !referral.referrer_reversal_ledger_id,
    ).length,
    totalCreditsEarned,
    history: referrals.map((referral, index) => ({
      id: referral.id,
      referredName: referredNames.get(referral.referred_user_id) ?? `Amigo ${index + 1}`,
      date: referral.purchased_at ?? referral.attributed_at,
      status: referral.status,
      rewardLabel: getReferralRewardLabel(referral),
      statusReason: getReferralStatusReason(referral),
    })),
  };
}

async function getReferredFirstNames(referrals: Referral[]) {
  const names = new Map<string, string>();
  const referredIds = Array.from(new Set(referrals.map((referral) => referral.referred_user_id)));
  if (!referredIds.length || !isSupabaseAdminConfigured()) return names;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", referredIds);

  if (error) {
    logQueryError("profiles.referrals.first_names", error);
    return names;
  }

  const profiles = (data ?? []) as Array<{ id: string; full_name: string | null }>;
  for (const profile of profiles) {
    const firstName = String(profile.full_name ?? "").trim().split(/\s+/)[0];
    names.set(profile.id, firstName || "Amigo indicado");
  }

  return names;
}

function getReferralRewardLabel(referral: Referral) {
  if (referral.status === "reward_granted") {
    return `+${referral.referrer_reward_credits} créditos`;
  }
  if (referral.status === "pending_release" || referral.status === "payment_confirmed") {
    return `${referral.referrer_reward_credits} créditos pendentes`;
  }
  if (referral.status === "awaiting_purchase" || referral.status === "registered") {
    return `${referral.referrer_reward_credits} créditos após a compra`;
  }
  return "Sem recompensa";
}

function getReferralStatusReason(referral: Referral) {
  const reason = referral.cancellation_reason;
  if (!reason) return null;
  if (reason === "not_first_valid_purchase") {
    return "Somente a primeira compra válida gera recompensa.";
  }
  if (reason === "manual_review_blocked") {
    return "Caso bloqueado para revisão manual.";
  }
  if (reason === "refunded" || reason === "charged_back") {
    return "Compra estornada pelo provedor de pagamento.";
  }
  return "Recompensa cancelada pelas regras do programa.";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

export type AdminFeedbackFilters = {
  status?: string;
  type?: string;
  rating?: string;
  from?: string;
  to?: string;
  search?: string;
};

export async function getAdminFeedbackInbox(
  filters: AdminFeedbackFilters = {},
): Promise<FeedbackInboxItem[]> {
  const { supabase } = await requireEssayAdminAccess();

  let query = supabase
    .from("feedbacks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status as FeedbackStatus);
  }
  if (filters.type && filters.type !== "all") {
    query = query.eq("feedback_type", filters.type as FeedbackType);
  }
  if (filters.rating && filters.rating !== "all") {
    query = query.eq("rating", Number(filters.rating));
  }
  if (filters.from) {
    query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  }
  if (filters.to) {
    query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  }

  const { data, error } = await query;
  if (error) {
    logQueryError("feedbacks.admin_inbox", error);
    return [];
  }

  const userIds = Array.from(new Set((data ?? []).map((item) => item.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds)
    : { data: [] };
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  // O join com profiles vem antes do filtro para a busca enxergar nome/e-mail.
  return (data ?? [])
    .map((item) => ({
      ...item,
      profiles: profilesById.get(item.user_id) ?? null,
    }))
    .filter((item) => feedbackMatchesSearch(item, filters.search));
}

async function getUnreadFeedbackCountForAdmin() {
  const { supabase } = await requireUser();
  const { count, error } = await supabase
    .from("feedbacks")
    .select("id", { count: "exact", head: true })
    .eq("status", "novo");

  if (error) {
    logQueryError("feedbacks.unread_count", error);
    return 0;
  }

  return count ?? 0;
}

function feedbackMatchesSearch(item: FeedbackInboxItem, search?: string) {
  const term = search?.trim().toLowerCase();
  if (!term) return true;

  return [
    item.id,
    item.email,
    item.profiles?.full_name,
    item.profiles?.email,
    item.message,
    item.route,
    item.related_id,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
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
