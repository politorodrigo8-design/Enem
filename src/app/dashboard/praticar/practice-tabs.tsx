"use client";

import { useMemo, useState } from "react";
import {
  QuestionBankClient,
  type TopicPriority,
} from "../questoes/question-bank-client";
import { ReviewClient, hasReviewHistory } from "../revisao/review-client";
import type { AccessContext } from "@/lib/access";
import type { ActivePracticeSession, PracticeQuestionRecord } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import {
  mergeLocalProgressIntoQuestions,
  useLocalQuestionProgress,
} from "@/lib/local-question-progress";

export type PracticeTab = "banco" | "revisao";

// O id "revisao" continua na URL: outras telas linkam para ?tab=revisao. Só o
// rótulo mudou, para dizer o que a aba realmente mostra.
const tabs: Array<{ id: PracticeTab; label: string }> = [
  { id: "banco", label: "Banco de questões" },
  { id: "revisao", label: "Já respondidas" },
];

export function PracticeTabs({
  initialTab,
  questions,
  access,
  userId,
  initialQuestionId,
  initialTopic,
  initialGoal,
  topicPriority,
  activePracticeSession,
}: {
  initialTab: PracticeTab;
  questions: PracticeQuestionRecord[];
  access: AccessContext;
  userId: string;
  initialQuestionId?: string;
  initialTopic?: string;
  initialGoal?: number | null;
  topicPriority?: TopicPriority;
  activePracticeSession?: ActivePracticeSession | null;
}) {
  const [tab, setTab] = useState<PracticeTab>(initialTab);
  const localProgress = useLocalQuestionProgress();
  // Sem memo, trocar de aba reconstruía o acervo inteiro (~1,2 mil objetos) e
  // recontava o histórico a cada render.
  const questionsWithLocalProgress = useMemo(
    () => mergeLocalProgressIntoQuestions(questions, localProgress),
    [questions, localProgress],
  );
  const historyCount = useMemo(
    () => questionsWithLocalProgress.filter(hasReviewHistory).length,
    [questionsWithLocalProgress],
  );

  return (
    <div>
      <div
        className="mb-6 grid grid-cols-2 border-b border-slate-200 sm:flex sm:flex-wrap sm:gap-2"
        role="tablist"
        aria-label="Modos de prática"
      >
        {tabs.map((item) => {
          const count =
            item.id === "revisao" ? historyCount : questionsWithLocalProgress.length;

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
                "-mb-px inline-flex min-h-11 items-center justify-center gap-2 border-b-2 px-3 py-2.5 text-center text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:min-h-0 sm:justify-start sm:text-left",
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
            userId={userId}
            initialQuestionId={initialQuestionId}
            initialTopic={initialTopic}
            initialGoal={initialGoal}
            topicPriority={topicPriority}
            activePracticeSession={activePracticeSession}
          />
        </div>
      ) : null}

      {tab === "revisao" ? (
        <div key="revisao" className="animate-rise">
          <ReviewClient questions={questionsWithLocalProgress} />
        </div>
      ) : null}
    </div>
  );
}
