"use client";

import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Flag,
  PlayCircle,
  RotateCcw,
  SlidersHorizontal,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Reveal } from "@/components/ui/reveal";
import {
  finishFallbackSimulationAction,
  finishSimulationAction,
  generateSimulationAction,
  saveSimulationAnswerAction,
  startSimulationAction,
} from "@/lib/actions/learning";
import type { AccessContext } from "@/lib/access";
import type { QuestionRecord, SimulationWithQuestions } from "@/lib/db/types";
import {
  calculateSimulationDurationMinutes,
  ENEM_OBJECTIVE_MINUTES_PER_DAY,
  ENEM_OBJECTIVE_QUESTIONS_PER_DAY,
} from "@/lib/simulations/rules";
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
  const [fallbackAttempt, setFallbackAttempt] = useState(false);
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
    if (isFallbackSimulation(simulation)) {
      toast.success("Simulado iniciado.");
      setActive(simulation);
      setUserSimulationId("");
      setQuestionIndex(0);
      setAnswers({});
      setSeconds(0);
      setFinished(false);
      setFinishData(null);
      setFallbackAttempt(true);
      return;
    }

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
        setFallbackAttempt(false);
      }
    });
  }

  function selectAnswer(question: QuestionRecord, option: string) {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: option }));
    if (!userSimulationId || fallbackAttempt) return;

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
      const result =
        fallbackAttempt && active
          ? await finishFallbackSimulationAction({
              simulationId: active.id,
              answers,
            })
          : await finishSimulationAction(userSimulationId, answers);
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
      <div className="animate-rise">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">
            Resultado: {active.title}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActive(null);
              setFallbackAttempt(false);
            }}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar aos simulados
          </Button>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <Reveal delay={0}>
            <StatCard
              label="Acertos"
              value={`${correct}/${totalCount}`}
              helper="questões respondidas"
              icon={CheckCircle2}
            />
          </Reveal>
          <Reveal delay={60}>
            <StatCard
              label="Aproveitamento"
              value={`${percentage}%`}
              helper="retrato do treino, não previsão de nota"
              icon={TrendingUp}
            />
          </Reveal>
          <Reveal delay={120}>
            <StatCard
              label="Para revisar"
              value={String(wrongQuestions.length)}
              helper="erros registrados nesta tentativa"
              icon={RotateCcw}
            />
          </Reveal>
        </section>

        <Reveal delay={80}>
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
        </Reveal>

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
          <Button
            variant="outline"
            onClick={() => {
              setActive(null);
              setFallbackAttempt(false);
            }}
          >
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
            <div key={current.id} className="animate-rise">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{current.subjects.area}</Badge>
              <Badge tone="slate">{current.difficulty}</Badge>
              <Badge tone="blue">{current.topics.name}</Badge>
            </div>
            <p className="mt-6 text-lg leading-8 text-slate-900">
              {current.statement}
            </p>
            <QuestionMedia question={current} />
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
      <div className="space-y-6">
        <SimulationBuilder locked={!access.hasPlatformAccess} pending={pending} />
        <EmptyState
          icon={Target}
          title="Nenhum simulado disponível"
          description="Monte um simulado personalizado acima ou continue treinando no banco de questões."
          action={
            <Link
              href="/dashboard/praticar?tab=banco"
              className={buttonClasses({ variant: "primary" })}
            >
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Treinar no banco de questões
            </Link>
          }
        />
      </div>
    );
  }

  const recommendedSimulations = simulations.filter(
    (simulation) =>
      simulation.simulation_questions.length >= 10 || Boolean(simulation.is_generated),
  );
  const quickDrills = simulations.filter(
    (simulation) =>
      simulation.simulation_questions.length < 10 && !Boolean(simulation.is_generated),
  );
  const localCatalog =
    simulations.length > 0 && simulations.every((simulation) => isFallbackSimulation(simulation));

  return (
    <div className="space-y-6">
      {localCatalog ? (
        <Notice tone="info">
          Simulados oficiais prontos carregados do acervo local revisado. O gerador
          personalizado usa o banco remoto quando ele tiver questões importadas.
        </Notice>
      ) : (
        <SimulationBuilder locked={!access.hasPlatformAccess} pending={pending} />
      )}
      {recommendedSimulations.length ? (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {recommendedSimulations.map((simulation, index) => {
        const lastAttempt = simulation.user_simulations?.[0];
        const locked = !access.hasPlatformAccess;
        return (
          <Reveal key={simulation.id} delay={(index % 3) * 60} className="h-full">
          <Card className={`h-full ${simulation.status === "Em breve" ? "opacity-70" : ""}`}>
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
          </Reveal>
        );
      })}
      </div>
      ) : null}
      {quickDrills.length ? (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Treinos rápidos
            </h2>
            <Badge tone="slate">validação curta</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickDrills.map((simulation, index) => {
              const lastAttempt = simulation.user_simulations?.[0];
              const locked = !access.hasPlatformAccess;
              return (
                <Reveal key={simulation.id} delay={(index % 3) * 40} className="h-full">
                  <Card className="h-full border-dashed">
                    <CardContent>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Target className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <Badge tone="slate">
                          {simulation.simulation_questions.length} questões
                        </Badge>
                      </div>
                      <h3 className="mt-4 text-base font-bold tracking-tight text-slate-950">
                        {simulation.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 text-slate-600">
                        Use como aquecimento, revisão rápida ou teste de fluxo antes de
                        montar uma sessão maior.
                      </p>
                      <Button
                        full
                        variant="outline"
                        className="mt-5"
                        disabled={simulation.status === "Em breve" || pending || locked}
                        onClick={() => start(simulation)}
                      >
                        {lastAttempt ? (
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <PlayCircle className="h-4 w-4" aria-hidden="true" />
                        )}
                        {lastAttempt ? "Refazer treino" : "Iniciar treino"}
                      </Button>
                    </CardContent>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function isFallbackSimulation(simulation: Pick<SimulationWithQuestions, "id">) {
  return simulation.id.startsWith("fallback-simulation-");
}

const BUILDER_AREAS = [
  { value: "Matematica", label: "Matemática" },
  { value: "Ciencias da Natureza", label: "Ciências da Natureza" },
  { value: "Ciencias Humanas", label: "Ciências Humanas" },
  { value: "Linguagens", label: "Linguagens" },
] as const;

const SIMULATION_PRESETS = [
  {
    label: "Completo misto",
    title: "Simulado completo misto ENEM",
    areas: ["Linguagens", "Ciencias Humanas", "Matematica", "Ciencias da Natureza"],
    questionCount: 90,
  },
  {
    label: "Linguagens + Humanas",
    title: "Simulado Linguagens e Humanas",
    areas: ["Linguagens", "Ciencias Humanas"],
    questionCount: 90,
  },
  {
    label: "Matemática + Natureza",
    title: "Simulado Matemática e Natureza",
    areas: ["Matematica", "Ciencias da Natureza"],
    questionCount: 90,
  },
  {
    label: "Meio simulado",
    title: "Meio simulado ENEM",
    areas: ["Linguagens", "Ciencias Humanas", "Matematica", "Ciencias da Natureza"],
    questionCount: 45,
  },
] as const;

const SIMULATION_QUESTION_OPTIONS = [15, 30, 45, 60, 90] as const;

function SimulationBuilder({ locked, pending }: { locked: boolean; pending: boolean }) {
  const router = useRouter();
  const [areas, setAreas] = useState<string[]>([
    "Linguagens",
    "Ciencias Humanas",
    "Matematica",
    "Ciencias da Natureza",
  ]);
  const [questionCount, setQuestionCount] = useState(30);
  const [difficulty, setDifficulty] = useState<"" | "Baixa" | "Média" | "Alta">("");
  const [prioritizeWeaknesses, setPrioritizeWeaknesses] = useState(true);
  const [foreignLanguage, setForeignLanguage] = useState<"en" | "es">("en");
  const [building, startBuilding] = useTransition();

  function toggleArea(value: string) {
    setAreas((current) =>
      current.includes(value)
        ? current.filter((area) => area !== value)
        : [...current, value],
    );
  }

  function build() {
    startBuilding(async () => {
      const result = await generateSimulationAction({
        areas,
        questionCount,
        difficulty: difficulty || null,
        prioritizeWeaknesses,
        foreignLanguage,
      });
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) router.refresh();
    });
  }

  function buildPreset(preset: (typeof SIMULATION_PRESETS)[number]) {
    startBuilding(async () => {
      const result = await generateSimulationAction({
        title: preset.title,
        areas: [...preset.areas],
        questionCount: preset.questionCount,
        difficulty: null,
        prioritizeWeaknesses: true,
        foreignLanguage,
      });
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) router.refresh();
    });
  }

  const includesLinguagens = areas.includes("Linguagens");
  const selectClasses =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-700";

  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-950">
              <SlidersHorizontal className="h-4 w-4 text-blue-700" aria-hidden="true" />
              Montar simulado personalizado
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Escolha as áreas e a quantidade; as questões vêm do banco oficial, com
              tempo calculado pela base do ENEM: {ENEM_OBJECTIVE_QUESTIONS_PER_DAY} questões
              em {ENEM_OBJECTIVE_MINUTES_PER_DAY} minutos.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {SIMULATION_PRESETS.map((preset) => (
            <Button
              key={preset.title}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => buildPreset(preset)}
              disabled={locked || building || pending}
            >
              <Target className="h-4 w-4" aria-hidden="true" />
              {preset.label} - {preset.questionCount} questões (~
              {calculateSimulationDurationMinutes(preset.questionCount)} min)
            </Button>
          ))}
        </div>
        <details className="mt-4 border-t border-slate-100 pt-4">
          <summary className="cursor-pointer list-none text-sm font-bold text-blue-700">
            Personalizar simulado
          </summary>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {BUILDER_AREAS.map((area) => {
            const selected = areas.includes(area.value);
            return (
              <button
                key={area.value}
                type="button"
                onClick={() => toggleArea(area.value)}
                aria-pressed={selected}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-blue-700 ${
                  selected
                    ? "bg-blue-700 text-white hover:bg-blue-800"
                    : "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {area.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-slate-100 pt-4">
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Questões
            <select
              className={selectClasses}
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
            >
              {SIMULATION_QUESTION_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count} questões (~{calculateSimulationDurationMinutes(count)} min)
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Dificuldade
            <select
              className={selectClasses}
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as "" | "Baixa" | "Média" | "Alta")
              }
            >
              <option value="">Misturada</option>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
            </select>
          </label>
          {includesLinguagens ? (
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Língua estrangeira
              <select
                className={selectClasses}
                value={foreignLanguage}
                onChange={(event) => setForeignLanguage(event.target.value as "en" | "es")}
              >
                <option value="en">Inglês</option>
                <option value="es">Espanhol</option>
              </select>
            </label>
          ) : null}
          <label className="flex items-center gap-2 pb-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={prioritizeWeaknesses}
              onChange={(event) => setPrioritizeWeaknesses(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700"
            />
            Priorizar meus pontos fracos
          </label>
          <Button
            onClick={build}
            disabled={locked || building || pending || !areas.length}
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            {building ? "Montando..." : "Montar simulado"}
          </Button>
        </div>
        </details>
      </CardContent>
    </Card>
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

function QuestionMedia({ question }: { question: QuestionRecord }) {
  const associatedMedia = question.question_media ?? [];
  const legacyMedia = getLegacyQuestionMedia(question);

  if (associatedMedia.length) {
    return (
      <div className="mt-6 space-y-4">
        {associatedMedia
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((media) => (
            <figure
              key={media.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
            >
              <Image
                src={media.url}
                alt={media.alt_text || "Mídia da questão"}
                width={media.width ?? 1000}
                height={media.height ?? 600}
                unoptimized
                className="max-h-[520px] w-full object-contain"
              />
              {media.caption || media.source_pdf || media.source_page ? (
                <figcaption className="border-t border-slate-200 px-4 py-3 text-xs leading-5 text-slate-600">
                  {media.caption || media.media_type}
                  {media.source_pdf || media.source_page ? (
                    <span>
                      {" "}
                      Fonte: {media.source_pdf || "PDF original"}
                      {media.source_page ? `, página ${media.source_page}` : ""}.
                    </span>
                  ) : null}
                </figcaption>
              ) : null}
            </figure>
          ))}
      </div>
    );
  }

  if (!legacyMedia) return null;

  return (
    <figure className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <Image
        src={legacyMedia.url}
        alt={legacyMedia.alt}
        width={legacyMedia.width}
        height={legacyMedia.height}
        className="h-auto w-full object-contain"
        unoptimized
      />
    </figure>
  );
}

function getLegacyQuestionMedia(question: QuestionRecord) {
  if (!question.media_url) return null;
  const metadata = question.media_metadata;
  const width =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? Number(metadata.width) || 900
      : 900;
  const height =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? Number(metadata.height) || 500
      : 500;

  return {
    url: question.media_url,
    alt: question.media_alt || "Mídia da questão",
    width,
    height,
  };
}
