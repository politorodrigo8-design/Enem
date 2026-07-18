import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getAccessContext } from "@/lib/access";
import { getProfile, getSimulations } from "@/lib/db/queries";
import { SimulationsClient } from "./simulations-client";

export default async function SimulationsPage() {
  const [simulations, profile] = await Promise.all([getSimulations(), getProfile()]);
  const access = getAccessContext(profile);

  return (
    <div>
      <DashboardPageHeader
        title="Simulados"
        description="Inicie tentativas reais, salve respostas no Supabase e finalize com percentual simples."
      />
      <SimulationsClient simulations={simulations} access={access} />
    </div>
  );
}
