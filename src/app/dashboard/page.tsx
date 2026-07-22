import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Coins,
  FileText,
  History,
  ListChecks,
  PenLine,
  PlayCircle,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import { AreaBars } from "@/components/charts/area-bars";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Reveal } from "@/components/ui/reveal";
import { getAccessContext } from "@/lib/access";
import {
  getCurrentStudyPlan,
  getDashboardData,
  getDashboardEssayCreditData,
  getProfile,
} from "@/lib/db/queries";
import type { CreditLedgerEntry, EssaySubmission } from "@/lib/db/types";
import { priorityLabel } from "@/lib/db/scoring";
import { ESSAY_CREDIT_COST } from "@/lib/schemas/essay";
import { ESSAY_CREDIT_COST_LABEL } from "@/lib/product-config";
import { priorityTone } from "@/lib/utils";
import { StudyPlanSection } from "./study-plan-section";

const essayStatusLabels: Record<EssaySubmission["status"], string> = {
  uploading: "Enviando",
  pending: "Aguardando correção",
  in_review: "Em análise",
  completed: "Correção disponível",
  cancelled: "Cancelada",
  upload_failed: "Falha no envio",
};

const essayStatusTones: Record<EssaySubmission["status"], "blue" | "green" | "red" | "slate" | "amber"> = {
  uploading: "amber",
  pending: "blue",
  in_review: "blue",
  completed: "green",
  cancelled: "red",
  upload_failed: "red",
};

