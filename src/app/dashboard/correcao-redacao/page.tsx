import { FileText, Info } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { getEssayCorrectionData } from "@/lib/db/queries";
import {
  ESSAY_ACCEPTED_FILE_LABEL,
  ESSAY_CREDIT_COST_LABEL,
  ESSAY_UPLOAD_LIMIT_LABEL,
} from "@/lib/product-config";
import { EssayCorrectionClient } from "./essay-correction-client";

export const dynamic = "force-dynamic";

export default async function EssayCorrectionPage() {
  const data = await getEssayCorrectionData();

  return (
    <div>
      <DashboardPageHeader
        title="Correção de redação"
        description="Digite online ou anexe fotos, PNG, JPG, JPEG ou PDF para acompanhar a correção pela plataforma."
        action={
          <Badge tone="blue" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {data.account.balance} créditos disponíveis
          </Badge>
        }
      />

      <Notice tone="info" icon={Info} className="mb-6">
        Cada submissão confirmada consome {ESSAY_CREDIT_COST_LABEL}. Arquivos
        aceitos: {ESSAY_ACCEPTED_FILE_LABEL}, com {ESSAY_UPLOAD_LIMIT_LABEL}.
        A correção fica disponível pelo histórico quando for concluída; não é
        automática nem instantânea.
      </Notice>

      <EssayCorrectionClient
        creditBalance={data.account.balance}
        submissions={data.submissions}
        weeklyTopicUnlocks={data.weeklyTopicUnlocks}
      />
    </div>
  );
}
