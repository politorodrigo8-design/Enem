import Link from "next/link";
import { ArrowRight, Activity, Clock3, FileCheck2, Target } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminActivity } from "@/lib/db/admin-queries";
import { formatAdminDateTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

const essayStatusLabels: Record<string, string> = {
  uploading: "Enviando",
  pending: "Pendente",
  in_review: "Em análise",
  completed: "Concluída",
  cancelled: "Cancelada",
  upload_failed: "Falha no envio",
};

const essayStatusTones: Record<string, "green" | "red" | "amber" | "blue" | "slate"> = {
  uploading: "amber",
  pending: "blue",
  in_review: "blue",
  completed: "green",
  cancelled: "slate",
  upload_failed: "red",
};

const referralStatusLabels: Record<string, string> = {
  registered: "Cadastrado",
  awaiting_purchase: "Aguardando compra",
  payment_confirmed: "Pagamento confirmado",
  pending_release: "Aguardando liberação",
  reward_granted: "Prêmio concedido",
  cancelled: "Cancelada",
  refunded: "Estornada",
  blocked: "Bloqueada",
};

const eventLabels: Record<string, string> = {
  signup_completed: "Cadastro concluído",
  checkout_started: "Checkout iniciado",
  order_created: "Pedido criado",
  payment_approved: "Pagamento aprovado",
  payment_pending: "Pagamento pendente",
  payment_rejected: "Pagamento recusado",
  access_granted: "Acesso liberado",
  onboarding_completed: "Onboarding concluído",
  diagnosis_completed: "Diagnóstico concluído",
  question_answered: "Questão respondida",
  practice_session_completed: "Treino concluído",
  simulation_completed: "Simulado concluído",
  simulation_started: "Simulado iniciado",
  study_plan_generated: "Plano gerado",
  essay_submitted: "Redação enviada",
  essay_corrected: "Redação corrigida",
  feedback_submitted: "Feedback enviado",
  premium_block_seen: "Bloqueio premium visto",
  credit_package_purchased: "Pacote de créditos comprado",
};

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Number(Array.isArray(params.periodo) ? params.periodo[0] : params.periodo);
  const periodDays = [7, 30, 90].includes(raw) ? raw : 30;
  const activity = await getAdminActivity(periodDays);

  return (
    <div>
      <DashboardPageHeader
        title="Operação"
        description={`O que os alunos fizeram na plataforma nos últimos ${periodDays} dias.`}
        action={<PeriodPicker current={periodDays} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Questões respondidas"
          value={String(activity.practice.answers)}
          helper={`${activity.practice.accuracy}% de acerto geral`}
          icon={Activity}
        />
        <StatCard
          label="Sessões de treino"
          value={String(activity.practice.sessions)}
          helper={`${activity.practice.finished} finalizadas`}
          icon={Target}
        />
        <StatCard
          label="Redações na base"
          value={String(activity.essays.total)}
          helper={
            activity.essays.averageTurnaroundHours !== null
              ? `entrega média em ${activity.essays.averageTurnaroundHours}h`
              : "nenhuma concluída ainda"
          }
          icon={FileCheck2}
        />
        <StatCard
          label="Aguardando há mais tempo"
          value={
            activity.essays.oldestOpenAt
              ? `${daysWaiting(activity.essays.oldestOpenAt)}d`
              : "—"
          }
          helper={
            activity.essays.oldestOpenAt
              ? formatAdminDateTime(activity.essays.oldestOpenAt)
              : "fila vazia"
          }
          icon={Clock3}
        />
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Redações por status</CardTitle>
              <Link
                href="/dashboard/redacoes"
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                Abrir fila
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {activity.essays.byStatus.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma redação recebida.</p>
            ) : (
              <ul className="space-y-2.5">
                {activity.essays.byStatus.map((status) => (
                  <li key={status.status} className="flex items-center justify-between gap-3">
                    <Badge tone={essayStatusTones[status.status] ?? "slate"}>
                      {essayStatusLabels[status.status] ?? status.status}
                    </Badge>
                    <span className="tnum text-sm font-semibold text-slate-950">
                      {status.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas redações recebidas</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.essays.recent.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma redação recebida.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {activity.essays.recent.slice(0, 8).map((essay) => (
                  <li key={essay.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{essay.theme}</p>
                      <p className="truncate text-xs text-slate-500">
                        {essay.student} · {formatAdminDateTime(essay.submitted_at)}
                      </p>
                    </div>
                    <Badge tone={essayStatusTones[essay.status] ?? "slate"}>
                      {essayStatusLabels[essay.status] ?? essay.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assuntos mais estudados</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.topics.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma questão respondida no período.</p>
            ) : (
              <ul className="space-y-3">
                {activity.topics.map((topic) => (
                  <li key={topic.name}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium text-slate-700">
                        {topic.name}
                      </span>
                      <span className="tnum shrink-0 text-slate-950">
                        <span className="font-semibold">{topic.answers}</span>
                        <span className="ml-2 text-xs text-slate-500">{topic.accuracy}%</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-md bg-slate-100">
                      <div
                        className={
                          topic.accuracy < 50
                            ? "h-full rounded-md bg-rose-500"
                            : "h-full rounded-md bg-blue-700"
                        }
                        style={{ width: `${Math.max(topic.accuracy, 2)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eventos do produto</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.events.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum evento no período.</p>
            ) : (
              <ul className="space-y-2">
                {activity.events.map((event) => (
                  <li key={event.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-slate-700">
                      {eventLabels[event.name] ?? event.name}
                    </span>
                    <span className="tnum shrink-0 font-semibold text-slate-950">
                      {event.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Indicações</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.referrals.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma indicação registrada.</p>
            ) : (
              <ul className="space-y-2.5">
                {activity.referrals.map((referral) => (
                  <li
                    key={referral.status}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-slate-700">
                      {referralStatusLabels[referral.status] ?? referral.status}
                    </span>
                    <span className="tnum font-semibold text-slate-950">{referral.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simulados e planos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">Simulados no período</dt>
                <dd className="tnum font-semibold text-slate-950">
                  {activity.practice.simulations}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">Planos de estudo criados</dt>
                <dd className="tnum font-semibold text-slate-950">
                  {activity.practice.studyPlans}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">Sessões finalizadas</dt>
                <dd className="tnum font-semibold text-slate-950">
                  {activity.practice.finished} de {activity.practice.sessions}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function PeriodPicker({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      {[7, 30, 90].map((option) => (
        <Link
          key={option}
          href={`/dashboard/admin/atividade?periodo=${option}`}
          aria-current={option === current ? "true" : undefined}
          className={
            option === current
              ? "inline-flex min-h-11 items-center rounded-md bg-blue-700 px-3 text-sm font-semibold text-white sm:min-h-9"
              : "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:min-h-9"
          }
        >
          {option}d
        </Link>
      ))}
    </div>
  );
}

function daysWaiting(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
