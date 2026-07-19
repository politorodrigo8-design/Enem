import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getAccessContext } from "@/lib/access";
import {
  getHighPriorityQuestionRecords,
  getProfile,
  getQuestionRecords,
  getReviewQuestions,
} from "@/lib/db/queries";
import { PracticeTabs, type PracticeTab } from "./practice-tabs";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ tab }, questions, highPriorityQuestions, reviewQuestions, profile] =
    await Promise.all([
      searchParams,
      getQuestionRecords(),
      getHighPriorityQuestionRecords(),
      getReviewQuestions(),
      getProfile(),
    ]);
  const access = getAccessContext(profile);
  const initialTab: PracticeTab =
    tab === "banco" || tab === "revisao" ? tab : "prioritarias";

  return (
    <div>
      <DashboardPageHeader
        title="Praticar"
        description="Questões prioritárias, banco completo e revisão de erros — tudo em um lugar."
      />
      <PracticeTabs
        initialTab={initialTab}
        questions={questions}
        highPriorityQuestions={highPriorityQuestions}
        reviewQuestions={reviewQuestions}
        access={access}
      />
    </div>
  );
}
