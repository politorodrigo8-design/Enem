import Link from "next/link";
import { Compass } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { getAccessContext } from "@/lib/access";
import {
  getAreaMetrics,
  getHighPriorityQuestionRecords,
  getProfile,
  getQuestionRecords,
  getTopicsWithPerformance,
} from "@/lib/db/queries";
import { PerformanceView } from "./performance-view";
import { RadarClient } from "./radar-client";
import { RadarTabs, type RadarTab } from "./radar-tabs";
import { RecurrenceQuestionsClient } from "./recurrence-questions-client";

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ tab }, topics, profile, recurrenceQuestions, questions, areaMetrics] =
    await Promise.all([
      searchParams,
      getTopicsWithPerformance(),
      getProfile(),
      getHighPriorityQuestionRecords(),
      getQuestionRecords(),
      getAreaMetrics(),
    ]);
  const access = getAccessContext(profile);
  const initialTab: RadarTab = tab === "desempenho" ? "desempenho" : "prioridades";

  return (
    <div>
      <DashboardPageHeader
        title="Radar ENEM"
        description="Como você está e o que priorizar: recorrência dos temas, seu desempenho e prioridade personalizada em um só lugar."
        action={
          <Link
            href="/dashboard/radar/metodologia"
            className={buttonClasses({ variant: "outline" })}
          >
            Ver metodologia
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <Compass className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <span>Prioridades calculadas a partir do seu diagnóstico.</span>
        <Link
          href="/dashboard/diagnostico"
          className="font-semibold text-blue-700 transition-colors hover:text-blue-800"
        >
          Ver/refazer diagnóstico
        </Link>
      </div>

      <RadarTabs
        initialTab={initialTab}
        priorities={
          <div>
            <Notice tone="warning" className="mb-6">
              As prioridades são estimativas de estudo baseadas na recorrência
              histórica dos temas, no seu desempenho e em regras transparentes.
              Elas não representam previsão exata da prova.
            </Notice>

            <RadarClient topics={topics} access={access} />

            <section className="mt-8">
              <RecurrenceQuestionsClient
                questions={recurrenceQuestions}
                access={access}
              />
            </section>
          </div>
        }
        performance={
          <PerformanceView questions={questions} areaMetrics={areaMetrics} />
        }
      />
    </div>
  );
}
