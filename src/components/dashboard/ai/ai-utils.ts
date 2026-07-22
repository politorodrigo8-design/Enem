import { toast } from "sonner";
import type {
  ImportedPriority,
  PerformanceAnalysisResult,
  QuestionExplanationResult,
} from "./ai-types";

export const importedPriorityStorageKey = "pontua-ai-imported-priorities";

export function importPriorities(priorities: PerformanceAnalysisResult["priorities"]) {
  const payload = priorities.map((priority) => ({
    area: priority.area,
    subject: priority.subject,
    topic: priority.topic,
    reason: priority.reason,
    questionGoal: priority.questionGoal,
  }));
  window.localStorage.setItem(importedPriorityStorageKey, JSON.stringify(payload));
  toast.success("Prioridades importadas. Revise antes de otimizar o plano.");
  window.location.href = "/dashboard#plano-semana";
}

export function loadImportedPriorities() {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(importedPriorityStorageKey);
  if (!stored) return [];
  try {
    const priorities = JSON.parse(stored) as ImportedPriority[];
    return Array.isArray(priorities) ? priorities.slice(0, 5) : [];
  } catch {
    window.localStorage.removeItem(importedPriorityStorageKey);
    return [];
  }
}

export function saveImportedPriorities(priorities: ImportedPriority[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(importedPriorityStorageKey, JSON.stringify(priorities));
  }
}

export function copyExplanation(result: QuestionExplanationResult) {
  const text = [
    "Explicação da questão",
    formatTopicPath(result.area, result.subject, result.topic),
    "",
    "Entendendo o problema",
    result.problemSummary,
    "",
    "Resolução passo a passo",
    ...result.steps.flatMap((step, index) => [
      `${index + 1}. ${step.title}`,
      step.explanation,
      step.calculation ? `Cálculo: ${step.calculation}` : "",
    ]),
    "",
    `Resposta correta: alternativa ${result.correctAnswer.option}${result.correctAnswer.value ? ` — ${result.correctAnswer.value}` : ""}`,
    result.correctAnswer.explanation,
    result.studentAnswer.available
      ? `Sua resposta: alternativa ${result.studentAnswer.option}${result.studentAnswer.value ? ` — ${result.studentAnswer.value}` : ""}`
      : "",
    result.studentAnswer.explanation ?? "",
    "",
    "Dica",
    result.tip,
  ].filter(Boolean).join("\n");
  navigator.clipboard.writeText(text);
  toast.success("Explicação copiada.");
}

export function formatTopicPath(area: string, subject: string, topic: string) {
  const parts = [area];
  if (normalize(subject) !== normalize(area)) parts.push(subject);
  parts.push(topic);
  return parts.filter(Boolean).join(" — ");
}

export function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
  }).format(new Date(`${date}T12:00:00-03:00`));
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining} min`;
  if (!remaining) return `${hours} h`;
  return `${hours} h ${remaining} min`;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
