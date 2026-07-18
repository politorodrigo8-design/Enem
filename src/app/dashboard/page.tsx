import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Flame,
  PlayCircle,
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
import { getDashboardData } from "@/lib/db/queries";
import { priorityLabel } from "@/lib/db/scoring";
import { priorityTone } from "@/lib/utils";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const hasAnswers = data.answered > 0;

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
      label: "Plano semanal",
      value: `${data.planProgress}%`,
      helper: `${data.completedPlanItems}/${data.totalPlanItems} atividades`,
      icon: CalendarCheck,
    },
    {
      label: "Simulados",
      value: hasAnswers ? "Ativo" : "Comece agora",
      helper: "treinos no formato da prova",
      icon: Flame,
    },
  ];

  return (
    <div>
      <DashboardPageHeader
        title="Visão geral"
        description="Suas respostas, prioridades e plano semanal em um só lugar."
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            helper={metric.helper}
            icon={metric.icon}
          />
        ))}
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

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
                      href={`/dashboard/questoes?topic=${topic.id}`}
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

        <Card>
          <CardHeader>
            <CardTitle>Recomendação da semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-blue-50 p-4">
              <CalendarCheck className="h-6 w-6 text-blue-700" aria-hidden="true" />
              <p className="mt-4 text-sm leading-6 text-blue-950">
                {data.priorities[0]
                  ? `Seu maior potencial de evolução está em ${data.priorities[0].topic.name}. A prioridade combina recorrência, taxa de erro e importância estratégica.`
                  : "Responda questões ou conclua o diagnóstico para gerar uma recomendação personalizada."}
              </p>
              <Link
                href="/dashboard/plano"
                className={buttonClasses({ variant: "primary", className: "mt-5" })}
              >
                Ver plano da semana
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
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Progresso semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={data.planProgress} label="Plano concluído" tone="green" />
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-600">Média geral até aqui</p>
              <Badge tone="green">{data.accuracy}% de acerto</Badge>
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
                    <p className="text-sm font-bold text-slate-950">{activity.title}</p>
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
      </section>
    </div>
  );
}
