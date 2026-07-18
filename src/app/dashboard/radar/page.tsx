import Link from "next/link";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { getAccessContext } from "@/lib/access";
import {
  getHighPriorityQuestionRecords,
  getProfile,
  getTopicsWithPerformance,
} from "@/lib/db/queries";
import { RadarClient } from "./radar-client";
import { RecurrenceQuestionsClient } from "./recurrence-questions-client";

export default async function RadarPage() {
  const [topics, profile, recurrenceQuestions] = await Promise.all([
    getTopicsWithPerformance(),
    getProfile(),
    getHighPriorityQuestionRecords(),
  ]);
  const access = getAccessContext(profile);

  return (
    <div>
      <DashboardPageHeader
        title="Radar ENEM"
        description="Recorrência, desempenho e prioridade personalizada calculados com dados do banco."
        action={
          <Link
            href="/dashboard/radar/metodologia"
            className={buttonClasses({ variant: "outline" })}
          >
            Ver metodologia
          </Link>
        }
      />

      <Notice tone="warning" className="mb-6">
        As prioridades apresentadas são estimativas educacionais baseadas em
        recorrência fictícia demonstrativa, desempenho e regras simples. Não
        representam previsão exata da prova.
      </Notice>

      <RadarClient topics={topics} access={access} />

      <section className="mt-8">
        <RecurrenceQuestionsClient questions={recurrenceQuestions} access={access} />
      </section>
    </div>
  );
}
