import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Notice } from "@/components/ui/notice";
import { getAccessContext } from "@/lib/access";
import {
  getHighPriorityQuestionRecords,
  getProfile,
} from "@/lib/db/queries";
import { HighPriorityTrainingClient } from "./training-client";

export default async function HighPriorityTrainingPage() {
  const [questions, profile] = await Promise.all([
    getHighPriorityQuestionRecords(),
    getProfile(),
  ]);
  const access = getAccessContext(profile);
  const visibleQuestions = questions;

  return (
    <div>
      <DashboardPageHeader
        title="Treino de alta prioridade"
        description="Seleção por regras: recorrência histórica, desempenho, erros recentes, meta, tempo disponível e confiança editorial."
      />

      <Notice tone="warning" className="mb-6">
        O score de prioridade é uma estimativa educacional. Ele não é TRI real,
        não usa IA e não afirma que uma questão específica vai cair no ENEM.
      </Notice>

      <HighPriorityTrainingClient
        questions={visibleQuestions}
        access={access}
      />
    </div>
  );
}
