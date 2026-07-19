import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getProfile } from "@/lib/db/queries";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const profile = await getProfile();

  return (
    <div>
      <DashboardPageHeader
        title="Primeiros passos"
        description="Quatro etapas rápidas — ao final, seu diagnóstico inicial já estará pronto."
      />
      <OnboardingClient profile={profile} />
    </div>
  );
}
