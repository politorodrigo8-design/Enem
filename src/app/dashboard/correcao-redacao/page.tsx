import { FileText, Info } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { getEssayCorrectionData } from "@/lib/db/queries";
import { ESSAY_CREDIT_COST_LABEL } from "@/lib/product-config";
import { EssayCorrectionClient } from "./essay-correction-client";

export const dynamic = "force-dynamic";

export default async function EssayCorrectionPage() {
  const data = await getEssayCorrectionData();

  return (
    <div>
      <DashboardPageHeader
        title="Redação"
        description="Escreva ou fotografe sua redação e receba a correção pelas cinco competências do ENEM."
        action={
          <Badge tone="blue" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {data.account.balance} créditos disponíveis
          </Badge>
        }
      />

      <Notice tone="info" icon={Info} className="mb-6">
        Cada envio consome {ESSAY_CREDIT_COST_LABEL} e é corrigido por revisão
        dedicada — o resultado chega no histórico desta página, não é
        instantâneo.
      </Notice>

      <EssayCorrectionClient
        creditBalance={data.account.balance}
        submissions={data.submissions}
        weeklyTopicUnlocks={data.weeklyTopicUnlocks}
      />
    </div>
  );
}
