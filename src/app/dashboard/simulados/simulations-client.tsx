"use client";

import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  Flag,
  Gauge,
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
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { AreaBars } from "@/components/charts/area-bars";
import { StatCard } from "@/components/dashboard/stat-card";
import { ThemeBadge } from "@/components/dashboard/subject-theme-badge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Progress } from "@/components/ui/progress";
import { Reveal } from "@/components/ui/reveal";
import {
  finishFallbackSimulationAction,
  finishSimulationAction,
  generateSimulationAction,
  regenerateSimulationAction,
  saveSimulationAnswerAction,
  startSimulationAction,
} from "@/lib/actions/learning";
import type { AccessContext } from "@/lib/access";
import type { QuestionRecord, SimulationWithQuestions } from "@/lib/db/types";
import { calculateSimulationDurationMinutes } from "@/lib/simulations/rules";
import {
  ENEM_SCORE_ESTIMATE_NOTE,
  estimateEnemScore,
} from "@/lib/simulations/tri";
import { formatAppDateTime } from "@/lib/dates";
import {
  answersFromAttemptRows,
  elapsedSecondsSince,
  firstUnansweredIndex,
  latestActiveAttempt,
} from "@/lib/practice-session/rules.mjs";
import {
  isLocalQuestionId,
  localAnswerTaxonomy,
  recordLocalQuestionAnswer,
  useLocalQuestionProgress,
} from "@/lib/local-question-progress";

const EXAM_DAY_PRESETS = [
  {
    key: "dia1",
    title: "Simuladão ENEM — Dia 1",
    description:
      "Linguagens e Ciências Humanas, no formato do primeiro dia de prova.",
    areas: ["Linguagens", "Ciencias Humanas"],
    questionCount: 90,
    hasLanguage: true,
  },
  {
    key: "dia2",
    title: "Simuladão ENEM — Dia 2",
    description:
      "Matemática e Ciências da Natureza, no formato do segundo dia de prova.",
    areas: ["Matematica", "Ciencias da Natureza"],
    questionCount: 90,
    hasLanguage: false,
  },
] as const;

const QUICK_PRESETS = [
  { title: "Simulado rápido — Linguagens", areas: ["Linguagens"], hasLanguage: true },
  { title: "Simulado rápido — Ciências Humanas", areas: ["Ciencias Humanas"], hasLanguage: false },
  { title: "Simulado rápido — Ciências da Natureza", areas: ["Ciencias da Natureza"], hasLanguage: false },
  { title: "Simulado rápido — Matemática", areas: ["Matematica"], hasLanguage: false },
] as const;

const QUICK_QUESTION_COUNT = 30;

