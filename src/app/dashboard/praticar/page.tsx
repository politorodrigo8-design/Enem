import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getAccessContext } from "@/lib/access";
import {
  getProfile,
  getQuestionRecords,
  getReviewQuestions,
} from "@/lib/db/queries";
import { PracticeTabs, type PracticeTab } from "./practice-tabs";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    question?: string;
    topic?: string;
  }>;
}) {
  const [{ tab, question, topic }, questions, reviewQuestions, profile] =
    await Promise.all([
      searchParams,
      getQuestionRecords(),
      getReviewQuestions(),
      getProfile(),
    ]);

  const access = getAccessContext(profile);
  const initialTab: PracticeTab = tab === "revisao" ? tab : "banco";

  return (
    <div>
      <DashboardPageHeader
        title="Praticar"
        description="Resolva questões do banco verificado — a sessão já vem montada para você."
      />
      <PracticeTabs
        initialTab={initialTab}
        questions={questions}
        reviewQuestions={reviewQuestions}
        access={access}
        initialQuestionId={question}
        initialTopic={topic}
      />
    </div>
  );
}
