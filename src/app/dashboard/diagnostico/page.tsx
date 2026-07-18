import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getProfile } from "@/lib/db/queries";
import { DiagnosisClient } from "./diagnosis-client";

export default async function DiagnosisPage() {
  const profile = await getProfile();

  return (
    <div>
      <DashboardPageHeader
        title="Meu diagnóstico"
        description="Salve objetivo, rotina e dificuldades percebidas para recalcular prioridades no banco."
      />
      <DiagnosisClient profile={profile} />
    </div>
  );
}
