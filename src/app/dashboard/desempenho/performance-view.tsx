"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  ListChecks,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AreaBars } from "@/components/charts/area-bars";
import { PerformanceAnalysisCreditAction } from "@/components/dashboard/ai-credit-actions";
import { StatCard } from "@/components/dashboard/stat-card";
import { ThemeBadge } from "@/components/dashboard/subject-theme-badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import type { AccessContext } from "@/lib/access";
import type { AnsweredQuestionMetric } from "@/lib/db/types";
import { buildAreaMetrics } from "@/lib/db/metrics";
import {
  localProgressAsMetrics,
  useLocalQuestionProgress,
} from "@/lib/local-question-progress";
import { buildWeeklyTrend } from "@/lib/study/weekly-trend.mjs";

const statusStyles = {
  Dominado: "text-emerald-600",
  "Atenção": "text-amber-600",
  "Crítico": "text-rose-600",
} as const;

const statusBadgeStyles = {
  Dominado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Atenção": "bg-amber-50 text-amber-700 ring-amber-200",
  "Crítico": "bg-rose-50 text-rose-700 ring-rose-200",
} as const;

export function PerformanceView({
  answers: serverAnswers,
  access,
  creditBalance,
}: {
  answers: AnsweredQuestionMetric[];
  access: AccessContext;
  creditBalance: number;
}) {
  // As respostas do acervo local só existem no navegador; as do banco já chegam
  // prontas do servidor, sem passar pelo acervo inteiro.
  const localProgress = useLocalQuestionProgress();
  const answers = useMemo(
    () => [...serverAnswers, ...localProgressAsMetrics(localProgress)],
    [localProgress, serverAnswers],
  );

  const correct = answers.filter((answer) => answer.is_correct).length;
  const accuracy = answers.length ? Math.round((correct / answers.length) * 100) : 0;
  const avgTime = answers.length
    ? Math.round(
        answers.reduce((sum, answer) => sum + (answer.response_time_seconds ?? 0), 0) /
          answers.length,
      )
    : 0;
  const subjectRows = buildPerformanceRows(answers, "subject");
  const topicRows = buildPerformanceRows(answers, "topic");
  const areaMetrics = buildAreaMetrics(answers);
  const weeklyTrend = buildWeeklyTrend(answers);
  const dominated = topicRows.filter((item) => item.status === "Dominado");
  const attention = topicRows.filter((item) => item.status === "Atenção");
  const critical = topicRows.filter((item) => item.status === "Crítico");

  return (
    <div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Reveal delay={0}>
          <StatCard
            label="Questões respondidas"
            value={String(answers.length)}
            helper="respostas registradas"
            icon={ListChecks}
          />
        </Reveal>
        <Reveal delay={60}>
          <StatCard
            label="Taxa geral de acertos"
            value={`${accuracy}%`}
            helper={`${correct} acertos`}
            icon={Target}
          />
        </Reveal>
        <Reveal delay={120}>
          <StatCard
            label="Tempo médio por questão"
            value={`${avgTime}s`}
            helper="quando informado"
            icon={Timer}
          />
        </Reveal>
        <Reveal delay={180}>
          <StatCard
            label="Evolução semanal"
            value={weeklyTrend.value}
            helper={weeklyTrend.helper}
            icon={weeklyTrend.trend === "down" ? TrendingDown : TrendingUp}
          />
        </Reveal>
      </section>

      <Reveal delay={200}>
        <PerformanceAnalysisCreditAction
          disabled={!answers.length || !access.hasPlatformAccess}
          creditBalance={creditBalance}
        />
      </Reveal>

      {!answers.length ? (
        <div className="mt-6">
          <EmptyState
            icon={ListChecks}
            title="Ainda não há dados de desempenho"
            description="Responda questões ou finalize simulados para acompanhar suas métricas por área, disciplina e assunto."
            action={
              <Link
                href="/dashboard/praticar?tab=banco"
                className={buttonClasses({ variant: "primary" })}
              >
                Responder questões
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <Reveal delay={80}>
          <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            {/* min-w-0: sem isso o item de grid cresce até o min-content da tabela e o scroll interno nunca ativa. */}
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Taxa de acertos por disciplina</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <PerformanceTable rows={subjectRows} firstColumn="Disciplina" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taxa de acertos por área</CardTitle>
              </CardHeader>
              <CardContent>
                {areaMetrics.length ? (
                  <AreaBars data={areaMetrics} />
                ) : (
                  <p className="text-sm leading-6 text-slate-500">
                    Sem respostas por área ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
          </Reveal>

          <Reveal delay={140}>
          <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Desempenho por assunto</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <PerformanceTable rows={topicRows} firstColumn="Assunto" />
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Resumo por situação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                <StatusGroup title="Conteúdos dominados" items={dominated} status="Dominado" />
                <StatusGroup title="Conteúdos em atenção" items={attention} status="Atenção" />
                <StatusGroup title="Conteúdos críticos" items={critical} status="Crítico" />
              </CardContent>
            </Card>
          </section>
          </Reveal>
        </>
      )}
    </div>
  );
}

function buildPerformanceRows(answers: AnsweredQuestionMetric[], by: "subject" | "topic") {
  const map = new Map<string, { answered: number; correct: number }>();
  answers.forEach((answer) => {
    const key = by === "subject" ? answer.subject : answer.topic;
    // Resposta sem taxonomia (registro local antigo) conta no total, mas não tem
    // linha própria: inventar uma matéria para ela seria pior que omitir.
    if (!key) return;
    const current = map.get(key) ?? { answered: 0, correct: 0 };
    current.answered += 1;
    current.correct += answer.is_correct ? 1 : 0;
    map.set(key, current);
  });

  return Array.from(map.entries()).map(([name, metric]) => {
    const accuracy = metric.answered
      ? Math.round((metric.correct / metric.answered) * 100)
      : 0;
    return {
      name,
      answered: metric.answered,
      accuracy,
      status: accuracy >= 75 ? "Dominado" : accuracy >= 55 ? "Atenção" : "Crítico",
    } as const;
  });
}

type PerformanceRow = ReturnType<typeof buildPerformanceRows>[number];

function PerformanceTable({
  rows,
  firstColumn,
}: {
  rows: PerformanceRow[];
  firstColumn: string;
}) {
  const sorted = rows.slice().sort((a, b) => a.accuracy - b.accuracy);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-2 font-semibold sm:pr-4">{firstColumn}</th>
            <th className="px-2 py-2 text-right font-semibold sm:px-4">Respostas</th>
            <th className="py-2 pl-2 text-right font-semibold sm:pl-4">Acerto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((item) => (
            <tr key={item.name}>
              <td className="py-2.5 pr-2 align-top sm:pr-4">
                {firstColumn === "Disciplina" ? (
                  <ThemeBadge name={item.name} />
                ) : (
                  <span className="break-words font-semibold text-slate-900">
                    {item.name}
                  </span>
                )}
              </td>
              <td className="tnum px-2 py-2.5 text-right align-top text-slate-600 sm:px-4">
                {item.answered}
              </td>
              <td className="py-2.5 pl-2 text-right align-top sm:pl-4">
                <span className={`tnum font-semibold ${statusStyles[item.status]}`}>
                  {item.accuracy}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusGroup({
  title,
  items,
  status,
}: {
  title: string;
  items: Array<{ name: string; accuracy: number }>;
  status: keyof typeof statusBadgeStyles;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <span
          className={`tnum inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusBadgeStyles[status]}`}
        >
          {items.length}
        </span>
      </div>
      {items.length ? (
        <ul className="mt-2 divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-4 py-2">
              <span className="min-w-0 break-words text-sm text-slate-700">
                {item.name}
              </span>
              <span
                className={`tnum shrink-0 text-sm font-semibold ${statusStyles[status]}`}
              >
                {item.accuracy}%
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Nenhum assunto nesta categoria por enquanto.
        </p>
      )}
    </div>
  );
}
