import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { buttonClasses } from "@/components/ui/button";
import { EssayFilesViewer } from "@/components/dashboard/essay-files-viewer";
import { getStudentEssayDetail } from "@/lib/db/queries";
import { formatAppDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

const statusLabels = {
  uploading: "Enviando",
  pending: "Aguardando correção",
  in_review: "Em análise",
  completed: "Concluída",
  cancelled: "Cancelada",
  upload_failed: "Falha no envio",
} as const;

const statusTones = {
  uploading: "amber",
  pending: "blue",
  in_review: "blue",
  completed: "green",
  cancelled: "red",
  upload_failed: "red",
} as const;

export default async function StudentEssayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const essay = await getStudentEssayDetail(id);
  if (!essay) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/correcao-redacao"
        className={buttonClasses({ variant: "outline", size: "sm" })}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar
      </Link>

      <DashboardPageHeader
        title={essay.theme}
        description={`Enviada em ${formatDate(essay.submitted_at)} por ${
          essay.delivery_type === "online"
            ? `texto online com ${essay.word_count} palavras`
            : `${essay.file_count || essay.essay_submission_files?.length || 0} arquivo(s)`
        }.`}
        action={
          <Badge tone={statusTones[essay.status]}>
            {statusLabels[essay.status]}
          </Badge>
        }
      />

      {essay.status === "cancelled" ? (
        <Notice tone="warning">
          Esta redação foi cancelada. Se houve cobrança, o estorno fica
          registrado no histórico de créditos.
        </Notice>
      ) : null}

      {essay.status === "completed" ? (
        <Notice tone="success">
          A correção desta redação foi concluída. Quando houver resultado
          detalhado disponível, ele aparecerá neste histórico.
        </Notice>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
            Redação enviada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {essay.student_note ? (
            <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Observação enviada
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {essay.student_note}
              </p>
            </div>
          ) : null}
          {essay.delivery_type === "online" ? (
            <div className="rounded-lg bg-white p-4 ring-1 ring-inset ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Texto digitado
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                {essay.essay_text}
              </p>
            </div>
          ) : (
            <EssayFilesViewer files={essay.essay_submission_files ?? []} />
          )}
        </CardContent>
      </Card>

      {essay.delivery_type === "upload" ? (
        <Notice tone="info">
          Os links dos arquivos são temporários e gerados somente para usuários
          autorizados.
        </Notice>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  return formatAppDateTime(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
