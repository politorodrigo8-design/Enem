import Link from "next/link";
import { FileText, Info } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { getEssayCorrectionData } from "@/lib/db/queries";
import { ESSAY_CREDIT_COST_LABEL } from "@/lib/product-config";
import { ESSAY_CREDIT_COST, ESSAY_TURNAROUND_LABEL } from "@/lib/schemas/essay";
import { EssayCorrectionClient } from "./essay-correction-client";

export const dynamic = "force-dynamic";

export default async function EssayCorrectionPage() {
  const data = await getEssayCorrectionData();
  const lowBalance = data.account.balance < ESSAY_CREDIT_COST;

  return (
    <div>
      <DashboardPageHeader
        title="Redação"
        description="Envie e acompanhe a correção por competência."
        action={
          <Link
            href="/dashboard/creditos"
            className="inline-flex min-h-11 items-center rounded-lg sm:min-h-0"
          >
            <Badge tone={lowBalance ? "amber" : "blue"} className="gap-1.5">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              {data.account.balance} créditos disponíveis
            </Badge>
          </Link>
        }
      />

      <Notice tone="info" icon={Info} className="mb-6">
        {ESSAY_CREDIT_COST_LABEL} por envio. Correção em {ESSAY_TURNAROUND_LABEL} no
        histórico.
      </Notice>

      <EssayCorrectionClient
        creditBalance={data.account.balance}
        submissions={data.submissions}
        weeklyTopicUnlocks={data.weeklyTopicUnlocks}
      />
    </div>
  );
}
