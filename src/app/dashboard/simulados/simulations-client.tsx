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
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AreaBars } from "@/components/charts/area-bars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      if (result.ok) setFinished(true);
    });
  }

  if (active && finished) {
    const correct = examQuestions.filter(
      (question) => answers[question.id] === question.correct_option,
    ).length;
    const percentage = examQuestions.length
      ? Math.round((correct / examQuestions.length) * 100)
      : 0;
    const areaMetrics = getAreaMetrics(examQuestions, answers);

    return (
      <div>
        <div className="mb-6 flex justify-end">
          <Button variant="outline" onClick={() => setActive(null)}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar aos simulados
          </Button>
        </div>
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardContent>
              <div className="rounded-lg bg-blue-700 p-6 text-white">
                <p className="text-sm font-semibold text-blue-100">Total de acertos</p>
                <p className="mt-2 text-5xl font-bold">
                  {correct}/{examQuestions.length}
                </p>
                <p className="mt-3 text-sm leading-6 text-blue-50">
                  {percentage}% de aproveitamento. Estimativa educacional simples,
                  sem TRI real.
                </p>
              </div>
              <div className="mt-5">
                <AreaBars data={areaMetrics} />
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Principais erros</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {examQuestions
                  .filter((question) => answers[question.id] !== question.correct_option)
                  .slice(0, 3)
                  .map((question) => (
                    <div key={question.id} className="rounded-lg bg-rose-50 p-4">
                      <p className="text-sm font-bold text-rose-800">
                        {question.topics.name}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-rose-700">
                        Revise a resolução e adicione ao plano semanal.
                      </p>
                    </div>
                  ))}
              </CardContent>
            </Card>
            <Notice tone="success" icon={CheckCircle2}>
              Próximo passo recomendado: refazer os tópicos com menor acerto e
              gerar um novo plano semanal.
            </Notice>
          </div>
        </div>
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
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{current.subjects.area}</Badge>
              <Badge tone="slate">{current.difficulty}</Badge>
              <Badge tone="violet">{current.topics.name}</Badge>
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
                    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                      selected === option.option_key
                        ? "border-blue-300 bg-blue-50"
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
              <h2 className="mt-5 text-xl font-bold text-slate-950">{simulation.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {simulation.description}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Info icon={BarChart3} label={`${simulation.simulation_questions.length} questões`} />
                <Info icon={Clock} label={`${simulation.duration_minutes} min`} />
                <Info icon={Flag} label={simulation.difficulty} />
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
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
      {minutes}:{rest}
    </div>
  );
}

function Info({ icon: Icon, label }: { icon: typeof Clock; label: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-700">{label}</p>
    </div>
  );
}

function getAreaMetrics(
  questions: QuestionRecord[],
  answers: Record<string, string>,
) {
  const metrics = new Map<string, { answered: number; correct: number }>();

  questions.forEach((question) => {
    const selected = answers[question.id];
    if (!selected) return;
    const current = metrics.get(question.subjects.area) ?? { answered: 0, correct: 0 };
    current.answered += 1;
    current.correct += selected === question.correct_option ? 1 : 0;
    metrics.set(question.subjects.area, current);
  });

  return Array.from(metrics.entries()).map(([area, metric]) => ({
    area,
    answered: metric.answered,
    accuracy: metric.answered ? Math.round((metric.correct / metric.answered) * 100) : 0,
  }));
}
