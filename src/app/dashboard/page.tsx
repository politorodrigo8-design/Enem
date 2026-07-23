import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  PenLine,
  PlayCircle,
  Timer,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Reveal } from "@/components/ui/reveal";
import { getAccessContext } from "@/lib/access";
import {
  getCurrentStudyPlan,
  getDashboardEssayCreditData,
  getProfile,
  getTodayStudy,
  getTopicsWithPerformance,
} from "@/lib/db/queries";
import { prioritizeTopics } from "@/lib/study/priorities";
import type { EssaySubmission } from "@/lib/db/types";
import { formatAppDateTime } from "@/lib/dates";
import { StudyPlanSection } from "./study-plan-section";

export default async function DashboardPage() {
  const [profile, plan, topics, essayCreditData] = await Promise.all([
    getProfile(),
    getCurrentStudyPlan(),
    getTopicsWithPerformance(),
    getDashboardEssayCreditData(),
  ]);
  const today = await getTodayStudy(plan, profile);
  const access = getAccessContext(profile);
  const priorities = prioritizeTopics(topics);

  const todayTopic = today.todayItem?.topics ?? null;
  const focusPriority = todayTopic
    ? priorities.find((item) => item.topic.id === todayTopic.id) ?? null
    : priorities[0] ?? null;
  const goal = today.dailyGoal;
  const goalMet = today.answeredToday >= goal;
  const practiceHref = todayTopic
    ? `/dashboard/praticar?topic=${todayTopic.id}`
    : focusPriority
      ? `/dashboard/praticar?topic=${focusPriority.topic.id}`
      : "/dashboard/praticar";

  const dateLabel = capitalize(
    formatAppDateTime(new Date(), {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );

  return (
    <div>
      <DashboardPageHeader
        title="Hoje"
        description={dateLabel}
        action={<StreakChip streak={today.streak} activeToday={today.answeredToday > 0} />}
      />

      <Reveal>
        <Card className={goalMet ? "border-emerald-200 bg-emerald-50/50" : undefined}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Meta de hoje
                </p>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">
                  {goalMet
                    ? "Meta de hoje concluída"
                    : todayTopic
                      ? `${goal} questões de ${todayTopic.subjects.name}: ${todayTopic.name}`
                      : focusPriority
                        ? `${goal} questões de ${focusPriority.topic.subjects.name}: ${focusPriority.topic.name}`
                        : `${goal} questões dos seus assuntos prioritários`}
                </h2>
                {goalMet ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Você respondeu {today.answeredToday} questões hoje. Quer seguir?
                    Continue praticando ou adiante a próxima atividade da semana.
                  </p>
                ) : focusPriority ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {focusPriority.reason}
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Responda seu primeiro bloco de questões para o painel conhecer
                    seus pontos fortes e fracos.
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:min-w-64">
                <Progress
                  value={Math.min(100, Math.round((today.answeredToday / goal) * 100))}
                  label={`${today.answeredToday} de ${goal} questões`}
                  tone={goalMet ? "green" : "blue"}
                />
                <Link
                  href={practiceHref}
                  className={buttonClasses({ variant: "primary" })}
                >
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  {goalMet
                    ? "Continuar praticando"
                    : today.answeredToday > 0
                      ? "Retomar estudo de hoje"
                      : "Começar estudo de hoje"}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <section id="plano-semana" className="mt-6">
        <Reveal delay={80}>
          <StudyPlanSection plan={plan} access={access} />
        </Reveal>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <Reveal delay={140}>
          <EssayNextStep essay={essayCreditData.latestEssay} />
        </Reveal>
        <Reveal delay={200}>
          <Card className="h-full">
            <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-slate-950">
                  <Timer className="h-4 w-4 text-blue-700" aria-hidden="true" />
                  Simulado
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Depois da meta do dia, um simulado rápido por área mostra como
                  você se sai no ritmo de prova — e alimenta seu desempenho.
                </p>
              </div>
              <div>
                <Link
                  href="/dashboard/simulados"
                  className={buttonClasses({ variant: "outline" })}
                >
                  Ver simulados
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}

function StreakChip({ streak, activeToday }: { streak: number; activeToday: boolean }) {
  if (!streak) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
        <Flame className="h-4 w-4 text-slate-400" aria-hidden="true" />
        Comece sua sequência hoje
      </span>
    );
  }

  return (
    <span
      className={`tnum inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
        activeToday ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"
      }`}
      title={
        activeToday
          ? "Sequência ativa — você já estudou hoje."
          : "Estude hoje para manter a sequência."
      }
    >
      <Flame
        className={`h-4 w-4 ${activeToday ? "text-amber-600" : "text-slate-400"}`}
        aria-hidden="true"
      />
      {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}
    </span>
  );
}

const essayStatusLabels: Record<EssaySubmission["status"], string> = {
  uploading: "Enviando",
  pending: "Aguardando correção",
  in_review: "Em análise",
  completed: "Correção disponível",
  cancelled: "Cancelada",
  upload_failed: "Falha no envio",
};

const essayStatusTones: Record<
  EssaySubmission["status"],
  "blue" | "green" | "red" | "slate" | "amber"
> = {
  uploading: "amber",
  pending: "blue",
  in_review: "blue",
  completed: "green",
  cancelled: "red",
  upload_failed: "red",
};

function EssayNextStep({ essay }: { essay: EssaySubmission | null }) {
  const action = !essay
    ? { href: "/dashboard/correcao-redacao", label: "Enviar redação" }
    : essay.status === "completed"
      ? { href: `/dashboard/correcao-redacao/${essay.id}`, label: "Ver correção" }
      : { href: `/dashboard/correcao-redacao/${essay.id}`, label: "Acompanhar redação" };

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-slate-950">
            <PenLine className="h-4 w-4 text-blue-700" aria-hidden="true" />
            Redação
          </p>
          {essay ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={essayStatusTones[essay.status]}>
                {essayStatusLabels[essay.status]}
              </Badge>
              <span className="text-sm leading-6 text-slate-600">
                {essay.theme || "Redação sem tema informado"}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Uma redação por semana mantém a escrita em dia. O tema sugerido da
              semana já está pronto para você.
            </p>
          )}
        </div>
        <div>
          <Link href={action.href} className={buttonClasses({ variant: "outline" })}>
            {essay?.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PenLine className="h-4 w-4" aria-hidden="true" />
            )}
            {action.label}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
