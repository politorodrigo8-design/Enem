import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getAccessContext } from "@/lib/access";
import { getProfile, getSimulations } from "@/lib/db/queries";
import { SimulationsClient } from "./simulations-client";

export default async function SimulationsPage({
  searchParams,
}: {
  searchParams: Promise<{ iniciar?: string }>;
}) {
  const [{ iniciar }, simulations, profile] = await Promise.all([
    searchParams,
    getSimulations(),
    getProfile(),
  ]);
  const access = getAccessContext(profile);

  return (
    <div>
      <DashboardPageHeader
        title="Simulados"
        description="Simule a prova no ritmo real: 90 questões por dia, com questões novas a cada tentativa."
      />
      <SimulationsClient
        simulations={simulations}
        access={access}
        autoStartId={iniciar}
      />
    </div>
  );
}
