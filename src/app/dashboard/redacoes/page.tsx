import Link from "next/link";
import { ArrowRight, Clock3, FileText, Search } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { getAdminEssayQueue } from "@/lib/db/queries";
import { formatAppDateTime } from "@/lib/dates";
import { ESSAY_TURNAROUND_LABEL, essayWaitStatus } from "@/lib/schemas/essay";
import { EssayCleanupButton } from "./essay-cleanup-button";

export const dynamic = "force-dynamic";

const statusLabels = {
  all: "Todos",
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

// 44px de alvo de toque no mobile, densidade de 40px a partir de sm.
const fieldClass =
  "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-10";

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

  // A consulta já vem do envio mais antigo para o mais novo: o primeiro que
  // ainda espera é o que está há mais tempo na fila.
  const waitingEssays = essays.filter((essay) => isWaiting(essay.status));
  const overdueCount = waitingEssays.filter(
    (essay) => essayWaitStatus(essay.submitted_at).overdue,
  ).length;
  const oldestWait = waitingEssays[0]
    ? essayWaitStatus(waitingEssays[0].submitted_at)
    : null;

  return (
    <div>
      <DashboardPageHeader
        title="Fila de redações"
        description="Envios recebidos, arquivos privados e atribuição administrativa para correção externa."
        action={<EssayCleanupButton />}
      />

      {waitingEssays.length ? (
        <Notice
          tone={overdueCount ? "warning" : "info"}
          icon={Clock3}
          className="mb-6"
          title={`${waitingEssays.length} aguardando correção · ${overdueCount} fora do prazo`}
        >
          Prazo prometido ao aluno: {ESSAY_TURNAROUND_LABEL}.
          {oldestWait
            ? ` O envio mais antigo desta lista espera ${formatWaiting(oldestWait.hoursWaiting)}.`
            : ""}
        </Notice>
      ) : null}

      <Card className="mb-6">
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_140px_140px_140px] xl:items-end 2xl:grid-cols-[minmax(200px,1fr)_minmax(200px,1fr)_150px_150px_150px_auto]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Aluno
              </span>
              <input
                name="student"
                defaultValue={student}
                placeholder="Nome ou e-mail"
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Responsável
              </span>
              <input
                name="responsible"
                defaultValue={responsible}
                placeholder="Nome, e-mail ou ID"
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </span>
              <select name="status" defaultValue={status} className={fieldClass}>
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
              <input name="from" type="date" defaultValue={from} className={fieldClass} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Até
              </span>
              <input name="to" type="date" defaultValue={to} className={fieldClass} />
            </label>
            <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-5 2xl:col-span-1">
              <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 sm:h-10">
                <input
                  type="checkbox"
                  name="unassigned"
                  value="1"
                  defaultChecked={unassigned === "1"}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Livres
              </label>
              <button className={buttonClasses()}>
                <Search className="h-4 w-4" aria-hidden="true" />
                Filtrar
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {essays.length ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {/* A grade só cabe a partir de xl; abaixo disso cada linha vira
              cartão empilhado com rótulos próprios. */}
          <div className="hidden grid-cols-[minmax(150px,1.1fr)_minmax(170px,1.2fr)_110px_110px_130px_120px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 xl:grid">
            <span>Aluno</span>
            <span>Tema</span>
            <span>Envio</span>
            <span>Arquivos</span>
            <span>Responsável</span>
            <span>Status</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {essays.map((essay) => {
              const wait = isWaiting(essay.status) ? essayWaitStatus(essay.submitted_at) : null;

              return (
                <li key={essay.id}>
                  <Link
                    href={`/dashboard/redacoes/${essay.id}`}
                    className="block px-4 py-4 text-sm transition-colors hover:bg-slate-50 xl:grid xl:grid-cols-[minmax(150px,1.1fr)_minmax(170px,1.2fr)_110px_110px_130px_120px] xl:items-center xl:gap-4 xl:py-3"
                  >
                    <span className="block min-w-0">
                      <span className="block truncate font-semibold text-slate-950">
                        {essay.profiles?.full_name || "Aluno sem nome"}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {essay.profiles?.email || essay.user_id}
                      </span>
                    </span>
                    <span className="mt-3 block min-w-0 xl:mt-0">
                      <span className="line-clamp-1 text-slate-700">{essay.theme}</span>
                      {essay.student_note ? (
                        <span className="line-clamp-1 text-xs text-slate-500">
                          {essay.student_note}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-3 flex items-start justify-between gap-3 text-xs text-slate-600 xl:mt-0 xl:block xl:text-sm">
                      <span className="shrink-0 font-semibold uppercase tracking-wide text-slate-500 xl:hidden">
                        Envio
                      </span>
                      <span className="tnum text-right xl:text-left">
                        <span className="block">{formatShortDate(essay.submitted_at)}</span>
                        {wait ? (
                          <span
                            className={`block text-xs font-semibold ${
                              wait.overdue
                                ? "text-rose-600"
                                : wait.nearingDeadline
                                  ? "text-amber-600"
                                  : "text-slate-500"
                            }`}
                          >
                            {formatWaiting(wait.hoursWaiting)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600 xl:mt-0 xl:block xl:text-sm">
                      <span className="shrink-0 font-semibold uppercase tracking-wide text-slate-500 xl:hidden">
                        Arquivos
                      </span>
                      <span className="text-right xl:text-left">
                        {essay.delivery_type === "online"
                          ? `Online · ${essay.word_count} palavras`
                          : `${essay.file_count || essay.essay_submission_files?.length || 0} pag. · ${summarizeMimeTypes(essay.essay_submission_files ?? [])}`}
                      </span>
                    </span>
                    <span className="mt-2 flex min-w-0 items-center justify-between gap-3 text-xs text-slate-600 xl:mt-0 xl:block xl:text-sm">
                      <span className="shrink-0 font-semibold uppercase tracking-wide text-slate-500 xl:hidden">
                        Responsável
                      </span>
                      <span className="truncate">
                        {essay.assigned_admin_profile?.full_name ||
                          essay.assigned_admin_profile?.email ||
                          "Não assumida"}
                      </span>
                    </span>
                    <span className="mt-4 flex items-center justify-between gap-2 xl:mt-0">
                      <Badge tone={statusTones[essay.status]}>
                        {statusLabels[essay.status]}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Nenhuma redação encontrada"
          description="Ajuste os filtros ou aguarde novos envios dos alunos."
        />
      )}
    </div>
  );
}

function isWaiting(status: keyof typeof statusTones) {
  return status === "pending" || status === "in_review";
}

function formatWaiting(hours: number) {
  if (hours < 1) return "aguardando há menos de 1h";
  if (hours < 48) return `aguardando há ${hours}h`;
  return `aguardando há ${Math.floor(hours / 24)} dias`;
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
