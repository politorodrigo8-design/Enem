import { redirect } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getAccessContext } from "@/lib/access";
import {
  getProfile,
  getQuestionRecords,
  getReviewQuestions,
} from "@/lib/db/queries";
import { PracticeTabs, type PracticeTab } from "./practice-tabs";
import type { FocusMode } from "../questoes/question-bank-client";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    focus?: string;
    question?: string;
    topic?: string;
  }>;
}) {
  const [{ tab, focus, question, topic }, questions, reviewQuestions, profile] =
    await Promise.all([
      searchParams,
      getQuestionRecords(),
      getReviewQuestions(),
      getProfile(),
    ]);
  if (tab === "prioritarias") {
    const params = new URLSearchParams({ tab: "banco", focus: "priority" });
    if (question) params.set("question", question);
    if (topic) params.set("topic", topic);
    redirect(`/dashboard/praticar?${params.toString()}`);
  }

  const access = getAccessContext(profile);
  const initialTab: PracticeTab = tab === "revisao" ? tab : "banco";
  const initialFocus: FocusMode | undefined = isFocusMode(focus) ? focus : undefined;

  return (
    <div>
      <DashboardPageHeader
        title="Praticar"
        description="Banco de questões, prioridades e revisão de erros em um só lugar."
      />
      <PracticeTabs
        initialTab={initialTab}
        initialFocus={initialFocus}
        questions={questions}
        reviewQuestions={reviewQuestions}
        access={access}
        initialQuestionId={question}
        initialTopic={topic}
      />
    </div>
  );
}

function isFocusMode(value?: string): value is FocusMode {
  return (
    value === "recommended" ||
    value === "priority" ||
    value === "unanswered" ||
    value === "review" ||
    value === "all"
  );
}
