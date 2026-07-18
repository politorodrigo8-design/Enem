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
        title="Banco de questoes"
        description="Treine com questoes carregadas do Supabase, salve respostas e atualize seu desempenho."
      />

      <Notice tone="info" className="mb-6">
        Todas as questoes desta versao sao autorais e demonstrativas. Nenhuma
        questao oficial real foi copiada integralmente.
      </Notice>

      <QuestionBankClient
        questions={questions}
        access={access}
      />
    </div>
  );
}
