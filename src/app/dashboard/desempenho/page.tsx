import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Reveal } from "@/components/ui/reveal";
import { buttonClasses } from "@/components/ui/button";
import { getAccessContext } from "@/lib/access";
import {
  getAreaMetrics,
  getProfile,
  getQuestionRecords,
  getTopicsWithPerformance,
} from "@/lib/db/queries";
import { prioritizeTopics } from "@/lib/study/priorities";
import { PerformanceView } from "./performance-view";
import {
  AllTopics,
  PriorityTopics,
  type PriorityTopicItem,
} from "./priority-topics";

export default async function PerformancePage() {
  const [topics, profile, questions, areaMetrics] = await Promise.all([
    getTopicsWithPerformance(),
    getProfile(),
    getQuestionRecords(),
    getAreaMetrics(),
  ]);
  const access = getAccessContext(profile);

  const priorityItems: PriorityTopicItem[] = prioritizeTopics(topics).map(
    ({ topic, performance, label, reason }) => ({
      id: topic.id,
      area: topic.subjects.area,
      discipline: topic.subjects.name,
      name: topic.name,
      label,
      reason,
      accuracy:
        performance?.total_answers != null && performance.total_answers > 0
          ? Math.round(Number(performance.accuracy_percentage ?? 0))
          : null,
      answered: Number(performance?.total_answers ?? 0),
    }),
  );

  return (
    <div>
      <DashboardPageHeader
        title="Desempenho"
        description="Seus números, seus assuntos prioritários e o que fazer com eles."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/diagnostico"
              className={buttonClasses({ variant: "outline" })}
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Meu diagnóstico
            </Link>
            <Link
              href="/dashboard/desempenho/metodologia"
              className={buttonClasses({ variant: "outline" })}
            >
              Como calculamos
            </Link>
          </div>
        }
      />

      <PerformanceView
        questions={questions}
        areaMetrics={areaMetrics}
        access={access}
      />

      <section className="mt-6">
        <Reveal delay={80}>
          <PriorityTopics items={priorityItems} />
        </Reveal>
      </section>

      <section className="mt-6">
        <Reveal delay={120}>
          <AllTopics items={priorityItems} />
        </Reveal>
      </section>
    </div>
  );
}
