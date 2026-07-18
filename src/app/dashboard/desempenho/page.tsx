import { Clock3, ListChecks, Target, Timer, TrendingUp } from "lucide-react";
import { AreaBars } from "@/components/charts/area-bars";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { getAreaMetrics, getQuestionRecords } from "@/lib/db/queries";

const statusTone = {
  Dominado: "green",
  Atencao: "amber",
  Critico: "red",
} as const;

export default async function PerformancePage() {
  const [questions, areaMetrics] = await Promise.all([
    getQuestionRecords(),
    getAreaMetrics(),
  ]);
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
  const attention = topicRows.filter((item) => item.status === "Atencao");
  const critical = topicRows.filter((item) => item.status === "Critico");

  return (
    <div>
      <DashboardPageHeader
        title="Meu desempenho"
        description="Calculos reais de acertos por area, disciplina e assunto a partir do banco."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ListChecks} label="Questoes respondidas" value={String(answers.length)} helper="respostas salvas" />
        <MetricCard icon={Target} label="Taxa geral de acertos" value={`${accuracy}%`} helper={`${correct} acertos`} />
        <MetricCard icon={Timer} label="Tempo medio por questao" value={`${avgTime}s`} helper="quando informado" />
        <MetricCard icon={TrendingUp} label="Evolucao semanal" value={answers.length ? "Ativa" : "Sem dados"} helper="sem TRI real" />
      </section>

      {!answers.length ? (
        <div className="mt-6">
          <EmptyState
            icon={ListChecks}
            title="Ainda nao ha desempenho"
            description="Responda questoes ou finalize simulados para calcular metricas reais."
          />
        </div>
      ) : null}

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Taxa de acertos por disciplina</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectRows.map((item) => (
              <div key={item.name} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.answered} respostas</p>
                  </div>
                  <Badge tone={statusTone[item.status]}>{item.status}</Badge>
                </div>
                <Progress
                  value={item.accuracy}
                  tone={item.status === "Critico" ? "red" : item.status === "Dominado" ? "green" : "blue"}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taxa de acertos por area</CardTitle>
          </CardHeader>
          <CardContent>
            {areaMetrics.length ? (
              <AreaBars data={areaMetrics} />
            ) : (
              <p className="text-sm text-slate-500">Sem respostas por area ainda.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por assunto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topicRows.map((item) => (
              <div key={item.name} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.answered} respostas</p>
                  </div>
                  <Badge tone={statusTone[item.status]}>{item.status}</Badge>
                </div>
                <Progress value={item.accuracy} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <SubjectGroup title="Conteudos dominados" items={dominated} tone="green" />
          <SubjectGroup title="Conteudos em atencao" items={attention} tone="amber" />
          <SubjectGroup title="Conteudos criticos" items={critical} tone="red" />
        </div>
      </section>
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
      status: accuracy >= 75 ? "Dominado" : accuracy >= 55 ? "Atencao" : "Critico",
    } as const;
  });
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SubjectGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: Array<{ name: string; accuracy: number }>;
  tone: "green" | "amber" | "red";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-slate-700">{item.name}</span>
              <Badge tone={tone}>{item.accuracy}%</Badge>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">Sem itens nesta categoria.</p>
        )}
      </CardContent>
    </Card>
  );
}
