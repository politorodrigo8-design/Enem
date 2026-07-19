import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getDashboardData } from "@/lib/db/queries";
import { priorityLabel } from "@/lib/db/scoring";
import { DiagnosisClient, type PrioritySummary } from "./diagnosis-client";

export default async function DiagnosisPage() {
  const data = await getDashboardData();
  const profile = data.profile;
  const hasDiagnosis = Boolean(
    profile?.onboarding_completed && (profile?.target_score ?? 0) > 0,
  );

  const priorities: PrioritySummary[] = data.priorities.map(
    ({ topic, performance, score }) => ({
      id: topic.id,
      name: topic.name,
      subject: topic.subjects.name,
      area: topic.subjects.area,
      accuracy:
        performance?.accuracy_percentage != null
          ? Math.round(performance.accuracy_percentage)
          : null,
      label: priorityLabel(score),
    }),
  );

  return (
    <div>
      <DashboardPageHeader
        title="Meu diagnóstico"
        description={
          hasDiagnosis
            ? "Seu retrato atual: objetivo, rotina, autopercepção e as prioridades calculadas a partir deles."
            : "Informe objetivo, rotina e dificuldades percebidas para gerar suas prioridades de estudo."
        }
      />
      <DiagnosisClient
        profile={profile}
        priorities={priorities}
        hasDiagnosis={hasDiagnosis}
      />
    </div>
  );
}
