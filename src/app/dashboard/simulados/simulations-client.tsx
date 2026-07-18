"use client";

import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Flag,
  PlayCircle,
  RotateCcw,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AreaBars } from "@/components/charts/area-bars";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Progress } from "@/components/ui/progress";
import {
  finishSimulationAction,
  saveSimulationAnswerAction,
  startSimulationAction,
} from "@/lib/actions/learning";
import type { AccessContext } from "@/lib/access";
import type { QuestionRecord, SimulationWithQuestions } from "@/lib/db/types";
import { statusTone } from "@/lib/utils";

export function SimulationsClient({
  simulations,
  access,
}: {
  simulations: SimulationWithQuestions[];
  access: AccessContext;
}) {
  const [active, setActive] = useState<SimulationWithQuestions | null>(null);
  const [userSimulationId, setUserSimulationId] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seconds, setSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  // O gabarito não vem mais no payload; a correção por questão vem da action.
  const [finishData, setFinishData] = useState<{
    correct: number;
    total: number;
    percentage: number;
    correctness: Record<string, boolean>;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const examQuestions = useMemo(
    () =>
      active?.simulation_questions
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((item) => item.questions) ?? [],
    [active],
  );
  const current = examQuestions[questionIndex];

  function start(simulation: SimulationWithQuestions) {
    startTransition(async () => {
      const result = await startSimulationAction(simulation.id);
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok && result.userSimulationId) {
        setActive(simulation);
        setUserSimulationId(result.userSimulationId);
        setQuestionIndex(0);
        setAnswers({});
        setSeconds(0);
        setFinished(false);
        setFinishData(null);
      }
    });
  }

  function selectAnswer(question: QuestionRecord, option: string) {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: option }));
    if (!userSimulationId) return;

    startTransition(async () => {
      const result = await saveSimulationAnswerAction({
        userSimulationId,
        questionId: question.id,
        selectedOption: option,
        responseTimeSeconds: seconds,
      });
      if (!result.ok) toast.error(result.message);
    });
  }

  function finish() {
    startTransition(async () => {
      const result = await finishSimulationAction(userSimulationId);
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        const correctness: Record<string, boolean> = {};
        (result.results ?? []).forEach((item) => {
          correctness[item.questionId] = item.isCorrect;
        });
        setFinishData({
          correct: result.correct ?? 0,
          total: result.total ?? examQuestions.length,
          percentage: result.percentage ?? 0,
          correctness,
        });
        setFinished(true);
      }
    });
  }

  if (active && finished) {
    const correctness = finishData?.correctness ?? {};
    const correct = finishData?.correct ?? 0;
    const totalCount = finishData?.total ?? examQuestions.length;
    const percentage = finishData?.percentage ?? 0;
    const areaMetrics = getAreaMetrics(examQuestions, correctness);
    const wrongQuestions = examQuestions.filter(
      (question) => Boolean(answers[question.id]) && !correctness[question.id],
    );

    return (
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">
            Resultado: {active.title}
          </h2>
          <Button variant="outline" size="sm" onClick={() => setActive(null)}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar aos simulados
          </Button>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Acertos"
            value={`${correct}/${totalCount}`}
            helper="questões respondidas"
            icon={CheckCircle2}
          />
          <StatCard
            label="Aproveitamento"
            value={`${percentage}%`}
            helper="retrato do treino, não previsão de nota"
            icon={TrendingUp}
          />
          <StatCard
            label="Para revisar"
            value={String(wrongQuestions.length)}
            helper="erros registrados nesta tentativa"
            icon={RotateCcw}
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Acertos por área</CardTitle>
            </CardHeader>
            <CardContent>
              {areaMetrics.length ? (
                <AreaBars data={areaMetrics} />
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  Responda ao menos uma questão para ver o aproveitamento por área.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Principais erros</CardTitle>
            </CardHeader>
            <CardContent>
              {wrongQuestions.length ? (
                <ul className="divide-y divide-slate-100">
                  {wrongQuestions.slice(0, 5).map((question) => (
                    <li key={question.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                      <XCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {question.topics.name}
                        </p>
                        <p className="text-xs leading-5 text-slate-500">
                          {question.subjects.area} • revise a resolução e adicione ao
                          plano semanal
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  Nenhum erro registrado nesta tentativa. Bom trabalho.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <Notice tone="success" icon={CheckCircle2} className="mt-6">
          Próximo passo recomendado: refazer os tópicos com menor acerto e
          gerar um novo plano semanal.
        </Notice>
      </div>
    );
  }

  if (active && current) {
    const selected = answers[current.id];
    const progress = ((questionIndex + 1) / examQuestions.length) * 100;

    return (
      <div>
        <div className="mb-6 flex items-center justify-between gap-4">
          <Button variant="outline" onClick={() => setActive(null)}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Sair
          </Button>
          <Timer seconds={seconds} setSeconds={setSeconds} />
        </div>
        <Card>
          <CardContent>
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-600">
                <span>
                  Questão {questionIndex + 1} de {examQuestions.length}
                </span>
                <span className="tnum">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{current.subjects.area}</Badge>
              <Badge tone="slate">{current.difficulty}</Badge>
              <Badge tone="blue">{current.topics.name}</Badge>
            </div>
            <p className="mt-6 text-lg leading-8 text-slate-900">
              {current.statement}
            </p>
            <div className="mt-6 grid gap-3">
              {current.question_options
                .slice()
                .sort((a, b) => a.option_key.localeCompare(b.option_key))
                .map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectAnswer(current, option.option_key)}
                    className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                      selected === option.option_key
                        ? "border-blue-300 bg-blue-50 text-blue-900"
                        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-700">
                      {option.option_key}
                    </span>
                    <span className="text-sm leading-6 text-slate-800">
                      {option.option_text}
                    </span>
                  </button>
                ))}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button
                variant="outline"
                disabled={questionIndex === 0}
                onClick={() => setQuestionIndex((currentIndex) => currentIndex - 1)}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </Button>
              {questionIndex === examQuestions.length - 1 ? (
                <Button onClick={finish} disabled={!selected || pending}>
                  <Flag className="h-4 w-4" aria-hidden="true" />
                  Finalizar simulado
                </Button>
              ) : (
                <Button
                  onClick={() => setQuestionIndex((currentIndex) => currentIndex + 1)}
                  disabled={!selected}
                >
                  Próxima questão
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!simulations.length) {
    return (
      <EmptyState
        icon={Target}
        title="Nenhum simulado disponível"
        description="Novos simulados aparecem aqui assim que forem publicados. Enquanto isso, continue treinando no banco de questões."
        action={
          <Link
            href="/dashboard/questoes"
            className={buttonClasses({ variant: "primary" })}
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            Treinar no banco de questões
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {simulations.map((simulation) => {
        const lastAttempt = simulation.user_simulations?.[0];
        const locked = !access.hasPlatformAccess;
        return (
          <Card key={simulation.id} className={simulation.status === "Em breve" ? "opacity-70" : ""}>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Target className="h-5 w-5" aria-hidden="true" />
                </div>
                <span
                  className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${statusTone(simulation.status)}`}
                >
                  {simulation.status}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-950">
                {simulation.title}
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                {simulation.description}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-4 text-xs font-medium text-slate-600">
                <span className="tnum inline-flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {simulation.simulation_questions.length} questões
                </span>
                <span className="tnum inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {simulation.duration_minutes} min
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {simulation.difficulty}
                </span>
              </div>
              {lastAttempt?.status === "Finalizado" ? (
                <Progress
                  className="mt-5"
                  value={Math.round(lastAttempt.score_percentage)}
                  label="Última tentativa"
                  tone="green"
                />
              ) : null}
              <Button
                full
                className="mt-5"
                disabled={simulation.status === "Em breve" || pending || locked}
                onClick={() => start(simulation)}
              >
                {lastAttempt ? (
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                )}
                {lastAttempt ? "Refazer simulado" : "Iniciar simulado"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Timer({
  seconds,
  setSeconds,
}: {
  seconds: number;
  setSeconds: (value: number | ((value: number) => number)) => void;
}) {
  useEffect(() => {
    const interval = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [setSeconds]);

  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");

  return (
    <div className="tnum rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
      {minutes}:{rest}
    </div>
  );
}

function getAreaMetrics(
  questions: QuestionRecord[],
  correctness: Record<string, boolean>,
) {
  const metrics = new Map<string, { answered: number; correct: number }>();

  questions.forEach((question) => {
    if (!(question.id in correctness)) return;
    const current = metrics.get(question.subjects.area) ?? { answered: 0, correct: 0 };
    current.answered += 1;
    current.correct += correctness[question.id] ? 1 : 0;
    metrics.set(question.subjects.area, current);
  });

  return Array.from(metrics.entries()).map(([area, metric]) => ({
    area,
    answered: metric.answered,
    accuracy: metric.answered ? Math.round((metric.correct / metric.answered) * 100) : 0,
  }));
}
