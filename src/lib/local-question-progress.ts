"use client";

import { useEffect, useState } from "react";
import type { QuestionRecord } from "@/lib/db/types";

export type LocalQuestionAnswer = {
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  responseTimeSeconds: number;
  answeredAt: string;
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
  writeLocalQuestionProgress({
    ...current,
    [answer.questionId]: {
      ...answer,
      responseTimeSeconds: Math.max(
        0,
        Math.floor(Number(answer.responseTimeSeconds) || 0),
      ),
    },
  });
}

export function removeLocalQuestionAnswer(questionId: string) {
  if (!isLocalQuestionId(questionId)) return;

  const current = readLocalQuestionProgress();
  if (!current[questionId]) return;
  const next = { ...current };
  delete next[questionId];
  writeLocalQuestionProgress(next);
}

export function mergeLocalProgressIntoQuestions(
  questions: QuestionRecord[],
  progress: LocalQuestionProgress,
) {
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
