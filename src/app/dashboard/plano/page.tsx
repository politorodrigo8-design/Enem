import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getAccessContext } from "@/lib/access";
import { getCurrentStudyPlan, getProfile } from "@/lib/db/queries";
import { StudyPlanClient } from "./study-plan-client";

export default async function StudyPlanPage() {
  const [plan, profile] = await Promise.all([getCurrentStudyPlan(), getProfile()]);
  const access = getAccessContext(profile);

  return (
    <div>
      <DashboardPageHeader
        title="Plano de estudos"
        description="Plano semanal gerado por regras a partir de disponibilidade, prioridades e desempenho."
      />
      <StudyPlanClient plan={plan} access={access} />
    </div>
  );
}
