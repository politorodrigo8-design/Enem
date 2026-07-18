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
        description="Recorrência dos temas na prova, seu desempenho e prioridade personalizada em um só lugar."
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
        As prioridades são estimativas de estudo baseadas na recorrência
        histórica dos temas, no seu desempenho e em regras transparentes. Elas
        não representam previsão exata da prova.
      </Notice>

      <RadarClient topics={topics} access={access} />

      <section className="mt-8">
        <RecurrenceQuestionsClient questions={recurrenceQuestions} access={access} />
      </section>
    </div>
  );
}