export function SimulationsClient({
  simulations,
  access,
  autoStartId,
}: {
  simulations: SimulationWithQuestions[];
  access: AccessContext;
  autoStartId?: string;
}) {
  const router = useRouter();
  const localQuestionProgress = useLocalQuestionProgress();
  const locallyAnsweredQuestionIds = useMemo(
    () => Object.keys(localQuestionProgress),
    [localQuestionProgress],
  );
  const [active, setActive] = useState<SimulationWithQuestions | null>(null);
  const [userSimulationId, setUserSimulationId] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seconds, setSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [fallbackAttempt, setFallbackAttempt] = useState(false);
  // O gabarito não vem no payload; a correção por questão vem da action.
  const [finishData, setFinishData] = useState<{
    correct: number;
    total: number;
    percentage: number;
    correctness: Record<string, boolean>;
  } | null>(null);
  const [foreignLanguage, setForeignLanguage] = useState<"en" | "es">("en");
  const [pending, startTransition] = useTransition();
  const autoStarted = useRef(false);
  const finishingSimulationRef = useRef(false);
  // Cronômetro do simulado é acumulado; para gravar o tempo DE CADA questão
  // guardamos o instante da última resposta e enviamos só a diferença.
  const lastAnswerSeconds = useRef(0);

  const examQuestions = useMemo(
    () =>
      active?.simulation_questions
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((item) => item.questions) ?? [],
    [active],
  );
  const current = examQuestions[questionIndex];
  const locked = !access.hasPlatformAccess;

  function start(simulation: SimulationWithQuestions) {
    const storedAttempt = latestInProgressAttempt(simulation);
    if (storedAttempt) {
      const storedAnswers = answersFromSimulationAttempt(storedAttempt);
      const restoredSeconds = elapsedSeconds(storedAttempt.started_at);
      toast.success("Você voltou de onde parou. Suas respostas foram restauradas.");
      setActive(simulation);
      setUserSimulationId(storedAttempt.id);
      setQuestionIndex(firstUnansweredSimulationIndex(simulation, storedAnswers));
      setAnswers(storedAnswers);
      setSeconds(restoredSeconds);
      lastAnswerSeconds.current = restoredSeconds;
      setFinished(false);
      setFinishData(null);
      setFallbackAttempt(false);
      return;
    }

    if (isFallbackSimulation(simulation)) {
      toast.success("Simulado iniciado.");
      setActive(simulation);
      setUserSimulationId("");
      setQuestionIndex(0);
      setAnswers({});
      setSeconds(0);
      lastAnswerSeconds.current = 0;
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
        lastAnswerSeconds.current = 0;
        setFinished(false);
        setFinishData(null);
        setFallbackAttempt(false);
      }
    });
  }

  // Simulado recém-gerado chega via ?iniciar=<id>: começa sozinho, uma vez,
  // e apenas se ainda não houver tentativa (evita reinício ao recarregar).
  useEffect(() => {
    if (!autoStartId || autoStarted.current || active) return;
    const simulation = simulations.find((item) => item.id === autoStartId);
    if (!simulation || simulation.user_simulations?.length) return;
    autoStarted.current = true;
    const timeout = window.setTimeout(() => start(simulation), 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartId, simulations]);

  useEffect(() => {
    if (!active || finished) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = fallbackAttempt
        ? "Esta tentativa não pode ser retomada se você sair agora."
        : "Suas respostas ficam salvas e você pode retomar o simulado depois.";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [active, fallbackAttempt, finished]);

  useEffect(() => {
    function revalidateFromServer() {
      if (!active) router.refresh();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") revalidateFromServer();
    }

    window.addEventListener("focus", revalidateFromServer);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", revalidateFromServer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [active, router]);

  function generateAndStart(input: {
    title: string;
    areas: string[];
    questionCount: number;
    language?: "en" | "es";
  }) {
    startTransition(async () => {
      const result = await generateSimulationAction({
        title: input.title,
        areas: input.areas,
        questionCount: input.questionCount,
        difficulty: null,
        prioritizeWeaknesses: true,
        foreignLanguage: input.language ?? foreignLanguage,
        excludeQuestionIds: locallyAnsweredQuestionIds,
      });
      if (!result.ok || !result.simulationId) {
        toast.error(result.message);
        return;
      }
      toast.success("Simulado montado com questões novas.");
      if (result.simulation) {
        start(result.simulation);
        router.replace("/dashboard/simulados", { scroll: false });
        return;
      }
      router.push(`/dashboard/simulados?iniciar=${result.simulationId}`);
    });
  }

  function regenerateAndStart(simulationId: string) {
    startTransition(async () => {
      const result = await regenerateSimulationAction(simulationId);
      if (!result.ok || !result.simulationId) {
        toast.error(result.message);
        return;
      }
      toast.success("Novo sorteio pronto — mesmas regras, questões novas.");
      if (result.simulation) {
        start(result.simulation);
        router.replace("/dashboard/simulados", { scroll: false });
        return;
      }
      router.push(`/dashboard/simulados?iniciar=${result.simulationId}`);
    });
  }

  function selectAnswer(question: QuestionRecord, option: string) {
    const questionSeconds = Math.max(0, seconds - lastAnswerSeconds.current);
    lastAnswerSeconds.current = seconds;
    const previousOption = answers[question.id];
    setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: option }));
    if (!userSimulationId || fallbackAttempt) return;

    startTransition(async () => {
      const result = await saveSimulationAnswerAction({
        userSimulationId,
        questionId: question.id,
        selectedOption: option,
        responseTimeSeconds: questionSeconds,
      });
      if (!result.ok) {
        setAnswers((currentAnswers) => {
          const next = { ...currentAnswers };
          if (previousOption) next[question.id] = previousOption;
          else delete next[question.id];
          return next;
        });
        toast.error(result.message);
        return;
      }
      router.refresh();
    });
  }

  function leaveAttempt() {
    setActive(null);
    setFallbackAttempt(false);
    router.replace("/dashboard/simulados", { scroll: false });
    router.refresh();
  }

  function exitWithoutFinishing() {
    const confirmed = window.confirm(
      fallbackAttempt
        ? "Esta tentativa não pode ser retomada: ao sair, suas respostas são perdidas e nenhuma nota é gerada. Sair mesmo assim?"
        : "Suas respostas ficam salvas e você pode voltar de onde parou em “Simulados em aberto”. A nota só sai quando você finalizar. Sair agora?",
    );
    if (!confirmed) return;
    leaveAttempt();
  }

  function finish() {
    if (finishingSimulationRef.current || finished) return;
    const blankCount = examQuestions.filter((question) => !answers[question.id]).length;
    if (blankCount > 0) {
      const blankLabel =
        blankCount === 1 ? "1 questão sem resposta" : `${blankCount} questões sem resposta`;
      const confirmed = window.confirm(
        `Você vai finalizar com ${blankLabel}. Como no ENEM, questão em branco conta como erro na nota. Finalizar agora?`,
      );
      if (!confirmed) return;
    }

    finishingSimulationRef.current = true;
    startTransition(async () => {
      try {
      const result =
        fallbackAttempt && active
          ? await finishFallbackSimulationAction({
              simulationId: active.id,
              answers,
              questionIds: examQuestions.map((question) => question.id),
            })
          : await finishSimulationAction(userSimulationId, answers);
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        // Só questões respondidas entram aqui: o acerto por área não pode ser
        // diluído pelas que ficaram em branco (essas já pesam na nota estimada).
        const correctness: Record<string, boolean> = {};
        (result.results ?? []).forEach((item) => {
          if (!answers[item.questionId]) return;
          correctness[item.questionId] = item.isCorrect;
        });
        if (fallbackAttempt) {
          const answeredCount = Object.keys(answers).length || 1;
          const averageSeconds = Math.round(seconds / answeredCount);
          (result.results ?? []).forEach((item) => {
            const selectedOption = answers[item.questionId];
            if (!selectedOption || !isLocalQuestionId(item.questionId)) return;
            const question = examQuestions.find(
              (candidate) => candidate.id === item.questionId,
            );
            recordLocalQuestionAnswer({
              questionId: item.questionId,
              selectedOption,
              isCorrect: item.isCorrect,
              responseTimeSeconds: averageSeconds,
              answeredAt: new Date().toISOString(),
              ...(question ? localAnswerTaxonomy(question) : {}),
            });
          });
        }
        setFinishData({
          correct: result.correct ?? 0,
          total: result.total ?? examQuestions.length,
          percentage: result.percentage ?? 0,
          correctness,
        });
        setFinished(true);
        router.refresh();
      }
      } finally {
        finishingSimulationRef.current = false;
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
    const answeredCount = examQuestions.filter((question) => answers[question.id]).length;
    const blankCount = Math.max(0, totalCount - answeredCount);
    const answeredPercentage = answeredCount
      ? Math.round((correct / answeredCount) * 100)
      : 0;
    // Como no ENEM, questão em branco conta como erro na estimativa.
    const estimatedScore = estimateEnemScore(
      examQuestions.map((question) => ({
        difficulty: question.difficulty,
        isCorrect: Boolean(correctness[question.id]),
      })),
    );

    return (
      <div className="animate-rise">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="min-w-0 break-words text-base font-semibold text-slate-950">
            Resultado: {active.title}
          </h2>
          <Button variant="outline" size="sm" onClick={leaveAttempt}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar aos simulados
          </Button>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Reveal delay={0}>
            <StatCard
              label="Nota estimada"
              value={estimatedScore ? String(estimatedScore) : "—"}
              helper="estimativa de estudo, não previsão do ENEM"
              icon={Gauge}
            />
          </Reveal>
          <Reveal delay={60}>
            <StatCard
              label="Acertos"
              value={`${correct}/${totalCount}`}
              helper={
                blankCount
                  ? `${blankCount} ${blankCount === 1 ? "questão" : "questões"} em branco`
                  : "questões do simulado"
              }
              icon={CheckCircle2}
            />
          </Reveal>
          <Reveal delay={120}>
            <StatCard
              label="Aproveitamento"
              value={`${percentage}%`}
              helper={
                blankCount
                  ? "sobre o total; em branco conta como erro"
                  : "sobre o total de questões do simulado"
              }
              icon={TrendingUp}
            />
          </Reveal>
          <Reveal delay={180}>
            <StatCard
              label="Para revisar"
              value={String(wrongQuestions.length)}
              helper="erros entre as questões respondidas"
              icon={RotateCcw}
            />
          </Reveal>
        </section>

        {blankCount ? (
          <Notice tone="warning" className="mt-4">
            Você finalizou com {blankCount}{" "}
            {blankCount === 1 ? "questão em branco" : "questões em branco"} — como no
            ENEM, {blankCount === 1 ? "ela conta" : "elas contam"} como erro na nota
            estimada. Entre as {answeredCount}{" "}
            {answeredCount === 1 ? "questão que você respondeu" : "questões que você respondeu"},
            o aproveitamento foi de {answeredPercentage}%.
          </Notice>
        ) : null}

        <p className="mt-3 text-xs leading-5 text-slate-500">
          {ENEM_SCORE_ESTIMATE_NOTE}
        </p>

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
                    Responda ao menos uma questão para ver o aproveitamento por
                    área.
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
                      <li
                        key={question.id}
                        className="flex gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <XCircle
                          className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {question.topics.name}
                          </p>
                          <p className="text-xs leading-5 text-slate-500">
                            {question.subjects.area}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-slate-500">
                    {answeredCount
                      ? "Nenhum erro entre as questões que você respondeu. Bom trabalho."
                      : "Você finalizou sem responder nenhuma questão, então não há erro para revisar."}
                  </p>
                )}
                {wrongQuestions.length ? (
                  <Link
                    href="/dashboard/praticar?tab=revisao"
                    className={buttonClasses({
                      variant: "primary",
                      className: "mt-4",
                    })}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Revisar esses erros agora
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          </section>
        </Reveal>

        <Notice
          tone={fallbackAttempt ? "info" : "success"}
          icon={CheckCircle2}
          className="mt-6"
        >
          {fallbackAttempt
            ? "Este simulado usou questões de fora do seu histórico: os erros entram na Revisão de erros deste navegador, mas o resultado não soma no seu desempenho por assunto."
            : "Seus erros já entraram na Revisão de erros e o seu desempenho por assunto foi atualizado."}
        </Notice>
      </div>
    );
  }

  if (active && current) {
    const selected = answers[current.id];
    const progress = ((questionIndex + 1) / examQuestions.length) * 100;
    const answeredCount = examQuestions.filter((question) => answers[question.id]).length;
    const isLastQuestion = questionIndex === examQuestions.length - 1;

    return (
      <div>
        {/* Cronômetro e posição na prova acompanham a rolagem: em tela estreita o
            enunciado com 5 alternativas empurra esse bloco fora da viewport. */}
        <div className="sticky top-16 z-20 -mx-4 mb-6 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:gap-4 sm:px-6 xl:-mx-8 xl:px-8">
          <Button variant="outline" className="shrink-0" onClick={exitWithoutFinishing}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Sair<span className="hidden sm:inline"> sem finalizar</span>
          </Button>
          <span className="tnum shrink-0 whitespace-nowrap text-xs font-semibold text-slate-600 sm:text-sm">
            Questão {questionIndex + 1} de {examQuestions.length}
            <span className="hidden md:inline"> · {answeredCount} respondidas</span>
          </span>
          <Timer seconds={seconds} setSeconds={setSeconds} />
        </div>
        <Card>
          <CardContent>
            <Progress value={progress} label="Progresso" className="mb-6" />
            <div key={current.id} className="animate-rise">
              <div className="flex flex-wrap gap-2">
                <ThemeBadge kind="area" name={current.subjects.area} />
                <ThemeBadge name={current.subjects.name} />
                <Badge tone="slate">{current.difficulty}</Badge>
                <Badge tone="blue">{current.topics.name}</Badge>
              </div>
              <p className="mt-6 break-words text-base leading-7 text-slate-900 sm:text-lg sm:leading-8">
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
                      <span className="min-w-0 break-words text-sm leading-6 text-slate-800">
                        {option.option_text}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                disabled={questionIndex === 0}
                onClick={() => setQuestionIndex((currentIndex) => currentIndex - 1)}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </Button>
              {/* Finalizar aparece em qualquer questão: quem travou no meio da prova
                  precisa de saída com nota, não só na última. */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                <Button
                  variant={isLastQuestion ? "primary" : "outline"}
                  onClick={finish}
                  disabled={pending || !answeredCount}
                >
                  <Flag className="h-4 w-4" aria-hidden="true" />
                  Finalizar e ver nota
                </Button>
                {isLastQuestion ? null : (
                  <Button
                    onClick={() => setQuestionIndex((currentIndex) => currentIndex + 1)}
                  >
                    {selected ? "Próxima questão" : "Pular questão"}
                  </Button>
                )}
              </div>
            </div>
            {answeredCount ? null : (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Responda ao menos uma questão para finalizar e ver a nota estimada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const fallbackCatalog =
    simulations.length > 0 &&
    simulations.every((simulation) => isFallbackSimulation(simulation));
  // Tentativa interrompida (ou simulado montado que nunca começou) precisa de porta
  // de entrada: sem esta lista o aluno perde uma prova de 90 questões pela metade.
  const openSimulations = simulations
    .filter((simulation) => !isFallbackSimulation(simulation))
    .map((simulation) => ({
      simulation,
      attempt: latestInProgressAttempt(simulation),
    }))
    .filter(({ attempt }) => Boolean(attempt))
    .sort((a, b) => {
      if (Boolean(a.attempt) !== Boolean(b.attempt)) return a.attempt ? -1 : 1;
      const keyA = a.attempt?.started_at ?? a.simulation.created_at ?? "";
      const keyB = b.attempt?.started_at ?? b.simulation.created_at ?? "";
      return String(keyB).localeCompare(String(keyA));
    })
    .slice(0, 6);
  const attempts = simulations
    .flatMap((simulation) =>
      (simulation.user_simulations ?? [])
        .filter((attempt) => attempt.status === "Finalizado")
        .map((attempt) => ({ simulation, attempt })),
    )
    .sort((a, b) =>
      (b.attempt.finished_at ?? "").localeCompare(a.attempt.finished_at ?? ""),
    )
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {openSimulations.length ? (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Simulados em aberto
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Suas respostas ficam salvas: você volta de onde parou e a nota sai
                quando finalizar.
              </p>
            </div>
            <Badge tone="blue" className="shrink-0">
              {openSimulations.length} em progresso
            </Badge>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {openSimulations.map(({ simulation, attempt }) => {
              const questionCount = simulation.simulation_questions.length;
              const answeredCount = attempt
                ? Object.keys(answersFromSimulationAttempt(attempt)).length
                : 0;
              const progressPercentage = questionCount
                ? Math.round((answeredCount / questionCount) * 100)
                : 0;
              const startedAt = attempt
                ? formatAppDateTime(attempt.started_at, {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              return (
                <Card
                  key={attempt?.id ?? simulation.id}
                  className="overflow-hidden border-slate-200 bg-white shadow-md shadow-slate-900/6"
                >
                  <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100">
                          <Target className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <Badge tone={attempt ? "amber" : "slate"}>
                          {attempt ? "Em andamento" : "Pronto para iniciar"}
                        </Badge>
                      </div>
                      <h3 className="truncate text-sm font-bold text-slate-950">
                        {simulation.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                        <span className="tnum inline-flex items-center gap-1.5">
                          <BarChart3
                            className="h-3.5 w-3.5 text-slate-400"
                            aria-hidden="true"
                          />
                          {answeredCount} de {questionCount} questões
                        </span>
                        <span className="tnum inline-flex items-center gap-1.5">
                          <Clock
                            className="h-3.5 w-3.5 text-slate-400"
                            aria-hidden="true"
                          />
                          {startedAt ? `Iniciado em ${startedAt}` : "Ainda não iniciado"}
                        </span>
                      </div>
                      <Progress
                        value={progressPercentage}
                        label="Progresso"
                        className="mt-4 max-w-xl"
                      />
                    </div>
                    <Button
                      className="w-full sm:w-auto"
                      disabled={pending || locked}
                      onClick={() => start(simulation)}
                    >
                      <PlayCircle className="h-4 w-4" aria-hidden="true" />
                      {attempt ? "Continuar" : "Iniciar"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Simuladão ENEM
          </h2>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="whitespace-nowrap">Língua estrangeira</span>
            <select
              value={foreignLanguage}
              onChange={(event) =>
                setForeignLanguage(event.target.value as "en" | "es")
              }
              className="min-h-11 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-700 sm:min-h-0"
            >
              <option value="en">Inglês</option>
              <option value="es">Espanhol</option>
            </select>
          </label>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {EXAM_DAY_PRESETS.map((preset, index) => (
            <Reveal key={preset.key} delay={index * 60} className="h-full">
              <Card className="h-full">
                <CardContent className="flex h-full flex-col justify-between gap-5 p-5">
                  <div>
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                        <Target className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <Badge tone="blue">Questões novas a cada tentativa</Badge>
                    </div>
                    <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-950">
                      {preset.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-slate-600">
                      {preset.description}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-4 text-xs font-medium text-slate-600">
                      <span className="tnum inline-flex items-center gap-1.5">
                        <BarChart3
                          className="h-3.5 w-3.5 text-slate-400"
                          aria-hidden="true"
                        />
                        {preset.questionCount} questões
                      </span>
                      <span className="tnum inline-flex items-center gap-1.5">
                        <Clock
                          className="h-3.5 w-3.5 text-slate-400"
                          aria-hidden="true"
                        />
                        ~{calculateSimulationDurationMinutes(preset.questionCount)}{" "}
                        min
                      </span>
                    </div>
                  </div>
                  <Button
                    full
                    disabled={pending || locked}
                    onClick={() =>
                      generateAndStart({
                        title: preset.title,
                        areas: [...preset.areas],
                        questionCount: preset.questionCount,
                        language: preset.hasLanguage ? foreignLanguage : undefined,
                      })
                    }
                  >
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                    Gerar e começar
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
          Simulados rápidos por área
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_PRESETS.map((preset, index) => (
            <Reveal key={preset.title} delay={(index % 4) * 40} className="h-full">
              <Card className="h-full">
                <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-slate-950">
                      {preset.title.replace("Simulado rápido — ", "")}
                    </h3>
                    <p className="tnum mt-1.5 text-xs font-medium text-slate-500">
                      {QUICK_QUESTION_COUNT} questões • ~
                      {calculateSimulationDurationMinutes(QUICK_QUESTION_COUNT)} min
                    </p>
                  </div>
                  <Button
                    full
                    variant="outline"
                    disabled={pending || locked}
                    onClick={() =>
                      generateAndStart({
                        title: preset.title,
                        areas: [...preset.areas],
                        questionCount: QUICK_QUESTION_COUNT,
                        language: preset.hasLanguage ? foreignLanguage : undefined,
                      })
                    }
                  >
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                    Gerar e começar
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <SimulationBuilder
        locked={locked}
        pending={pending}
        onGeneratedSimulation={(simulation) => {
          start(simulation);
          router.replace("/dashboard/simulados", { scroll: false });
        }}
        excludeQuestionIds={locallyAnsweredQuestionIds}
      />

      {fallbackCatalog ? (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
            Simulados prontos
          </h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {simulations.map((simulation, index) => (
              <Reveal key={simulation.id} delay={(index % 3) * 60} className="h-full">
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                    <div>
                      <h3 className="text-base font-bold tracking-tight text-slate-950">
                        {simulation.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 text-slate-600">
                        {simulation.description}
                      </p>
                      <p className="tnum mt-3 text-xs font-medium text-slate-500">
                        {simulation.simulation_questions.length} questões • ~
                        {simulation.duration_minutes} min
                      </p>
                    </div>
                    <Button
                      full
                      disabled={pending}
                      onClick={() => start(simulation)}
                    >
                      <PlayCircle className="h-4 w-4" aria-hidden="true" />
                      Iniciar simulado
                    </Button>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {attempts.length ? (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
            Suas últimas tentativas
          </h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-100">
                {attempts.map(({ simulation, attempt }) => (
                  <li
                    key={attempt.id}
                    className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {simulation.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {attempt.finished_at
                          ? formatAppDateTime(attempt.finished_at, {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:shrink-0 sm:flex-nowrap sm:justify-end sm:gap-4">
                      <p className="tnum text-sm font-bold text-slate-800">
                        {attempt.correct_answers}/{attempt.total_questions}
                        <span className="ml-1.5 text-xs font-medium text-slate-500">
                          ({Math.round(attempt.score_percentage)}%)
                        </span>
                      </p>
                      {simulation.is_generated ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          disabled={pending || locked}
                          onClick={() => regenerateAndStart(simulation.id)}
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          Refazer com questões novas
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function isFallbackSimulation(simulation: Pick<SimulationWithQuestions, "id">) {
  return simulation.id.startsWith("fallback-simulation-");
}

type SimulationAttempt = NonNullable<
  SimulationWithQuestions["user_simulations"]
>[number];

function latestInProgressAttempt(simulation: SimulationWithQuestions) {
  return latestActiveAttempt(simulation.user_simulations ?? []) as
    | SimulationAttempt
    | undefined;
}

function answersFromSimulationAttempt(attempt: SimulationAttempt) {
  return answersFromAttemptRows(attempt.user_simulation_answers ?? []);
}

function firstUnansweredSimulationIndex(
  simulation: SimulationWithQuestions,
  answers: Record<string, string>,
) {
  const questions = simulation.simulation_questions
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => item.questions);
  return firstUnansweredIndex(
    questions.map((question) => question.id),
    answers,
  );
}

function elapsedSeconds(startedAt: string) {
  return elapsedSecondsSince(startedAt);
}

const BUILDER_AREAS = [
  { value: "Matematica", label: "Matemática" },
  { value: "Ciencias da Natureza", label: "Ciências da Natureza" },
  { value: "Ciencias Humanas", label: "Ciências Humanas" },
  { value: "Linguagens", label: "Linguagens" },
] as const;

const SIMULATION_QUESTION_OPTIONS = [15, 30, 45, 60, 90] as const;

function SimulationBuilder({
  locked,
  pending,
  onGeneratedSimulation,
  excludeQuestionIds,
}: {
  locked: boolean;
  pending: boolean;
  onGeneratedSimulation: (simulation: SimulationWithQuestions) => void;
  excludeQuestionIds: string[];
}) {
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
        excludeQuestionIds,
      });
      if (!result.ok || !result.simulationId) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (result.simulation) {
        onGeneratedSimulation(result.simulation);
        return;
      }
      router.push(`/dashboard/simulados?iniciar=${result.simulationId}`);
    });
  }

  const includesLinguagens = areas.includes("Linguagens");
  // min-h-11 garante o alvo mínimo de toque no mobile; a partir de sm volta à densidade do dashboard.
  const selectClasses =
    "min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-700 sm:min-h-0";

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-base font-bold tracking-tight text-blue-950">
                <SlidersHorizontal className="h-4 w-4 text-blue-700" aria-hidden="true" />
                Montar simulado do seu jeito
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-700">
                Escolha áreas, quantidade e dificuldade. O tempo segue o ritmo
                oficial do ENEM: 90 questões em 300 minutos.
              </span>
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-inset ring-blue-200">
              <ChevronDown
                className="h-4 w-4 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </span>
          </summary>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            {BUILDER_AREAS.map((area) => {
              const selected = areas.includes(area.value);
              return (
                <button
                  key={area.value}
                  type="button"
                  onClick={() => toggleArea(area.value)}
                  aria-pressed={selected}
                  className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-blue-700 sm:min-h-8 ${
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
          <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:flex sm:flex-wrap sm:items-end">
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
                  onChange={(event) =>
                    setForeignLanguage(event.target.value as "en" | "es")
                  }
                >
                  <option value="en">Inglês</option>
                  <option value="es">Espanhol</option>
                </select>
              </label>
            ) : null}
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700 sm:min-h-0 sm:pb-2">
              <input
                type="checkbox"
                checked={prioritizeWeaknesses}
                onChange={(event) => setPrioritizeWeaknesses(event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700 sm:h-4 sm:w-4"
              />
              Priorizar meus pontos fracos
            </label>
            <Button
              onClick={build}
              disabled={locked || building || pending || !areas.length}
            >
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              {building ? "Montando..." : "Montar e começar"}
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

  return (
    <div className="tnum shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
      {formatClock(seconds)}
    </div>
  );
}

/**
 * Tentativa retomada conta o tempo desde o início da prova, que pode passar de
 * um dia: sem a casa das horas o mostrador viraria "1872:05".
 */
function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const rest = (totalSeconds % 60).toString().padStart(2, "0");
  return hours ? `${hours}:${minutes}:${rest}` : `${minutes}:${rest}`;
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
                className="max-h-[min(520px,70dvh)] w-full object-contain"
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
        className="h-auto max-h-[min(520px,70dvh)] w-full object-contain"
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
