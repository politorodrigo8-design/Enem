export type Area =
  | "Matemática"
  | "Linguagens"
  | "Ciências Humanas"
  | "Ciências da Natureza"
  | "Redação";

export type Priority =
  | "Prioridade máxima"
  | "Prioridade alta"
  | "Prioridade média"
  | "Prioridade complementar";

export type Difficulty = "Baixa" | "Média" | "Alta";

export type StudyStatus = "Concluído" | "Em andamento" | "Pendente";

export type QuestionStatus = "Não respondida" | "Respondida" | "Revisão";

export interface StudentSummary {
  name: string;
  level: string;
  estimatedScore: number;
  generalEvolution: number;
  answeredQuestions: number;
  accuracyRate: number;
  studyStreak: number;
  nextSimulation: string;
}

export interface PriorityCard {
  id: string;
  area: Area;
  discipline: string;
  topic: string;
  priority: Priority;
  accuracy: number;
  recommendedQuestions: number;
}

export interface EvolutionPoint {
  label: string;
  score: number;
  accuracy: number;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "simulado" | "estudo" | "questões" | "evolução";
}

export interface RadarTopic {
  id: string;
  name: string;
  area: Area;
  discipline: string;
  recurrence: number;
  priority: Priority;
  difficulty: Difficulty;
  studentPerformance: number;
  recommendation: string;
}

export interface Alternative {
  id: "A" | "B" | "C" | "D" | "E";
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  area: Area;
  discipline: string;
  subject: string;
  difficulty: Difficulty;
  year: number;
  status: QuestionStatus;
  priority: Priority;
  prompt: string;
  alternatives: Alternative[];
  explanation: string;
  skill: string;
  source: string;
}

export interface Simulation {
  id: string;
  title: string;
  questions: number;
  estimatedDuration: string;
  difficulty: Difficulty;
  status: "Disponível" | "Realizado" | "Em breve";
  performance?: number;
  description: string;
}

export interface StudyTask {
  id: string;
  day: string;
  area: Area;
  discipline: string;
  content: string;
  duration: string;
  questions: number;
  status: StudyStatus;
}

export interface AreaPerformance {
  area: Area;
  accuracy: number;
  answered: number;
}

export interface SubjectPerformance {
  subject: string;
  area: Area;
  accuracy: number;
  status: "Dominado" | "Atenção" | "Crítico";
}

export interface CreditPackage {
  id: string;
  title: string;
  credits: number;
  price: string;
  description: string;
}
