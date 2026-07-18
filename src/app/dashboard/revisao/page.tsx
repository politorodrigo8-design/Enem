import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getReviewQuestions } from "@/lib/db/queries";
import { ReviewClient } from "./review-client";

export default async function ReviewPage() {
  const questions = await getReviewQuestions();

  return (
    <div>
      <DashboardPageHeader
        title="Revisao de erros"
        description="Revise questoes erradas ou marcadas, refaca tentativas e indique dominio do conteudo."
      />
      <ReviewClient questions={questions} />
    </div>
  );
}
