import Link from "next/link";
import { ArrowRight, FileText, Search } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminEssayQueue } from "@/lib/db/queries";
import { formatAppDateTime } from "@/lib/dates";
import { EssayCleanupButton } from "./essay-cleanup-button";

export const dynamic = "force-dynamic";

const statusLabels = {
  all: "Todos",
  uploading: "Enviando",
  pending: "Pendente",
  in_review: "Em analise",
  completed: "Concluida",
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

export default async function AdminEssaysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = getParam(params.status) || "all";
  const from = getParam(params.from);
  const to = getParam(params.to);
  const student = getParam(params.student);
  const responsible = getParam(params.responsible);
  const unassigned = getParam(params.unassigned);
  const essays = await getAdminEssayQueue({ status, from, to, student, responsible, unassigned });

  return (
    <div>
      <DashboardPageHeader
        title="Fila de redacoes"
        description="Envios recebidos, arquivos privados e atribuicao administrativa para correcao externa."
        action={<EssayCleanupButton />}
      />

      <Card className="mb-6">
        <CardContent>
          <form className="grid gap-3 xl:grid-cols-[1fr_1fr_150px_150px_170px_auto]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Aluno
              </span>
              <input
                name="student"
                defaultValue={student}
                placeholder="Nome ou e-mail"
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Responsavel
              </span>
              <input
                name="responsible"
                defaultValue={responsible}
                placeholder="Nome, e-mail ou ID"
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </span>
              <select
                name="status"
                defaultValue={status}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                De
              </span>
              <input
                name="from"
                type="date"
                defaultValue={from}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ate
              </span>
              <input
                name="to"
                type="date"
                defaultValue={to}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="flex items-end gap-2">
              <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  name="unassigned"
                  value="1"
                  defaultChecked={unassigned === "1"}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Livres
              </label>
              <button className={buttonClasses({ className: "h-10" })}>
                <Search className="h-4 w-4" aria-hidden="true" />
                Filtrar
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {essays.length ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-[1.1fr_1.2fr_130px_120px_150px_130px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Aluno</span>
            <span>Tema</span>
            <span>Envio</span>
            <span>Arquivos</span>
            <span>Responsavel</span>
            <span>Status</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {essays.map((essay) => (
              <li key={essay.id}>
                <Link
                  href={`/dashboard/redacoes/${essay.id}`}
                  className="grid grid-cols-[1.1fr_1.2fr_130px_120px_150px_130px] items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-950">
                      {essay.profiles?.full_name || "Aluno sem nome"}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {essay.profiles?.email || essay.user_id}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-1 text-slate-700">{essay.theme}</span>
                    {essay.student_note ? (
                      <span className="line-clamp-1 text-xs text-slate-500">
                        {essay.student_note}
                      </span>
                    ) : null}
                  </span>
                  <span className="tnum text-slate-600">{formatShortDate(essay.submitted_at)}</span>
                  <span className="text-slate-600">
                    {essay.delivery_type === "online"
                      ? `Online · ${essay.word_count} palavras`
                      : `${essay.file_count || essay.essay_submission_files?.length || 0} pag. · ${summarizeMimeTypes(essay.essay_submission_files ?? [])}`}
                  </span>
                  <span className="truncate text-slate-600">
                    {essay.assigned_admin_profile?.full_name ||
                      essay.assigned_admin_profile?.email ||
                      "Nao assumida"}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <Badge tone={statusTones[essay.status]}>
                      {statusLabels[essay.status]}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Nenhuma redacao encontrada"
          description="Ajuste os filtros ou aguarde novos envios dos alunos."
        />
      )}
    </div>
  );
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatShortDate(value: string) {
  return formatAppDateTime(value, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function summarizeMimeTypes(files: Array<{ mime_type: string }>) {
  if (!files.length) return "-";
  const types = new Set(files.map((file) => (file.mime_type === "application/pdf" ? "PDF" : "Imagem")));
  return Array.from(types).join(" + ");
}
