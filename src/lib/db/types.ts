import type { Database } from "@/lib/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Subject = Database["public"]["Tables"]["subjects"]["Row"];
export type Topic = Database["public"]["Tables"]["topics"]["Row"];
export type QuestionOption = Database["public"]["Tables"]["question_options"]["Row"];
export type QuestionMedia = Database["public"]["Tables"]["question_media"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type PracticeSession = Database["public"]["Tables"]["practice_sessions"]["Row"];
export type Simulation = Database["public"]["Tables"]["simulations"]["Row"];
export type UserSimulation = Database["public"]["Tables"]["user_simulations"]["Row"];
export type StudyPlan = Database["public"]["Tables"]["study_plans"]["Row"];
export type StudyPlanItem = Database["public"]["Tables"]["study_plan_items"]["Row"];
export type TopicPerformance =
  Database["public"]["Tables"]["user_topic_performance"]["Row"];
export type CreditAccount = Database["public"]["Tables"]["credit_accounts"]["Row"];
export type CreditLedgerEntry = Database["public"]["Tables"]["credit_ledger"]["Row"];
export type Referral = Database["public"]["Tables"]["referrals"]["Row"];
export type EssaySubmission = Database["public"]["Tables"]["essay_submissions"]["Row"];
export type EssaySubmissionFile =
  Database["public"]["Tables"]["essay_submission_files"]["Row"];
export type EssaySubmissionEvent =
  Database["public"]["Tables"]["essay_submission_events"]["Row"];
export type EssayCorrectionResult =
  Database["public"]["Tables"]["essay_correction_results"]["Row"];

export type Feedback = Database["public"]["Tables"]["feedbacks"]["Row"];
export type FeedbackStatus = Feedback["status"];
export type FeedbackType = Feedback["feedback_type"];
export type FeedbackInboxItem = Feedback & {
  profiles?: Pick<Profile, "full_name" | "email"> | null;
};

export type QuestionRecord = Question & {
  media_url?: string | null;
  media_alt?: string | null;
  media_metadata?: Database["public"]["Tables"]["profiles"]["Row"]["perceived_difficulties"];
  subjects: Subject;
  topics: Topic;
  question_options: QuestionOption[];
  question_media?: QuestionMedia[];
  user_question_answers?: Array<{
    id: string;
    question_id: string;
    practice_session_id?: string | null;
    selected_option: string;
    is_correct: boolean;
    response_time_seconds: number;
    answered_at: string;
  }>;
  user_question_reviews?: Array<{ id: string; mastered: boolean }>;
  user_question_favorites?: Array<{ id: string }>;
};

export type QuestionUserAnswer = NonNullable<
  QuestionRecord["user_question_answers"]
>[number];

/**
 * Índice do acervo servido ao aluno (Praticar e Já respondidas). O acervo
 * inteiro atravessa o payload RSC a cada navegação, então aqui entra só o que
 * filtra, ordena e rotula uma questão na lista — nunca o conteúdo dela.
 *
 * Enunciado e alternativas ficam em `PracticeQuestionContent`, buscados sob
 * demanda para a questão aberta: são ~1,2 MB do acervo e o aluno lê uma questão
 * por vez. `explanation` e `correct_option` não entram em nenhum dos dois — a
 * resolução só volta pela action, depois de responder.
 *
 * Editorial e simulados continuam com `QuestionRecord` completo, que é o
 * registro de escrita/administração.
 */
export type PracticeQuestionRecord = Pick<
  Question,
  | "id"
  | "difficulty"
  | "year"
  | "source"
  | "exam_name"
  | "exam_color"
  | "exam_day"
  | "question_number"
  | "is_demo"
  | "is_official"
  | "is_authorial"
  | "is_inspired"
  | "priority_reason"
  | "recurrence_category"
  | "review_status"
  | "reviewed"
  | "source_verified"
  | "answer_verified"
  | "media_required"
> & {
  // Mídia legada: só o acervo local de reserva preenche estes campos. A tabela
  // `questions` não tem coluna `media_url` — nunca selecionar por nome.
  media_url?: string | null;
  media_alt?: string | null;
  media_metadata?: Database["public"]["Tables"]["profiles"]["Row"]["perceived_difficulties"];
  subjects: Pick<Subject, "id" | "name" | "area">;
  topics: Pick<Topic, "id" | "name">;
  question_media?: QuestionMedia[];
  user_question_answers?: QuestionUserAnswer[];
  user_question_reviews?: Array<{ id: string; mastered: boolean }>;
  user_question_favorites?: Array<{ id: string }>;
};

/** Conteúdo da questão aberta: buscado sob demanda, um punhado por vez. */
export type PracticeQuestionContent = {
  id: string;
  statement: string;
  question_options: Array<Pick<QuestionOption, "option_key" | "option_text">>;
};

/**
 * Uma resposta do aluno com a taxonomia da questão anexada. É o insumo de todas
 * as métricas de desempenho — que antes baixavam o acervo inteiro para somar
 * acertos por área, disciplina e assunto.
 */
export type AnsweredQuestionMetric = {
  id: string;
  question_id: string;
  is_correct: boolean;
  response_time_seconds: number;
  answered_at: string;
  area: string;
  subject: string;
  topic: string;
};

export type CreditsData = {
  account: CreditAccount;
  ledger: CreditLedgerEntry[];
  ledgerPage: number;
  ledgerPageSize: number;
  ledgerTotal: number;
  recentEssays: EssaySubmission[];
  referrals: ReferralDashboardData;
};

export type ReferralHistoryItem = {
  id: string;
  referredName: string;
  date: string;
  status: Referral["status"];
  rewardLabel: string;
  statusReason: string | null;
};

export type ReferralDashboardData = {
  referralCode: string;
  convertedInvites: number;
  pendingRewards: number;
  confirmedRewards: number;
  totalCreditsEarned: number;
  history: ReferralHistoryItem[];
};

export type EssayCorrectionData = {
  account: CreditAccount;
  submissions: EssaySubmission[];
  weeklyTopicUnlocks: string[];
};

export type DashboardEssayCreditData = {
  account: CreditAccount;
  latestDebit: CreditLedgerEntry | null;
  latestEssay: EssaySubmission | null;
  essayCounts: {
    total: number;
    pending: number;
    inReview: number;
    completed: number;
  };
};

export type EssaySubmissionWithProfile = EssaySubmission & {
  profiles?: Pick<Profile, "full_name" | "email"> | null;
  assigned_admin_profile?: Pick<Profile, "full_name" | "email"> | null;
  essay_submission_files?: EssaySubmissionFile[];
};

export type EssaySubmissionDetail = EssaySubmissionWithProfile & {
  essay_submission_events?: EssaySubmissionEvent[];
  essay_correction_results?: EssayCorrectionResult[];
  completed_by_profile?: Pick<Profile, "full_name" | "email"> | null;
};

export type TopicWithSubject = Topic & {
  subjects: Subject;
  user_topic_performance?: TopicPerformance[];
};

export type SimulationWithQuestions = Simulation & {
  simulation_questions: Array<{
    position: number;
    questions: QuestionRecord;
  }>;
  user_simulations?: Array<
    UserSimulation & {
      user_simulation_answers?: Array<
        Database["public"]["Tables"]["user_simulation_answers"]["Row"]
      >;
    }
  >;
};

export type ActivePracticeSession = PracticeSession & {
  answers: Array<{
    question_id: string;
    selected_option: string;
    is_correct: boolean;
    answered_at: string;
    correct_option: string;
    explanation: string | null;
  }>;
};

export type StudyPlanWithItems = StudyPlan & {
  study_plan_items: Array<
    StudyPlanItem & {
      topics: Topic & { subjects: Subject };
    }
  >;
};

export type AreaMetric = {
  area: string;
  accuracy: number;
  answered: number;
};

export type ActivityRecord = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "simulado" | "estudo" | "questões" | "evolução";
};
