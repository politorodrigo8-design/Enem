import Link from "next/link";
import {
  ArrowRight,
  Coins,
  ListChecks,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";
import { AreaBars } from "@/components/charts/area-bars";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import type { QuestionRecord } from "@/lib/db/types";

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
  questions,
  areaMetrics,
}: {
  questions: QuestionRecord[];
  areaMetrics: React.ComponentProps<typeof AreaBars>["data"];
}) {
  const answers = questions.flatMap((question) =>
    (question.user_question_answers ?? []).map((answer) => ({ question, answer })),
  );
  const correct = answers.filter((item) => item.answer.is_correct).length;
  const accuracy = answers.length ? Math.round((correct / answers.length) * 100) : 0;
  const avgTime = answers.length
    ? Math.round(
        answers.reduce((sum, item) => sum + (item.answer.response_time_seconds ?? 0), 0) /
          answers.length,
      )
    : 0;
  const subjectRows = buildPerformanceRows(answers, "subject");
  const topicRows = buildPerformanceRows(answers, "topic");
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
            value={answers.length ? "Ativa" : "Sem dados"}
            helper="com base no seu treino"
            icon={TrendingUp}
          />
        </Reveal>
      </section>

      <Reveal delay={200}>
        <section className="mt-6 rounded-lg border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="flex items-center gap-2 text-sm font-bold text-blue-950">
                  <Sparkles className="h-4 w-4 text-blue-700" aria-hidden="true" />
                  Análise de desempenho
                </p>
                <Badge tone="blue">2 créditos</Badge>
                <Badge tone="slate">API em integração</Badge>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
                Leitura dos erros recentes, padrões por assunto e próximos focos de treino.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled>
              <Coins className="h-4 w-4" aria-hidden="true" />
              Gerar análise
            </Button>
          </div>
        </section>
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
            <Card>
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
            <Card>
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

function buildPerformanceRows(
  answers: Array<{
    question: { subjects: { name: string }; topics: { name: string } };
    answer: { is_correct: boolean };
  }>,
  by: "subject" | "topic",
) {
  const map = new Map<string, { answered: number; correct: number }>();
  answers.forEach(({ question, answer }) => {
    const key = by === "subject" ? question.subjects.name : question.topics.name;
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
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-4 font-semibold">{firstColumn}</th>
            <th className="px-4 py-2 text-right font-semibold">Respostas</th>
            <th className="py-2 pl-4 text-right font-semibold">Acerto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((item) => (
            <tr key={item.name}>
              <td className="py-2.5 pr-4">
                <span className="font-semibold text-slate-900">{item.name}</span>
              </td>
              <td className="tnum px-4 py-2.5 text-right text-slate-600">
                {item.answered}
              </td>
              <td className="py-2.5 pl-4 text-right">
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
              <span className="text-sm text-slate-700">{item.name}</span>
              <span className={`tnum text-sm font-semibold ${statusStyles[status]}`}>
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
