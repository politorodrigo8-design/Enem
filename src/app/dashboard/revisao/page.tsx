import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getReviewQuestions } from "@/lib/db/queries";
import { ReviewClient } from "./review-client";

export default async function ReviewPage() {
  const questions = await getReviewQuestions();

  return (
    <div>
      <DashboardPageHeader
        title="Revisão de erros"
        description="Revise questões erradas ou marcadas, refaça tentativas e indique domínio do conteúdo."
      />
      <ReviewClient questions={questions} />
    </div>
  );
}