export default async function DashboardPage() {
  const [data, plan, profile, essayCreditData] = await Promise.all([
    getDashboardData(),
    getCurrentStudyPlan(),
    getProfile(),
    getDashboardEssayCreditData(),
  ]);
  const access = getAccessContext(profile);
  const hasAnswers = data.answered > 0;
  const latestEssay = essayCreditData.latestEssay;
  const essayAction = getEssayAction(latestEssay);
  const recommendation = getWeeklyRecommendation(
    data.priorities[0]?.topic.name,
    latestEssay,
  );
  const latestDebit = essayCreditData.latestDebit
    ? formatLedgerEntry(essayCreditData.latestDebit)
    : "Nenhum consumo registrado";
  const lowCredits = essayCreditData.account.balance < ESSAY_CREDIT_COST;

  const metrics = [
    {
      label: "Questões respondidas",
      value: String(data.answered),
      helper: "desde o início",
      icon: CheckCircle2,
    },
    {
      label: "Taxa geral de acertos",
      value: `${data.accuracy}%`,
      helper: `${data.correct} acertos registrados`,
      icon: TrendingUp,
    },
    {
      label: "Atividades da semana",
      value: `${data.completedPlanItems}/${data.totalPlanItems}`,
      helper: "concluídas no plano atual",
      icon: ListChecks,
    },
  ];

  return (
    <div>
      <DashboardPageHeader
        title="Hoje"
        description="O que fazer agora: seu plano da semana, prioridades e progresso."
        action={
          <Link
            href="/dashboard/diagnostico"
            className={buttonClasses({ variant: "primary" })}
          >
            Atualizar diagnóstico
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric, index) => (
          <Reveal key={metric.label} delay={index * 60}>
            <StatCard
              label={metric.label}
              value={metric.value}
              helper={metric.helper}
              icon={metric.icon}
            />
          </Reveal>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr_0.8fr]">
        <Reveal delay={80}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
                Redação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniMetric label="Enviadas" value={essayCreditData.essayCounts.total} />
                <MiniMetric label="Aguardando" value={essayCreditData.essayCounts.pending} />
                <MiniMetric label="Em análise" value={essayCreditData.essayCounts.inReview} />
                <MiniMetric label="Concluídas" value={essayCreditData.essayCounts.completed} />
              </div>
              <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mais recente
                </p>
                {latestEssay ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={essayStatusTones[latestEssay.status]}>
                      {essayStatusLabels[latestEssay.status]}
                    </Badge>
                    <span className="text-sm text-slate-600">
                      {latestEssay.theme || "Redação sem tema informado"}
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Nenhuma redação enviada ainda.
                  </p>
                )}
              </div>
              <Link href={essayAction.href} className={buttonClasses({ variant: "outline" })}>
                <PenLine className="h-4 w-4" aria-hidden="true" />
                {essayAction.label}
              </Link>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={120}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
                Créditos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Saldo atual
                </p>
                <p className="tnum mt-1 text-3xl font-bold text-slate-950">
                  {essayCreditData.account.balance}
                  <span className="ml-1.5 text-base font-semibold text-slate-500">
                    créditos
                  </span>
                </p>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Último consumo: <span className="font-semibold text-slate-900">{latestDebit}</span>
              </p>
              {lowCredits ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium leading-6 text-amber-800 ring-1 ring-inset ring-amber-200">
                  Saldo abaixo do custo atual de redação ({ESSAY_CREDIT_COST_LABEL}).
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard/creditos" className={buttonClasses({ variant: "primary" })}>
                  Abrir créditos
                </Link>
                <Link href="/dashboard/creditos#historico" className={buttonClasses({ variant: "outline" })}>
                  <History className="h-4 w-4" aria-hidden="true" />
                  Histórico
                </Link>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={160}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Atalhos rápidos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 pt-3">
              {[
                { label: "Enviar redação", href: "/dashboard/correcao-redacao", icon: PenLine },
                { label: "Continuar plano", href: "/dashboard/plano", icon: CalendarCheck },
                { label: "Praticar questões", href: "/dashboard/praticar", icon: PlayCircle },
                { label: "Atualizar diagnóstico", href: "/dashboard/diagnostico", icon: RefreshCw },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <item.icon className="h-4 w-4 text-blue-700" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </CardContent>
          </Card>
        </Reveal>
      </section>

      {!hasAnswers ? (
        <div className="mt-6">
          <EmptyState
            icon={Target}
            title="Seu painel ainda está vazio"
            description="Faça o diagnóstico para mapear seu ponto de partida — suas prioridades personalizadas aparecem aqui em seguida."
            action={
              <Link
                href="/dashboard/diagnostico"
                className={buttonClasses({ variant: "primary" })}
              >
                Começar diagnóstico
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
        </div>
      ) : null}

      <section id="plano-semana" className="mt-6">
        <Reveal delay={80}>
          <StudyPlanSection plan={plan} access={access} />
        </Reveal>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Reveal delay={140}>
        <Card>
          <CardHeader>
            <CardTitle>Prioridades atuais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {data.priorities.map(({ topic, performance, score }) => {
              const label = priorityLabel(score);
              return (
                <div
                  key={topic.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        {topic.subjects.area}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-950">
                        {topic.subjects.name}: {topic.name}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${priorityTone(label)}`}
                    >
                      {label}
                    </span>
                  </div>
                  <Progress
                    className="mt-4"
                    value={Math.round(performance?.accuracy_percentage ?? 0)}
                    label="Taxa de acertos"
                    tone={(performance?.accuracy_percentage ?? 0) < 50 ? "red" : "blue"}
                  />
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-600">
                      Score estratégico {score}
                    </p>
                    <Link
                      href={`/dashboard/praticar?tab=banco&topic=${topic.id}`}
                      className={buttonClasses({ variant: "outline", size: "sm" })}
                    >
                      <PlayCircle className="h-4 w-4" aria-hidden="true" />
                      Começar treino
                    </Link>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        </Reveal>

        <Reveal delay={200} className="grid gap-6 content-start">
          <Card>
            <CardHeader>
              <CardTitle>Recomendação da semana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-blue-50 p-4">
                <CalendarCheck className="h-6 w-6 text-blue-700" aria-hidden="true" />
                <p className="mt-4 text-sm leading-6 text-blue-950">
                  {recommendation.text}
                </p>
                <Link
                  href={recommendation.href}
                  className={buttonClasses({ variant: "primary", className: "mt-5" })}
                >
                  {recommendation.label}
                </Link>
              </div>
              <div className="mt-5">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Taxa de acertos por área
                </p>
                {data.areaMetrics.length ? (
                  <AreaBars data={data.areaMetrics} />
                ) : (
                  <p className="text-sm leading-6 text-slate-500">
                    Ainda não há respostas suficientes para calcular áreas.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Atividades recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.recentActivities.length ? (
                data.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-md bg-blue-700" />
                    <div>
                      <p className="text-sm font-bold text-slate-950">
                        {activity.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {activity.description}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  Suas respostas, simulados e atividades concluídas aparecerão aqui.
                </p>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
      <p className="tnum text-xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function getEssayAction(essay: EssaySubmission | null) {
  if (!essay) {
    return { href: "/dashboard/correcao-redacao", label: "Enviar redação" };
  }

  if (essay.status === "completed") {
    return {
      href: `/dashboard/correcao-redacao/${essay.id}`,
      label: "Ver correção",
    };
  }

  return {
    href: `/dashboard/correcao-redacao/${essay.id}`,
    label: "Acompanhar redação",
  };
}

function getWeeklyRecommendation(topicName: string | undefined, essay: EssaySubmission | null) {
  if (essay?.status === "completed") {
    return {
      text: "Sua correção de redação já está disponível. Revise o retorno e depois siga para o treino das prioridades da semana.",
      href: `/dashboard/correcao-redacao/${essay.id}`,
      label: "Ver correção",
    };
  }

  if (essay?.status === "pending" || essay?.status === "in_review" || essay?.status === "uploading") {
    return {
      text: "Sua redação está em acompanhamento. Enquanto a correção não é disponibilizada, continue o plano e pratique os assuntos prioritários.",
      href: "/dashboard/praticar",
      label: "Praticar prioridades",
    };
  }

  if (!essay) {
    return {
      text: topicName
        ? `Seu maior potencial de evolução está em ${topicName}. Se ainda não enviou redação nesta rodada, também vale registrar uma para acompanhar essa frente.`
        : "Faça o diagnóstico e envie uma redação para que o painel acompanhe questões, plano e produção textual no mesmo lugar.",
      href: topicName ? "/dashboard/praticar" : "/dashboard/correcao-redacao",
      label: topicName ? "Treinar prioridades" : "Enviar redação",
    };
  }

  return {
    text: topicName
      ? `Seu maior potencial de evolução está em ${topicName}. A prioridade combina recorrência, taxa de erro e importância estratégica.`
      : "Responda questões ou conclua o diagnóstico para gerar uma recomendação personalizada.",
    href: "/dashboard/praticar",
    label: "Treinar prioridades",
  };
}

function formatLedgerEntry(entry: CreditLedgerEntry) {
  const labels: Partial<Record<CreditLedgerEntry["reason"], string>> = {
    essay_correction: "correção de redação",
    ai_question_explanation: "explicação de questão",
    ai_performance_analysis: "análise de desempenho",
    ai_study_plan: "plano inteligente",
  };
  const label = labels[entry.reason] ?? "uso de créditos";
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(entry.created_at));

  return `${Math.abs(entry.amount)} crédito${Math.abs(entry.amount) === 1 ? "" : "s"} em ${label} (${date})`;
}
