import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EssayFilesViewer } from "@/components/dashboard/essay-files-viewer";
import { getAdminEssayDetail } from "@/lib/db/queries";
import { formatAppDateTime } from "@/lib/dates";
import { EssayAdminDetailClient } from "./essay-admin-detail-client";

export const dynamic = "force-dynamic";

const statusLabels = {
  uploading: "Enviando",
  pending: "Pendente",
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

export default async function AdminEssayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const essay = await getAdminEssayDetail(id);
  if (!essay) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/redacoes"
        className={buttonClasses({ variant: "outline", size: "sm" })}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para fila
      </Link>

      <DashboardPageHeader
        title={essay.theme}
        description={`Enviada em ${formatDate(essay.submitted_at)} por ${
          essay.profiles?.full_name || essay.profiles?.email || "aluno"
        }.`}
        action={
          <Badge tone={statusTones[essay.status]}>
            {statusLabels[essay.status]}
          </Badge>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
            Redação enviada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Info label="Aluno" value={essay.profiles?.full_name || "Aluno sem nome"} />
            <Info label="E-mail" value={essay.profiles?.email || essay.user_id} />
            <Info
              label="Responsável"
              value={
                essay.assigned_admin_profile?.full_name ||
                essay.assigned_admin_profile?.email ||
                "Não assumida"
              }
            />
          </div>
          {essay.student_note ? (
            <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Observacao do aluno
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

      <EssayAdminDetailClient essay={essay} />

      <Card>
        <CardHeader>
          <CardTitle>Auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          {essay.essay_submission_events?.length ? (
            <ul className="divide-y divide-slate-100">
              {essay.essay_submission_events.map((event) => (
                <li key={event.id} className="py-3 text-sm">
                  <p className="font-semibold text-slate-950">
                    {event.event_type}
                    {event.from_status || event.to_status
                      ? `: ${event.from_status ?? "-"} -> ${event.to_status ?? "-"}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(event.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Sem eventos registrados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
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
