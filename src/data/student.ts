import type {
  Activity,
  EvolutionPoint,
  PriorityCard,
  StudentSummary,
} from "@/types";

export const studentSummary: StudentSummary = {
  name: "Rodrigo",
  level: "Intermediário estratégico",
  estimatedScore: 682,
  generalEvolution: 18,
  answeredQuestions: 428,
  accuracyRate: 64,
  studyStreak: 9,
  nextSimulation: "Diagnóstico de Matemática em 2 dias",
};

export const priorityCards: PriorityCard[] = [
  {
    id: "mat-razao",
    area: "Matemática",
    discipline: "Matemática",
    topic: "Razão e proporção",
    priority: "Prioridade máxima",
    accuracy: 42,
    recommendedQuestions: 18,
  },
  {
    id: "fis-eletricidade",
    area: "Ciências da Natureza",
    discipline: "Física",
    topic: "Eletricidade",
    priority: "Prioridade alta",
    accuracy: 48,
    recommendedQuestions: 14,
  },
  {
    id: "qui-esteq",
    area: "Ciências da Natureza",
    discipline: "Química",
    topic: "Estequiometria",
    priority: "Prioridade alta",
    accuracy: 51,
    recommendedQuestions: 12,
  },
  {
    id: "ling-interpretacao",
    area: "Linguagens",
    discipline: "Linguagens",
    topic: "Interpretação de texto",
    priority: "Prioridade média",
    accuracy: 58,
    recommendedQuestions: 10,
  },
];

export const evolutionData: EvolutionPoint[] = [
  { label: "Sem 1", score: 612, accuracy: 52 },
  { label: "Sem 2", score: 628, accuracy: 55 },
  { label: "Sem 3", score: 641, accuracy: 58 },
  { label: "Sem 4", score: 655, accuracy: 60 },
  { label: "Sem 5", score: 671, accuracy: 63 },
  { label: "Sem 6", score: 682, accuracy: 64 },
];

export const recentActivities: Activity[] = [
  {
    id: "a1",
    title: "Simulado diagnóstico concluído",
    description: "48 questões respondidas, com destaque para Matemática.",
    timestamp: "Hoje, 09:20",
    type: "simulado",
  },
  {
    id: "a2",
    title: "Proporcionalidade revisada",
    description: "Sessão de 35 minutos marcada como concluída.",
    timestamp: "Ontem, 20:10",
    type: "estudo",
  },
  {
    id: "a3",
    title: "24 questões finalizadas",
    description: "Foco em Ecologia, Eletricidade e Interpretação.",
    timestamp: "Ontem, 18:45",
    type: "questões",
  },
  {
    id: "a4",
    title: "Evolução registrada",
    description: "Taxa de acertos subiu 6 pontos em Ciências da Natureza.",
    timestamp: "Segunda, 08:00",
    type: "evolução",
  },
];
