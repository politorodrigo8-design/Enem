"use client";

import { useEffect, useState } from "react";
import type { AnsweredQuestionMetric, PracticeQuestionRecord } from "@/lib/db/types";

export type LocalQuestionAnswer = {
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  responseTimeSeconds: number;
  answeredAt: string;
  // A taxonomia viaja junto da resposta: o Desempenho deixou de baixar o acervo
  // para descobrir a que área/disciplina/assunto a questão pertencia, e sem isso
  // uma resposta local não teria como entrar nas tabelas por matéria.
  // Ausente nos registros gravados antes dessa mudança — eles ainda contam nos
  // totais, mas ficam fora do recorte por matéria.
  area?: string;
  subject?: string;
  topic?: string;
};

export type LocalQuestionProgress = Record<string, LocalQuestionAnswer>;

const localProgressStorageKey = "pontua-enem:local-question-progress:v1";
const localProgressEventName = "pontua-enem:local-question-progress";
const localQuestionIdPrefix = "fallback-question-";

export function isLocalQuestionId(questionId: string) {
  return questionId.startsWith(localQuestionIdPrefix);
}

export function readLocalQuestionProgress(): LocalQuestionProgress {
  try {
    const raw = window.localStorage.getItem(localProgressStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed as Record<string, Partial<LocalQuestionAnswer>>)
        .filter(([questionId, answer]) => isValidLocalAnswer(questionId, answer))
        .map(([questionId, answer]) => [
          questionId,
          {
            questionId,
            selectedOption: answer.selectedOption!,
            isCorrect: Boolean(answer.isCorrect),
            responseTimeSeconds: Math.max(
              0,
              Math.floor(Number(answer.responseTimeSeconds) || 0),
            ),
            answeredAt:
              typeof answer.answeredAt === "string"
                ? answer.answeredAt
                : new Date().toISOString(),
            area: typeof answer.area === "string" ? answer.area : undefined,
            subject: typeof answer.subject === "string" ? answer.subject : undefined,
            topic: typeof answer.topic === "string" ? answer.topic : undefined,
          },
        ]),
    );
  } catch {
    return {};
  }
}

export function recordLocalQuestionAnswer(answer: LocalQuestionAnswer) {
  if (!isLocalQuestionId(answer.questionId)) return;

  const current = readLocalQuestionProgress();
  const previous = current[answer.questionId];
  writeLocalQuestionProgress({
    ...current,
    [answer.questionId]: {
      ...answer,
      responseTimeSeconds: Math.max(
        0,
        Math.floor(Number(answer.responseTimeSeconds) || 0),
      ),
      // Regravação sem taxonomia (a restauração de uma sessão salva não tem a
      // questão em mãos) não pode apagar a que já estava guardada.
      area: answer.area ?? previous?.area,
      subject: answer.subject ?? previous?.subject,
      topic: answer.topic ?? previous?.topic,
    },
  });
}

/** Taxonomia da questão no formato guardado junto da resposta local. */
export function localAnswerTaxonomy(question: {
  subjects: { area: string; name: string };
  topics: { name: string };
}) {
  return {
    area: question.subjects.area,
    subject: question.subjects.name,
    topic: question.topics.name,
  };
}

export function removeLocalQuestionAnswer(questionId: string) {
  if (!isLocalQuestionId(questionId)) return;

  const current = readLocalQuestionProgress();
  if (!current[questionId]) return;
  const next = { ...current };
  delete next[questionId];
  writeLocalQuestionProgress(next);
}

export function mergeLocalProgressIntoQuestions<
  T extends Pick<PracticeQuestionRecord, "id" | "user_question_answers">,
>(questions: T[], progress: LocalQuestionProgress): T[] {
  return questions.map((question) => {
    const answer = progress[question.id];
    if (!answer) return question;

    const existingAnswers = question.user_question_answers ?? [];
    if (existingAnswers.some((item) => item.id === localAnswerId(question.id))) {
      return question;
    }

    return {
      ...question,
      user_question_answers: [
        ...existingAnswers,
        {
          id: localAnswerId(question.id),
          question_id: question.id,
          practice_session_id: null,
          selected_option: answer.selectedOption,
          is_correct: answer.isCorrect,
          response_time_seconds: answer.responseTimeSeconds,
          answered_at: answer.answeredAt,
        },
      ],
    };
  });
}

/**
 * Respostas locais no mesmo formato das métricas do servidor, para somarem
 * juntas no Desempenho. Registros antigos, sem taxonomia, entram com os campos
 * vazios — contam nos totais e ficam fora das tabelas por matéria.
 */
export function localProgressAsMetrics(
  progress: LocalQuestionProgress,
): AnsweredQuestionMetric[] {
  return Object.values(progress).map((answer) => ({
    id: localAnswerId(answer.questionId),
    question_id: answer.questionId,
    is_correct: answer.isCorrect,
    response_time_seconds: answer.responseTimeSeconds,
    answered_at: answer.answeredAt,
    area: answer.area ?? "",
    subject: answer.subject ?? "",
    topic: answer.topic ?? "",
  }));
}

export function useLocalQuestionProgress() {
  const [progress, setProgress] = useState<LocalQuestionProgress>({});

  /* eslint-disable react-hooks/set-state-in-effect -- Hydrates browser-only local progress after mount. */
  useEffect(() => {
    setProgress(readLocalQuestionProgress());

    function refresh() {
      setProgress(readLocalQuestionProgress());
    }

    window.addEventListener("storage", refresh);
    window.addEventListener(localProgressEventName, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(localProgressEventName, refresh);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return progress;
}

function writeLocalQuestionProgress(progress: LocalQuestionProgress) {
  try {
    window.localStorage.setItem(localProgressStorageKey, JSON.stringify(progress));
    window.dispatchEvent(new Event(localProgressEventName));
  } catch {
    // localStorage can be blocked or unavailable in some browser modes.
  }
}

function isValidLocalAnswer(
  questionId: string,
  answer: Partial<LocalQuestionAnswer> | undefined,
) {
  return (
    isLocalQuestionId(questionId) &&
    Boolean(answer) &&
    ["A", "B", "C", "D", "E"].includes(String(answer?.selectedOption ?? ""))
  );
}

function localAnswerId(questionId: string) {
  return `local-answer-${questionId}`;
}
