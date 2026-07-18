import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { buttonClasses } from "@/components/ui/button";
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
        action={
          <Link
            href="/dashboard/questoes"
            className={buttonClasses({ variant: "outline" })}
          >
            Ver banco completo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />

      <Notice tone="warning" className="mb-6">
        A prioridade é uma estimativa para orientar o estudo. Ela não afirma
        que uma questão específica vai cair no ENEM.
      </Notice>

      <HighPriorityTrainingClient
        questions={visibleQuestions}
        access={access}
      />
    </div>
  );
}
