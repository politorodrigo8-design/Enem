"use client";

import { useState } from "react";
import { QuestionBankClient } from "../questoes/question-bank-client";
import { ReviewClient } from "../revisao/review-client";
import type { AccessContext } from "@/lib/access";
import type { ActivePracticeSession, QuestionRecord } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import {
  mergeLocalProgressIntoQuestions,
  useLocalQuestionProgress,
} from "@/lib/local-question-progress";

export type PracticeTab = "banco" | "revisao";

const tabs: Array<{ id: PracticeTab; label: string }> = [
  { id: "banco", label: "Banco de questões" },
  { id: "revisao", label: "Revisão de erros" },
];

export function PracticeTabs({
  initialTab,
  questions,
  reviewQuestions,
  access,
  initialQuestionId,
  initialTopic,
  activePracticeSession,
}: {
  initialTab: PracticeTab;
  questions: QuestionRecord[];
  reviewQuestions: QuestionRecord[];
  access: AccessContext;
  initialQuestionId?: string;
  initialTopic?: string;
  activePracticeSession?: ActivePracticeSession | null;
}) {
  const [tab, setTab] = useState<PracticeTab>(initialTab);
  const localProgress = useLocalQuestionProgress();
  const questionsWithLocalProgress = mergeLocalProgressIntoQuestions(
    questions,
    localProgress,
  );
  const localWrongQuestions = questionsWithLocalProgress.filter((question) => {
    const latest = latestAnswer(question);
    return latest && !latest.is_correct;
  });
  const reviewQuestionsWithLocalProgress = mergeReviewQuestions(
    reviewQuestions,
    localWrongQuestions,
  );

  return (
    <div>
      <div
        className="mb-6 flex flex-wrap gap-2 border-b border-slate-200"
        role="tablist"
        aria-label="Modos de prática"
      >
        {tabs.map((item) => {
          const count =
            item.id === "revisao"
              ? reviewQuestionsWithLocalProgress.length
              : questionsWithLocalProgress.length;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => {
                setTab(item.id);
                window.history.replaceState(
                  null,
                  "",
                  `/dashboard/praticar?tab=${item.id}`,
                );
              }}
              className={cn(
                "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700",
                tab === item.id
                  ? "border-blue-700 font-semibold text-blue-900"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "tnum rounded-md px-1.5 py-0.5 text-xs font-semibold",
                  tab === item.id
                    ? "bg-blue-50 text-blue-800"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "banco" ? (
        <div key="banco" className="animate-rise">
          <QuestionBankClient
            questions={questions}
            access={access}
            initialQuestionId={initialQuestionId}
            initialTopic={initialTopic}
            activePracticeSession={activePracticeSession}
          />
        </div>
      ) : null}

      {tab === "revisao" ? (
        <div key="revisao" className="animate-rise">
          <ReviewClient questions={reviewQuestionsWithLocalProgress} />
        </div>
      ) : null}
    </div>
  );
}

function mergeReviewQuestions(
  reviewQuestions: QuestionRecord[],
  localWrongQuestions: QuestionRecord[],
) {
  const seen = new Set(reviewQuestions.map((question) => question.id));
  return [
    ...reviewQuestions,
    ...localWrongQuestions.filter((question) => !seen.has(question.id)),
  ];
}

function latestAnswer(question: QuestionRecord) {
  return question.user_question_answers
    ?.slice()
    .sort(
      (a, b) =>
        new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime(),
    )[0];
}
