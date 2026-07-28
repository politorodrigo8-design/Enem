import { AlertTriangle, CheckCircle2, MessageSquare, Search } from "lucide-react";
import { updateFeedbackStatusAction } from "@/lib/actions/feedback";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { formatDateTime } from "@/lib/db/scoring";
import {
  getAdminFeedbackInbox,
  type AdminFeedbackFilters,
} from "@/lib/db/queries";
import type { FeedbackInboxItem, FeedbackStatus, FeedbackType } from "@/lib/db/types";

const statusLabels: Record<FeedbackStatus, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  resolvido: "Resolvido",
  ignorado: "Ignorado",
};

const typeLabels: Record<FeedbackType, string> = {
  elogio: "Elogio",
  sugestao: "Sugestão",
  duvida: "Dúvida",
  problema: "Problema",
};

const statusTones: Record<FeedbackStatus, "blue" | "amber" | "green" | "slate"> = {
  novo: "blue",
  em_analise: "amber",
  resolvido: "green",
  ignorado: "slate",
};

export default async function FeedbacksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const filters: AdminFeedbackFilters = {
    status: firstParam(params.status) ?? "all",
    type: firstParam(params.type) ?? "all",
    rating: firstParam(params.rating) ?? "all",
    from: firstParam(params.from) ?? "",
    to: firstParam(params.to) ?? "",
    search: firstParam(params.search) ?? "",
  };
  const feedbacks = await getAdminFeedbackInbox(filters);
  const newCount = feedbacks.filter((item) => item.status === "novo").length;
  const saved = firstParam(params.salvo);
  const returnQuery = buildReturnQuery(filters);

  return (
    <div>
      <DashboardPageHeader
        title="Feedbacks"
        description={`${newCount} ${newCount === 1 ? "feedback novo" : "feedbacks novos"} nos filtros atuais.`}
      />

      {saved === "1" ? (
        <Notice tone="success" icon={CheckCircle2} className="mb-6">
          Feedback atualizado.
        </Notice>
      ) : saved === "0" ? (
        <Notice tone="warning" icon={AlertTriangle} className="mb-6">
          Não foi possível salvar a atualização. Tente novamente.
        </Notice>
      ) : null}

      <Card className="mb-6">
        <CardContent className="p-4 sm:p-5">
          <form className="grid gap-3 lg:grid-cols-[1fr_160px_160px_120px_140px_140px_auto]">
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Buscar
              <input
                name="search"
                defaultValue={filters.search}
                placeholder="Nome, e-mail, mensagem, rota ou ID"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              />
            </label>
            <Select name="status" label="Status" value={filters.status} options={statusOptions} />
            <Select name="type" label="Tipo" value={filters.type} options={typeOptions} />
            <Select name="rating" label="Nota" value={filters.rating} options={ratingOptions} />
            <DateInput name="from" label="De" value={filters.from} />
            <DateInput name="to" label="Até" value={filters.to} />
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                <Search className="h-4 w-4" aria-hidden="true" />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {feedbacks.length ? (
        <div className="space-y-3">
          {feedbacks.map((feedback) => (
            <FeedbackRow key={feedback.id} feedback={feedback} returnQuery={returnQuery} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title="Nenhum feedback encontrado"
          description="Ajuste os filtros ou aguarde novos envios dos alunos."
        />
      )}
    </div>
  );
}

function FeedbackRow({
  feedback,
  returnQuery,
}: {
  feedback: FeedbackInboxItem;
  returnQuery: string;
}) {
  const userName = feedback.profiles?.full_name || "Aluno";
  const email = feedback.email || feedback.profiles?.email || "Sem e-mail";

  return (
    <details className="group rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTones[feedback.status]}>{statusLabels[feedback.status]}</Badge>
            <Badge tone="slate">{typeLabels[feedback.feedback_type]}</Badge>
            {feedback.rating ? <Badge tone="amber">{feedback.rating}/5</Badge> : null}
          </div>
          <p className="mt-2 line-clamp-2 break-words text-sm font-semibold text-slate-950">
            {feedback.message}
          </p>
          <p className="mt-1 break-words text-xs text-slate-500">
            {userName} · {email} · {feedback.route}
          </p>
        </div>
        <time className="tnum shrink-0 text-xs font-semibold text-slate-500">
          {formatDateTime(feedback.created_at)}
        </time>
      </summary>

      <div className="border-t border-slate-100 p-4 sm:p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <Detail label="Usuário" value={userName} />
          <Detail label="E-mail" value={email} />
          <Detail label="Origem" value={feedback.source} />
          <Detail label="Rota" value={feedback.route} />
          <Detail label="Relacionado" value={feedback.related_id || "-"} />
          <Detail label="Navegador" value={feedback.user_agent_summary || "-"} />
          <Detail label="Criado em" value={formatDateTime(feedback.created_at)} />
          <Detail label="Lido em" value={feedback.read_at ? formatDateTime(feedback.read_at) : "-"} />
        </dl>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mensagem
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
            {feedback.message}
          </p>
        </div>

        <form action={updateFeedbackStatusAction} className="mt-5 grid gap-3 lg:grid-cols-[180px_1fr_auto] lg:items-end">
          <input type="hidden" name="id" value={feedback.id} />
          <input type="hidden" name="return_query" value={returnQuery} />
          <Select
            name="status"
            label="Status"
            value={feedback.status}
            options={statusOptions.filter((option) => option.value !== "all")}
          />
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Observação interna
            <textarea
              name="internal_note"
              defaultValue={feedback.internal_note ?? ""}
              rows={2}
              maxLength={2000}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              placeholder="Anote decisão, link de tarefa ou contexto interno."
            />
          </label>
          <Button type="submit">Salvar</Button>
        </form>
      </div>
    </details>
  );
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-600">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateInput({ name, label, value }: { name: string; label: string; value?: string }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-600">
      {label}
      <input
        type="date"
        name={name}
        defaultValue={value}
        className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
      />
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Serializa os filtros atuais para a action devolver o admin à mesma listagem. */
function buildReturnQuery(filters: AdminFeedbackFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== "all") params.set(key, value);
  }
  return params.toString();
}

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "novo", label: "Novo" },
  { value: "em_analise", label: "Em análise" },
  { value: "resolvido", label: "Resolvido" },
  { value: "ignorado", label: "Ignorado" },
];

const typeOptions = [
  { value: "all", label: "Todos" },
  { value: "elogio", label: "Elogio" },
  { value: "sugestao", label: "Sugestão" },
  { value: "duvida", label: "Dúvida" },
  { value: "problema", label: "Problema" },
];

const ratingOptions = [
  { value: "all", label: "Todas" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];
