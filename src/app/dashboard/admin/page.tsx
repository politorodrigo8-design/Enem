import Link from "next/link";
import {
  ArrowRight,
  Coins,
  CreditCard,
  FileCheck2,
  MessageSquare,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendChart } from "@/components/admin/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { getAdminOverview } from "@/lib/db/admin-queries";
import { formatCentsBRL } from "@/lib/admin/rules.mjs";

export const dynamic = "force-dynamic";

const periodOptions = [7, 30, 90];

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawPeriod = Number(Array.isArray(params.periodo) ? params.periodo[0] : params.periodo);
  const periodDays = periodOptions.includes(rawPeriod) ? rawPeriod : 30;
  const overview = await getAdminOverview(periodDays);

  const alerts = buildAlerts(overview);

  return (
    <div>
      <DashboardPageHeader
        title="Visão geral"
        description={`Como a plataforma está performando nos últimos ${periodDays} dias.`}
        action={<PeriodPicker current={periodDays} />}
      />

      {alerts.length ? (
        <div className="mb-6 grid gap-3">
          {alerts.map((alert) => (
            <Notice key={alert.text} tone={alert.tone}>
              {alert.text}{" "}
              <Link href={alert.href} className="font-semibold underline underline-offset-2">
                {alert.action}
              </Link>
            </Notice>
          ))}
        </div>
      ) : null}

      <section aria-labelledby="resumo-financeiro">
        <h2 id="resumo-financeiro" className="sr-only">
          Resumo financeiro
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Receita no período"
            value={formatCentsBRL(overview.revenue.currentCents)}
            helper={changeHelper(overview.revenue.changePercent, "período anterior")}
            icon={TrendingUp}
          />
          <StatCard
            label="Receita acumulada"
            value={formatCentsBRL(overview.revenue.netCents)}
            helper={`${overview.revenue.paidOrders} pedidos pagos · ticket ${formatCentsBRL(
              overview.revenue.averageTicketCents,
            )}`}
            icon={CreditCard}
          />
          <StatCard
            label="Clientes pagantes"
            value={String(overview.customers.paying)}
            helper={`${overview.customers.conversionPercent}% dos ${overview.customers.total} cadastros`}
            icon={Users}
          />
          <StatCard
            label="Novos cadastros"
            value={String(overview.customers.newInPeriod)}
            helper={changeHelper(overview.customers.changePercent, "período anterior")}
            icon={UserPlus}
          />
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3" aria-labelledby="tendencias">
        <h2 id="tendencias" className="sr-only">
          Tendências
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Receita por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={overview.charts.revenueByDay}
              format={(value) =>
                new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                }).format(value)
              }
              emptyLabel="Nenhum pagamento aprovado no período."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cadastros por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={overview.charts.signupsByDay}
              emptyLabel="Nenhum cadastro novo no período."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Questões respondidas por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={overview.charts.answersByDay}
              emptyLabel="Nenhuma questão respondida no período."
            />
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-labelledby="operacao">
        <h2 id="operacao" className="sr-only">
          Operação
        </h2>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Redações</CardTitle>
              <FileCheck2 className="h-4.5 w-4.5 text-slate-300" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <p className="tnum text-3xl font-bold tracking-tight text-slate-950">
              {overview.essays.open}
            </p>
            <p className="mt-1 text-xs text-slate-500">na fila agora</p>
            <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              <Row label="Pendentes" value={overview.essays.pending} />
              <Row label="Em análise" value={overview.essays.inReview} />
              <Row
                label="Sem responsável"
                value={overview.essays.unassigned}
                tone={overview.essays.unassigned > 0 ? "warning" : undefined}
              />
              <Row label={`Concluídas (${periodDays}d)`} value={overview.essays.completedInPeriod} />
            </dl>
            <Link
              href="/dashboard/redacoes"
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 sm:min-h-0"
            >
              Abrir fila <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Feedbacks</CardTitle>
              <MessageSquare className="h-4.5 w-4.5 text-slate-300" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <p className="tnum text-3xl font-bold tracking-tight text-slate-950">
              {overview.feedbacks.open}
            </p>
            <p className="mt-1 text-xs text-slate-500">aguardando resposta</p>
            <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              <Row
                label="Não lidos"
                value={overview.feedbacks.unread}
                tone={overview.feedbacks.unread > 0 ? "warning" : undefined}
              />
              <Row label="Total recebido" value={overview.feedbacks.total} />
            </dl>
            <Link
              href="/dashboard/feedbacks"
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 sm:min-h-0"
            >
              Abrir caixa <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Engajamento</CardTitle>
              <Users className="h-4.5 w-4.5 text-slate-300" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <p className="tnum text-3xl font-bold tracking-tight text-slate-950">
              {overview.engagement.activeStudents}
            </p>
            <p className="mt-1 text-xs text-slate-500">alunos ativos no período</p>
            <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              <Row label="Questões respondidas" value={overview.engagement.answers} />
              <Row label="Sessões de treino" value={overview.engagement.practiceSessions} />
              <Row label="Simulados" value={overview.engagement.simulations} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Créditos e indicações</CardTitle>
              <Coins className="h-4.5 w-4.5 text-slate-300" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <p className="tnum text-3xl font-bold tracking-tight text-slate-950">
              {overview.credits.outstanding}
            </p>
            <p className="mt-1 text-xs text-slate-500">créditos em circulação</p>
            <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              <Row label={`Consumidos (${periodDays}d)`} value={overview.credits.consumedInPeriod} />
              <Row label="Indicações premiadas" value={overview.referrals.rewarded} />
              <Row label="Indicações em aberto" value={overview.referrals.pending} />
            </dl>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6" aria-labelledby="base">
        <h2 id="base" className="sr-only">
          Composição da base
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Composição da base</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Cadastros" value={overview.customers.total} />
              <Metric
                label="Onboarding concluído"
                value={overview.customers.onboardingCompleted}
                helper={`${percent(
                  overview.customers.onboardingCompleted,
                  overview.customers.total,
                )}% da base`}
              />
              <Metric
                label="Acessos expirados"
                value={overview.customers.expired}
                helper={overview.customers.expired > 0 ? "renovação em aberto" : "nenhum"}
              />
              <Metric label="Pedidos pendentes" value={overview.revenue.pendingOrders} />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function PeriodPicker({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      {periodOptions.map((option) => (
        <Link
          key={option}
          href={`/dashboard/admin?periodo=${option}`}
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

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warning";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="min-w-0 truncate text-slate-600">{label}</dt>
      <dd
        className={
          tone === "warning"
            ? "tnum shrink-0 font-bold text-amber-700"
            : "tnum shrink-0 font-semibold text-slate-950"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="tnum mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function changeHelper(change: number | null, reference: string) {
  if (change === null) return `sem ${reference} para comparar`;
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${change}% vs. ${reference}`;
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function buildAlerts(overview: Awaited<ReturnType<typeof getAdminOverview>>) {
  const alerts: { text: string; href: string; action: string; tone: "warning" | "info" }[] = [];

  if (overview.essays.unassigned > 0) {
    alerts.push({
      tone: "warning",
      text: `${overview.essays.unassigned} redação(ões) na fila sem responsável atribuído.`,
      href: "/dashboard/redacoes?unassigned=1",
      action: "Atribuir agora",
    });
  }

  if (overview.feedbacks.unread > 0) {
    alerts.push({
      tone: "info",
      text: `${overview.feedbacks.unread} feedback(s) ainda não lido(s).`,
      href: "/dashboard/feedbacks",
      action: "Ler feedbacks",
    });
  }

  if (overview.customers.expired > 0) {
    alerts.push({
      tone: "info",
      text: `${overview.customers.expired} cliente(s) com acesso expirado.`,
      href: "/dashboard/admin/clientes?status=expired",
      action: "Ver clientes",
    });
  }

  return alerts;
}
