"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { QuestionBankClient } from "@/app/dashboard/questoes/question-bank-client";
import { recordProductEventAction } from "@/lib/actions/beta";
import type { AccessContext } from "@/lib/access";
import type { QuestionRecord } from "@/lib/db/types";

export function HighPriorityTrainingClient({
  questions,
  access,
}: {
  questions: QuestionRecord[];
  access: AccessContext;
}) {
  const pathname = usePathname();

  useEffect(() => {
    void recordProductEventAction({
      eventName: "high_priority_training_started",
      route: pathname,
      metadata: { visible_questions: questions.length },
    });
  }, [pathname, questions.length]);

  return (
    <QuestionBankClient
      questions={questions}
      access={access}
      answerSource="high_priority"
    />
  );
}
