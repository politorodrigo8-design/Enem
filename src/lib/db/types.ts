import type { Database } from "@/lib/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Subject = Database["public"]["Tables"]["subjects"]["Row"];
export type Topic = Database["public"]["Tables"]["topics"]["Row"];
export type QuestionOption = Database["public"]["Tables"]["question_options"]["Row"];
export type QuestionMedia = Database["public"]["Tables"]["question_media"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type Simulation = Database["public"]["Tables"]["simulations"]["Row"];
export type UserSimulation = Database["public"]["Tables"]["user_simulations"]["Row"];
export type StudyPlan = Database["public"]["Tables"]["study_plans"]["Row"];
export type StudyPlanItem = Database["public"]["Tables"]["study_plan_items"]["Row"];
export type TopicPerformance =
  Database["public"]["Tables"]["user_topic_performance"]["Row"];
export type CreditAccount = Database["public"]["Tables"]["credit_accounts"]["Row"];
export type CreditLedgerEntry = Database["public"]["Tables"]["credit_ledger"]["Row"];
export type EssaySubmission = Database["public"]["Tables"]["essay_submissions"]["Row"];
export type EssaySubmissionFile =
  Database["public"]["Tables"]["essay_submission_files"]["Row"];
export type EssaySubmissionEvent =
  Database["public"]["Tables"]["essay_submission_events"]["Row"];
export type EssayCorrectionResult =
  Database["public"]["Tables"]["essay_correction_results"]["Row"];

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
    selected_option: string;
    is_correct: boolean;
    response_time_seconds: number;
    answered_at: string;
  }>;
  user_question_reviews?: Array<{ id: string; mastered: boolean }>;
};

export type CreditsData = {
  account: CreditAccount;
  ledger: CreditLedgerEntry[];
  recentEssays: EssaySubmission[];
};

export type EssayCorrectionData = {
  account: CreditAccount;
  submissions: EssaySubmission[];
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
  user_simulations?: UserSimulation[];
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
