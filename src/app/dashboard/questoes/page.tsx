import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Notice } from "@/components/ui/notice";
import { getAccessContext } from "@/lib/access";
import { getProfile, getQuestionRecords } from "@/lib/db/queries";
import { QuestionBankClient } from "./question-bank-client";

export default async function QuestionsPage() {
  const [questions, profile] = await Promise.all([
    getQuestionRecords(),
    getProfile(),
  ]);
  const access = getAccessContext(profile);

  return (
    <div>
      <DashboardPageHeader
        title="Banco de questões"
        description="Treine com questões comentadas, registre suas respostas e acompanhe seu desempenho."
      />

      <Notice tone="info" className="mb-6">
        As questões desta versão são autorais, criadas pela nossa equipe para
        treino. Nenhuma questão oficial foi copiada integralmente.
      </Notice>

      <QuestionBankClient
        questions={questions}
        access={access}
      />
    </div>
  );
}
