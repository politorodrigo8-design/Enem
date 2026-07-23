"use client";

import { useState } from "react";
import { Notice } from "@/components/ui/notice";
import { QuestionBankClient, type FocusMode } from "../questoes/question-bank-client";
import { ReviewClient } from "../revisao/review-client";
import type { AccessContext } from "@/lib/access";
import type { QuestionRecord } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export type PracticeTab = "banco" | "revisao";

const tabs: Array<{ id: PracticeTab; label: string }> = [
  { id: "banco", label: "Banco de questões" },
  { id: "revisao", label: "Revisão de erros" },
];

export function PracticeTabs({
  initialTab,
  initialFocus,
  questions,
  reviewQuestions,
  access,
  initialQuestionId,
  initialTopic,
}: {
  initialTab: PracticeTab;
  initialFocus?: FocusMode;
  questions: QuestionRecord[];
  reviewQuestions: QuestionRecord[];
  access: AccessContext;
  initialQuestionId?: string;
  initialTopic?: string;
}) {
  const [tab, setTab] = useState<PracticeTab>(initialTab);

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
              ? reviewQuestions.length
              : questions.length;

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
          <Notice tone="info" className="mb-6">
            Este banco mostra apenas questões aprovadas, com fonte e gabarito
            verificados. Itens pendentes ficam fora do treino até a revisão.
          </Notice>
          <QuestionBankClient
            questions={questions}
            access={access}
            initialQuestionId={initialQuestionId}
            initialTopic={initialTopic}
            initialFocus={initialFocus}
          />
        </div>
      ) : null}

      {tab === "revisao" ? (
        <div key="revisao" className="animate-rise">
          <ReviewClient questions={reviewQuestions} />
        </div>
      ) : null}
    </div>
  );
}
