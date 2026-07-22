import Link from "next/link";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { buttonClasses } from "@/components/ui/button";
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
        description="Prioridades de estudo calculadas por recorrencia, desempenho e diagnostico."
        action={
          <Link
            href="/dashboard/radar/metodologia"
            className={buttonClasses({ variant: "outline" })}
          >
            Ver metodologia
          </Link>
        }
      />

      <RadarTabs
        initialTab={initialTab}
        priorities={
          <div>
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
