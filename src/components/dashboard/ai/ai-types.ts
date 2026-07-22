import type {
  PerformanceAnalysisResult,
  QuestionExplanationResult,
  SmartStudyPlanResult,
} from "@/lib/actions/ai";

export type {
  PerformanceAnalysisResult,
  QuestionExplanationResult,
  SmartStudyPlanResult,
};

export type ImportedPriority = {
  area: string;
  subject: string;
  topic: string;
  reason?: string;
  questionGoal?: number;
};
