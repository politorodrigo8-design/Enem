"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  ImageIcon,
  PlayCircle,
  Search,
  X,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PremiumGate } from "@/components/dashboard/premium-gate";
import { QuestionExplanationCreditAction } from "@/components/dashboard/ai-credit-actions";
import {
  submitQuestionAnswerAction,
  finishPracticeSessionAction,
  toggleQuestionReviewAction,
  updatePracticeSessionProgressAction,
} from "@/lib/actions/learning";
import type { AccessContext } from "@/lib/access";
import type { ActivePracticeSession, QuestionRecord } from "@/lib/db/types";
import {
  buildShortQuestionFeedback,
  getPracticeSessionStats,
} from "@/lib/practice-session/rules.mjs";
import { cn } from "@/lib/utils";

type Props = {
  questions: QuestionRecord[];
  access: AccessContext;
  answerSource?: "question_bank" | "high_priority";
  initialQuestionId?: string;
  initialTopic?: string;
  activePracticeSession?: ActivePracticeSession | null;
};

export type FocusMode = "recommended" | "unanswered" | "review" | "all";

const sessionSizes = ["10", "15", "20", "Todas"] as const;
type SessionSize = (typeof sessionSizes)[number];

const focusModes: Array<{ id: FocusMode; label: string }> = [
  { id: "recommended", label: "Recomendadas" },
  { id: "unanswered", label: "Novas" },
  { id: "review", label: "Favoritas" },
  { id: "all", label: "Explorar banco" },
];

const defaultFilters = {
  area: "Todas",
  discipline: "Todas",
  topic: "Todos",
  difficulty: "Todas",
  year: "Todos",
  origin: "Todas",
};

type Filters = typeof defaultFilters;

type SessionSnapshot = {
  focusMode: FocusMode;
  sessionSize: SessionSize;
  filters: Filters;
  questionIds: string[];
  startedAt: string;
};

type AnswerState = Record<
  string,
  {
    selectedOption: string;
    isCorrect: boolean;
    explanation: string;
    correctOption: string;
  }
>;

type StoredPracticeSession = {
  version: 1;
  source: "question_bank" | "high_priority";
  session: SessionSnapshot;
  answers: AnswerState;
  currentIndex: number;
  practiceSessionId: string;
  sessionFinished: boolean;
  updatedAt: string;
};

const localPracticeQuestionIdPrefix = "fallback-question-";

function sameFilters(a: Filters, b: Filters) {
  return (
    a.area === b.area &&
    a.discipline === b.discipline &&
    a.topic === b.topic &&
    a.difficulty === b.difficulty &&
    a.year === b.year &&
    a.origin === b.origin
  );
}

function sliceForSize(questions: QuestionRecord[], size: SessionSize) {
  return size === "Todas" ? questions : questions.slice(0, Number(size));
}

export function QuestionBankClient({
  questions,
  access,
  answerSource = "question_bank",
  initialQuestionId,
  initialTopic,
  activePracticeSession,
}: Props) {
  const router = useRouter();
  const initialTopicName = useMemo(() => {
    if (!initialTopic) return null;
    return (
      questions.find(
        (question) =>
          question.topics.id === initialTopic ||
          question.topics.name === initialTopic,
      )?.topics.name ?? null
    );
  }, [initialTopic, questions]);
  const restoredPracticeSession = !initialTopicName ? activePracticeSession : null;

  const [focusMode, setFocusMode] = useState<FocusMode>(
    initialTopicName
      ? "all"
      : coerceFocusMode(restoredPracticeSession?.focus_mode) ?? "recommended",
  );
  const [filters, setFilters] = useState(() =>
    initialTopicName
      ? { ...defaultFilters, topic: initialTopicName }
      : coerceFilters(restoredPracticeSession?.filters) ?? defaultFilters,
  );
  const [sessionSize, setSessionSize] = useState<SessionSize>(
    coerceSessionSize(restoredPracticeSession?.session_size) ?? "15",
  );
  const [index, setIndex] = useState(
    Math.max(0, Math.floor(restoredPracticeSession?.current_index ?? 0) || 0),
  );
  const [practiceSessionId, setPracticeSessionId] = useState(
    restoredPracticeSession?.id ?? "",
  );
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<{
    questionId: string;
    isCorrect: boolean;
    explanation: string;
    correctOption: string;
  } | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>(() =>
    Object.fromEntries(
      questions.flatMap((question) => {
        const answer = latestAnswer(question);
        // O gabarito e a resolução não vêm no payload; para respostas já
        // persistidas eles só reaparecem se o aluno responder de novo.
        return answer
          ? [
              [
                question.id,
                {
                  selectedOption: answer.selected_option,
                  isCorrect: answer.is_correct,
                  explanation: "",
                  correctOption: "",
                },
              ],
            ]
          : [];
      }),
    ),
  );
  const [reviewState, setReviewState] = useState(() =>
    Object.fromEntries(
      questions.map((question) => [
        question.id,
        Boolean(question.user_question_reviews?.length),
      ]),
    ),
  );
  const restoredAnswerState = useMemo(
    () =>
      restoredPracticeSession
        ? answerStateFromActiveSession(restoredPracticeSession)
        : {},
    [restoredPracticeSession],
  );
  const [sessionAnswerState, setSessionAnswerState] = useState<AnswerState>(
    () => restoredAnswerState,
  );
  const [pending, startTransition] = useTransition();
  const [sessionFinished, setSessionFinished] = useState(false);
  const [localSessionHydrated, setLocalSessionHydrated] = useState(false);
  const localSessionKey = useMemo(
    () => practiceSessionStorageKey(answerSource),
    [answerSource],
  );

  const orderedQuestions = useMemo(() => {
    if (!initialQuestionId) return questions;
    const selectedQuestion = questions.find(
      (question) => question.id === initialQuestionId,
    );
    if (!selectedQuestion) return questions;
    return [
      selectedQuestion,
      ...questions.filter((question) => question.id !== initialQuestionId),
    ];
  }, [initialQuestionId, questions]);

  const filtered = useMemo(
    () =>
      filterQuestions({
        questions: orderedQuestions,
        focusMode,
        answerState,
        reviewState,
        filters,
      }),
    [answerState, filters, focusMode, orderedQuestions, reviewState],
  );

  // A sessão ativa é um retrato congelado: responder questões não a embaralha,
  // e mexer nos controles só entra em vigor quando o aluno inicia a nova sessão.
  const [session, setSession] = useState<SessionSnapshot>(() =>
    buildInitialSessionSnapshot({
      restoredPracticeSession,
      orderedQuestions,
      focusMode,
      sessionSize,
      filters,
      answerState,
      reviewState,
    }),
  );

  const questionById = useMemo(
    () => new Map(orderedQuestions.map((item) => [item.id, item])),
    [orderedQuestions],
  );
  const sessionQuestions = useMemo(
    () =>
      session.questionIds
        .map((id) => questionById.get(id))
        .filter((item): item is QuestionRecord => Boolean(item)),
    [questionById, session.questionIds],
  );

  const selectionChanged =
    focusMode !== session.focusMode ||
    sessionSize !== session.sessionSize ||
    (focusMode === "all" && !sameFilters(filters, session.filters));

  function startNewSession() {
    if (!sessionFinished && answeredInSession > 0) {
      toast.error("Finalize a sessão atual antes de iniciar outra.");
      return;
    }

    setSession({
      focusMode,
      sessionSize,
      filters,
      startedAt: new Date().toISOString(),
      questionIds: sliceForSize(filtered, sessionSize).map((item) => item.id),
    });
    setPracticeSessionId("");
    setSessionAnswerState({});
    setSessionFinished(false);
    move(0, false);
  }

  function discardSelectionChange() {
    setFocusMode(session.focusMode);
    setSessionSize(session.sessionSize);
    setFilters(session.filters);
  }
  const currentIndex = Math.min(index, Math.max(sessionQuestions.length - 1, 0));
  const question = sessionQuestions[currentIndex];
  const sessionAnswer = question ? sessionAnswerState[question.id] : undefined;
  const currentResult =
    result?.questionId === question?.id
      ? result
      : question && sessionAnswer
        ? {
            questionId: question.id,
            isCorrect: sessionAnswer.isCorrect,
            explanation: sessionAnswer.explanation,
            correctOption: sessionAnswer.correctOption,
          }
        : null;
  const knownCorrectOption = Boolean(currentResult?.correctOption);
  const displayedSelected =
    selected || (question ? sessionAnswer?.selectedOption ?? "" : "");
  const accessBlocked = !access.hasPlatformAccess;
  const legacyMedia = getQuestionMedia(question);
  const associatedMedia = question?.question_media ?? [];
  const sessionStats = getPracticeSessionStats({
    questionIds: session.questionIds,
    answerState: sessionAnswerState,
  });
  const answeredInSession = sessionStats.answered;
  const sessionSubmittedQuestions = sessionStats.answeredQuestionIds
    .map((questionId) => questionById.get(questionId))
    .filter((item): item is QuestionRecord => Boolean(item));
  const sessionSubmittedCount = sessionStats.answered;
  const sessionSubmittedCorrect = sessionStats.correct;
  const sessionSubmittedWrong = sessionStats.wrong;
  const hasUnfinishedSubmissions = sessionSubmittedCount > 0 && !sessionFinished;
  const sessionUsesLocalQuestions = hasLocalPracticeQuestions(session.questionIds);

  const filterOptions = useMemo(
    () => buildFilterOptions(orderedQuestions, filters),
    [filters, orderedQuestions],
  );

  /* eslint-disable react-hooks/set-state-in-effect -- Restores browser-only session state after hydration. */
  useEffect(() => {
    if (initialTopicName) {
      setLocalSessionHydrated(true);
      return;
    }

    const stored = readStoredPracticeSession(localSessionKey, answerSource);
    if (!stored) {
      setLocalSessionHydrated(true);
      return;
    }

    const storedTime = new Date(stored.updatedAt).getTime();
    const serverTime = restoredPracticeSession?.updated_at
      ? new Date(restoredPracticeSession.updated_at).getTime()
      : 0;
    if (serverTime > storedTime) {
      setLocalSessionHydrated(true);
      return;
    }

    const availableQuestionIds = new Set(orderedQuestions.map((item) => item.id));
    const questionIds = stored.session.questionIds.filter((id) =>
      availableQuestionIds.has(id),
    );
    if (!questionIds.length) {
      setLocalSessionHydrated(true);
      return;
    }

    const answers = Object.fromEntries(
      Object.entries(stored.answers).filter(([questionId]) =>
        questionIds.includes(questionId),
      ),
    ) as AnswerState;
    const restoredSession = { ...stored.session, questionIds };

    setSession(restoredSession);
    setFocusMode(restoredSession.focusMode);
    setSessionSize(restoredSession.sessionSize);
    setFilters(restoredSession.filters);
    setIndex(Math.min(Math.max(0, stored.currentIndex), questionIds.length - 1));
    setPracticeSessionId(stored.practiceSessionId);
    setSessionAnswerState(answers);
    setAnswerState((current) => ({ ...current, ...answers }));
    setSessionFinished(stored.sessionFinished);
    setSelected("");
    setResult(null);
    setLocalSessionHydrated(true);
  }, [
    answerSource,
    initialTopicName,
    localSessionKey,
    orderedQuestions,
    restoredPracticeSession,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!localSessionHydrated || initialTopicName) return;

    writeStoredPracticeSession(localSessionKey, {
      version: 1,
      source: answerSource,
      session,
      answers: sessionAnswerState,
      currentIndex,
      practiceSessionId,
      sessionFinished,
      updatedAt: new Date().toISOString(),
    });
  }, [
    answerSource,
    currentIndex,
    initialTopicName,
    localSessionHydrated,
    localSessionKey,
    practiceSessionId,
    session,
    sessionAnswerState,
    sessionFinished,
  ]);

  function move(nextIndex: number, persistProgress = true) {
    const safeIndex = Math.max(0, nextIndex);
    setIndex(safeIndex);
    setSelected("");
    setResult(null);
    if (persistProgress && practiceSessionId) {
      startTransition(async () => {
        await updatePracticeSessionProgressAction({
          practiceSessionId,
          currentIndex: safeIndex,
        });
      });
    }
  }

  function changeFocus(mode: FocusMode) {
    setFocusMode(mode);
    if (mode !== "all") setFilters(defaultFilters);
  }

  function updateFilter(key: keyof typeof defaultFilters, value: string) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === "area") {
        next.discipline = "Todas";
        next.topic = "Todos";
      }
      if (key === "discipline") next.topic = "Todos";
      return next;
    });
  }

  function clearTopicFocus() {
    setFocusMode("recommended");
    setFilters(defaultFilters);
    setSession({
      focusMode: "recommended",
      sessionSize,
      filters: defaultFilters,
      startedAt: new Date().toISOString(),
      questionIds: sliceForSize(
        filterQuestions({
          questions: orderedQuestions,
          focusMode: "recommended",
          answerState,
          reviewState,
          filters: defaultFilters,
        }),
        sessionSize,
      ).map((item) => item.id),
    });
    setPracticeSessionId("");
    setSessionAnswerState({});
    setSessionFinished(false);
    move(0, false);
    router.replace("/dashboard/praticar", { scroll: false });
  }

  function submitAnswer() {
    if (!question || !selected) return;

    startTransition(async () => {
      const response = await submitQuestionAnswerAction({
        questionId: question.id,
        selectedOption: selected,
        responseTimeSeconds: 0,
        source: answerSource,
        practiceSession: {
          id: practiceSessionId || undefined,
          focusMode: session.focusMode,
          sessionSize: session.sessionSize,
          filters: session.filters,
          questionIds: session.questionIds,
          currentIndex,
          startedAt: session.startedAt,
        },
      });
      toast[response.ok ? "success" : "error"](response.message);
      if (response.ok) {
        setAnswerState((current) => ({
          ...current,
          [question.id]: {
            selectedOption: selected,
            isCorrect: Boolean(response.isCorrect),
            explanation: response.explanation ?? "",
            correctOption: response.correctOption ?? "",
          },
        }));
        setSessionAnswerState((current) => ({
          ...current,
          [question.id]: {
            selectedOption: selected,
            isCorrect: Boolean(response.isCorrect),
            explanation: response.explanation ?? "",
            correctOption: response.correctOption ?? "",
          },
        }));
        if (response.practiceSessionId) setPracticeSessionId(response.practiceSessionId);
        setSessionFinished(false);
        setResult({
          questionId: question.id,
          isCorrect: Boolean(response.isCorrect),
          explanation: response.explanation ?? "",
          correctOption: response.correctOption ?? "",
        });
      }
    });
  }

  function finishSession() {
    if (!sessionSubmittedCount) {
      toast.error("Responda pelo menos uma questão desta sessão antes de finalizar.");
      return;
    }

    startTransition(async () => {
      const response = await finishPracticeSessionAction({
        practiceSessionId: practiceSessionId || undefined,
        questionIds: sessionSubmittedQuestions.map((item) => item.id),
        startedAt: session.startedAt,
        source: answerSource,
        localSummary: sessionUsesLocalQuestions
          ? {
              questionCount: sessionQuestions.length,
              answered: sessionSubmittedCount,
              correct: sessionSubmittedCorrect,
              wrong: sessionSubmittedWrong,
            }
          : undefined,
      });
      toast[response.ok ? "success" : "error"](response.message);
      if (response.ok) {
        setSessionFinished(true);
        setPracticeSessionId("");
        router.refresh();
      }
    });
  }

  function addReview() {
    if (!question) return;
    startTransition(async () => {
      const response = await toggleQuestionReviewAction(question.id);
      toast[response.ok ? "success" : "error"](response.message);
      if (response.ok && typeof response.reviewed === "boolean") {
        setReviewState((current) => ({
          ...current,
          [question.id]: Boolean(response.reviewed),
        }));
        router.refresh();
      }
    });
  }

  return (
    <>
      {initialTopicName ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3">
          <p className="text-sm font-semibold text-blue-950">
            Estudando: {initialTopicName}
            <span className="ml-2 font-normal text-blue-800">
              — questões deste assunto contam para sua meta de hoje.
            </span>
          </p>
          <Button variant="outline" size="sm" onClick={clearTopicFocus}>
            <X className="h-4 w-4" aria-hidden="true" />
            Sair do assunto
          </Button>
        </div>
      ) : null}

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Foco da prática"
          >
            {focusModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={focusMode === mode.id}
                onClick={() => changeFocus(mode.id)}
                className={cn(
                  "rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700",
                  focusMode === mode.id
                    ? "border-blue-300 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5" aria-label="Tamanho da sessão">
              {sessionSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSessionSize(size)}
                  className={cn(
                    "tnum rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    sessionSize === size
                      ? "border-blue-300 bg-blue-50 text-blue-900"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
            <p className="tnum text-sm font-semibold text-slate-700">
              {filtered.length}{" "}
              {filtered.length === 1 ? "questão" : "questões"}
            </p>
          </div>
        </div>

        {focusMode === "all" ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Select
                label="Área"
                value={filters.area}
                options={filterOptions.areas}
                onChange={(value) => updateFilter("area", value)}
              />
              <Select
                label="Disciplina"
                value={filters.discipline}
                options={filterOptions.disciplines}
                onChange={(value) => updateFilter("discipline", value)}
              />
              <Select
                label="Assunto"
                value={filters.topic}
                options={filterOptions.topics}
                onChange={(value) => updateFilter("topic", value)}
              />
              <Select
                label="Dificuldade"
                value={filters.difficulty}
                options={["Todas", "Baixa", "Média", "Alta"]}
                onChange={(value) => updateFilter("difficulty", value)}
              />
              <Select
                label="Ano"
                value={filters.year}
                options={filterOptions.years}
                onChange={(value) => updateFilter("year", value)}
              />
              <Select
                label="Origem"
                value={filters.origin}
                options={filterOptions.origins}
                onChange={(value) => updateFilter("origin", value)}
              />
            </div>
          </div>
        ) : null}
      </section>

      {selectionChanged ? (
        <div className="animate-rise mb-4 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-blue-950">
            Seleção alterada —{" "}
            <span className="tnum">
              {sliceForSize(filtered, sessionSize).length}
            </span>{" "}
            {sliceForSize(filtered, sessionSize).length === 1
              ? "questão pronta"
              : "questões prontas"}{" "}
            para a nova sessão.
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={discardSelectionChange}>
              Voltar à sessão atual
            </Button>
            {hasUnfinishedSubmissions ? (
              <Button size="sm" onClick={finishSession} disabled={pending}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Finalizar sessão
              </Button>
            ) : null}
            <Button
              size="sm"
              onClick={startNewSession}
              disabled={!filtered.length || hasUnfinishedSubmissions}
            >
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Iniciar nova sessão
            </Button>
          </div>
        </div>
      ) : null}

      <section
        className={cn(
          "mb-6 rounded-lg border p-4 shadow-sm shadow-slate-900/5",
          sessionFinished
            ? "border-emerald-200 bg-emerald-50"
            : hasUnfinishedSubmissions
              ? "border-blue-200 bg-blue-50"
              : "border-slate-200 bg-white",
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-950">
              {sessionFinished
                ? "Sessão finalizada"
                : hasUnfinishedSubmissions
                  ? "Sessão aguardando finalização"
                  : "Sessão em andamento"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              As respostas novas entram no desempenho e na revisão de erros
              quando você finaliza.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-3 gap-2 text-center">
              <SessionMetric
                label="Progresso"
                value={`${answeredInSession}/${sessionQuestions.length}`}
              />
              <SessionMetric
                label="Acertos"
                value={String(sessionSubmittedCorrect)}
              />
              <SessionMetric label="Erros" value={String(sessionSubmittedWrong)} />
            </div>
            {sessionFinished ? (
              <Button onClick={startNewSession} disabled={!filtered.length}>
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                Iniciar nova sessão
              </Button>
            ) : (
              <Button
                onClick={finishSession}
                disabled={!sessionSubmittedCount || pending}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Finalizar e salvar sessão
              </Button>
            )}
          </div>
        </div>
      </section>

      {!question ? (
        <EmptyState
          icon={Search}
          title="Nenhuma questão encontrada"
          description={
            focusMode === "review"
              ? "Você ainda não salvou questões como favoritas. Use o marcador na lateral de qualquer questão."
              : focusMode === "unanswered"
                ? "Você já respondeu todas as questões deste foco. Explore o banco ou revise seus erros."
                : "Nenhuma questão corresponde aos filtros escolhidos."
          }
          action={
            selectionChanged && filtered.length ? (
              <Button onClick={startNewSession}>
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                Iniciar nova sessão
              </Button>
            ) : (
              <Button variant="outline" onClick={() => changeFocus("recommended")}>
                Voltar às recomendadas
              </Button>
            )
          }
        />
      ) : (
        <div
          className={cn(
            "grid gap-6 xl:grid-cols-[1fr_360px]",
            selectionChanged &&
              "pointer-events-none select-none opacity-40 transition-opacity",
          )}
          aria-hidden={selectionChanged || undefined}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>
                    Questão {currentIndex + 1} de {sessionQuestions.length}
                  </CardTitle>
                  <p className="mt-2 text-sm text-slate-500">
                    {formatQuestionSource(question)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={question.is_official ? "green" : "amber"}>
                    {questionOrigin(question)}
                  </Badge>
                  <Badge tone="slate">
                    {questionBoard(question)} {question.year}
                  </Badge>
                  <Badge tone="blue">{question.subjects.area}</Badge>
                  <Badge tone="slate">{question.difficulty}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div key={question.id} className="animate-rise">
                <p className="text-lg leading-8 text-slate-900">
                  {question.statement}
                </p>
                {associatedMedia.length ? (
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
                          <figcaption className="border-t border-slate-200 px-4 py-3 text-xs leading-5 text-slate-600">
                            {media.caption || media.media_type}
                            {media.source_pdf || media.source_page ? (
                              <span>
                                {" "}
                                Fonte: {media.source_pdf || "PDF original"}
                                {media.source_page
                                  ? `, página ${media.source_page}`
                                  : ""}
                                .
                              </span>
                            ) : null}
                          </figcaption>
                        </figure>
                      ))}
                  </div>
                ) : legacyMedia ? (
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
                ) : question.media_required ? (
                  <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    <ImageIcon
                      className="mt-0.5 h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    <p>
                      Esta questão depende de uma imagem que ainda está em
                      revisão editorial. Assim que a mídia for verificada, ela
                      aparecerá aqui completa.
                    </p>
                  </div>
                ) : null}
                <div className="mt-6 space-y-3">
                  {question.question_options
                    .slice()
                    .sort((a, b) => a.option_key.localeCompare(b.option_key))
                    .map((option) => {
                      const isSelected = displayedSelected === option.option_key;
                      const isCorrect =
                        currentResult &&
                        knownCorrectOption &&
                        currentResult.correctOption === option.option_key;
                      const isWrong =
                        currentResult &&
                        knownCorrectOption &&
                        isSelected &&
                        currentResult.correctOption !== option.option_key;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            !currentResult && setSelected(option.option_key)
                          }
                          className={cn(
                            "flex w-full items-start gap-3 rounded-lg border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700",
                            isCorrect
                              ? "border-emerald-300 bg-emerald-50"
                              : isWrong
                                ? "border-rose-300 bg-rose-50"
                                : isSelected
                                  ? "border-blue-300 bg-blue-50 text-blue-900"
                                  : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50",
                          )}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-700">
                            {option.option_key}
                          </span>
                          <span className="text-sm leading-6 text-slate-800">
                            {option.option_text}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => move(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      move(Math.min(sessionQuestions.length - 1, currentIndex + 1))
                    }
                    disabled={currentIndex === sessionQuestions.length - 1}
                  >
                    Próxima
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <Button
                  onClick={submitAnswer}
                  disabled={
                    !selected || pending || Boolean(currentResult) || accessBlocked
                  }
                >
                  Responder
                </Button>
              </div>

              {accessBlocked ? (
                <PremiumGate
                  compact
                  className="mt-6"
                  feature="O banco completo de questões"
                />
              ) : null}

              {currentResult ? (
                <div
                  className={cn(
                    "mt-6 rounded-lg border p-5",
                    currentResult.isCorrect
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-rose-200 bg-rose-50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {currentResult.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-700" />
                    )}
                    <p className="font-bold text-slate-950">
                      {currentResult.isCorrect
                        ? "Resposta correta"
                        : "Resposta incorreta"}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {currentResult.explanation ||
                      "A explicação completa aparece depois de uma nova tentativa nesta sessão."}
                  </p>
                </div>
              ) : null}

              {currentResult && currentIndex === sessionQuestions.length - 1 ? (
                <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-5">
                  <p className="font-bold text-blue-950">
                    Sessão concluída — {answeredInSession} de{" "}
                    {sessionQuestions.length} respondidas
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Suas respostas ficam no histórico e alimentam seu desempenho.
                    Em Novas, as questões respondidas saem da fila; monte outra
                    sessão quando quiser.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <aside>
            <Card>
              <CardHeader>
                <CardTitle>Detalhes</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-slate-100">
                  <Detail label="Disciplina" value={question.subjects.name} />
                  <Detail label="Assunto" value={question.topics.name} />
                  <Detail label="Dificuldade" value={question.difficulty} />
                  <Detail label="Origem" value={questionOrigin(question)} />
                  <Detail label="Prova" value={formatExamDetail(question)} />
                  <Detail label="Fonte" value={question.source} />
                  <Detail
                    label="Histórico"
                    value={`${Math.max(
                      question.user_question_answers?.length ?? 0,
                      answerState[question.id] ? 1 : 0,
                    )} resposta(s)`}
                  />
                </dl>
                <WhyThisQuestion question={question} />
                <QuestionExplanationCreditAction
                  questionId={question.id}
                  selectedOption={displayedSelected || undefined}
                  disabled={accessBlocked || !currentResult}
                />
                <Button
                  variant="outline"
                  full
                  className="mt-4"
                  onClick={addReview}
                  disabled={pending || accessBlocked}
                >
                  {reviewState[question.id] ? (
                    <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                  )}
                  {reviewState[question.id]
                    ? "Remover das favoritas"
                    : "Salvar nas favoritas"}
                </Button>
                {accessBlocked ? (
                  <PremiumGate
                    compact
                    className="mt-4"
                    feature="A revisão de erros completa"
                  />
                ) : null}
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </>
  );
}

function SessionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-lg border border-white/70 bg-white/75 px-3 py-2">
      <p className="tnum text-base font-bold text-slate-950">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function WhyThisQuestion({ question }: { question: QuestionRecord }) {
  const reason = question.priority_reason?.trim();
  const recurrenceLabel = recurrenceDisplay(question);
  if (!reason && !recurrenceLabel) return null;

  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        Por que treinar esta questão
      </p>
      <p className="mt-1.5 text-xs leading-5 text-slate-600">
        {reason ||
          "O assunto desta questão aparece com frequência nas últimas provas do ENEM."}
      </p>
      {recurrenceLabel ? (
        <p className="mt-1.5 text-xs font-semibold text-blue-800">
          {recurrenceLabel}
        </p>
      ) : null}
    </div>
  );
}

// As categorias vêm do pipeline editorial sem acentos; nunca exibir o valor cru.
function recurrenceDisplay(question: QuestionRecord) {
  switch (question.recurrence_category) {
    case "Potencial muito alto de recorrencia do conteudo":
      return "Conteúdo muito frequente nas últimas provas";
    case "Alta prioridade":
      return "Conteúdo frequente nas últimas provas";
    case "Prioridade media":
      return "Conteúdo recorrente no ENEM";
    default:
      return null;
  }
}

function buildFilterOptions(
  questions: QuestionRecord[],
  filters: typeof defaultFilters,
) {
  const byArea =
    filters.area === "Todas"
      ? questions
      : questions.filter((question) => question.subjects.area === filters.area);
  const byDiscipline =
    filters.discipline === "Todas"
      ? byArea
      : byArea.filter((question) => question.subjects.name === filters.discipline);

  return {
    areas: uniqueOptions("Todas", questions.map((q) => q.subjects.area)),
    disciplines: uniqueOptions("Todas", byArea.map((q) => q.subjects.name)),
    topics: uniqueOptions("Todos", byDiscipline.map((q) => q.topics.name)),
    years: [
      "Todos",
      ...Array.from(new Set(questions.map((q) => String(q.year)))).sort(
        (a, b) => Number(b) - Number(a),
      ),
    ],
    origins: uniqueOptions("Todas", questions.map((q) => questionOrigin(q))),
  };
}

function uniqueOptions(first: string, values: string[]) {
  return [first, ...Array.from(new Set(values.filter(Boolean)))];
}

function filterQuestions({
  questions,
  focusMode,
  answerState,
  reviewState,
  filters,
}: {
  questions: QuestionRecord[];
  focusMode: FocusMode;
  answerState: Record<string, unknown>;
  reviewState: Record<string, unknown>;
  filters: typeof defaultFilters;
}) {
  return questions.filter((question) => {
    const answered = Boolean(answerState[question.id]);
    const reviewed = Boolean(reviewState[question.id]);

    const matchesFocus =
      focusMode === "all" ||
      (focusMode === "unanswered" && !answered) ||
      (focusMode === "review" && reviewed) ||
      (focusMode === "recommended" && (isHighPriority(question) || !answered));

    const matchesFilters =
      focusMode !== "all" ||
      ((filters.area === "Todas" || question.subjects.area === filters.area) &&
        (filters.discipline === "Todas" ||
          question.subjects.name === filters.discipline) &&
        (filters.topic === "Todos" || question.topics.name === filters.topic) &&
        (filters.difficulty === "Todas" ||
          question.difficulty === filters.difficulty) &&
        (filters.year === "Todos" || String(question.year) === filters.year) &&
        (filters.origin === "Todas" || questionOrigin(question) === filters.origin));

    return matchesFocus && matchesFilters;
  });
}

function isHighPriority(question: QuestionRecord) {
  return (
    Boolean(recurrenceDisplay(question)) ||
    Number(question.priority_score ?? 0) >= 70
  );
}

function questionOrigin(question: QuestionRecord) {
  if (question.is_official) return "Oficial";
  if (question.is_authorial) return "Autoral";
  if (question.is_inspired) return "Inspirada";
  if (question.is_demo) return "Demonstrativa";
  return "Revisada";
}

function questionBoard(question: QuestionRecord) {
  if (question.is_official) {
    const examName = question.exam_name?.trim() || "ENEM";
    return examName.toLowerCase().includes("enem") ? "ENEM" : examName;
  }

  if (question.source.toLowerCase().includes("enem")) {
    return "ENEM";
  }

  return "Pontua Enem";
}

function formatQuestionSource(question: QuestionRecord) {
  const parts = [
    question.source,
    question.exam_color,
    question.question_number ? `questão ${question.question_number}` : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function formatExamDetail(question: QuestionRecord) {
  const parts = [
    question.exam_name || "ENEM",
    String(question.year),
    question.exam_day ? `Dia ${question.exam_day}` : "",
    question.exam_color,
    question.question_number ? `Q${question.question_number}` : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-right text-sm font-medium leading-5 text-slate-800">
        {value}
      </dd>
    </div>
  );
}

function getQuestionMedia(question?: QuestionRecord) {
  if (!question?.media_url) return null;
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

function coerceFocusMode(value?: string | null): FocusMode | null {
  return focusModes.some((mode) => mode.id === value) ? (value as FocusMode) : null;
}

function coerceSessionSize(value?: string | null): SessionSize | null {
  return sessionSizes.includes(value as SessionSize) ? (value as SessionSize) : null;
}

function coerceFilters(value: unknown): Filters | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const stored = value as Partial<Record<keyof Filters, unknown>>;
  return {
    area: typeof stored.area === "string" ? stored.area : defaultFilters.area,
    discipline:
      typeof stored.discipline === "string"
        ? stored.discipline
        : defaultFilters.discipline,
    topic: typeof stored.topic === "string" ? stored.topic : defaultFilters.topic,
    difficulty:
      typeof stored.difficulty === "string"
        ? stored.difficulty
        : defaultFilters.difficulty,
    year: typeof stored.year === "string" ? stored.year : defaultFilters.year,
    origin: typeof stored.origin === "string" ? stored.origin : defaultFilters.origin,
  };
}

function buildInitialSessionSnapshot({
  restoredPracticeSession,
  orderedQuestions,
  focusMode,
  sessionSize,
  filters,
  answerState,
  reviewState,
}: {
  restoredPracticeSession?: ActivePracticeSession | null;
  orderedQuestions: QuestionRecord[];
  focusMode: FocusMode;
  sessionSize: SessionSize;
  filters: Filters;
  answerState: AnswerState;
  reviewState: Record<string, boolean>;
}): SessionSnapshot {
  const availableQuestionIds = new Set(orderedQuestions.map((question) => question.id));
  const restoredQuestionIds = (restoredPracticeSession?.question_ids ?? []).filter((id) =>
    availableQuestionIds.has(id),
  );
  if (restoredPracticeSession && restoredQuestionIds.length) {
    return {
      focusMode,
      sessionSize,
      filters,
      startedAt: restoredPracticeSession.started_at,
      questionIds: restoredQuestionIds,
    };
  }

  return {
    focusMode,
    sessionSize,
    filters,
    startedAt: new Date().toISOString(),
    questionIds: sliceForSize(
      filterQuestions({
        questions: orderedQuestions,
        focusMode,
        answerState,
        reviewState,
        filters,
      }),
      sessionSize,
    ).map((item) => item.id),
  };
}

function answerStateFromActiveSession(session: ActivePracticeSession): AnswerState {
  return Object.fromEntries(
    session.answers.map((answer) => [
      answer.question_id,
      {
        selectedOption: answer.selected_option,
        isCorrect: answer.is_correct,
        correctOption: answer.correct_option,
        explanation: buildShortQuestionFeedback({
          isCorrect: answer.is_correct,
          correctOption: answer.correct_option,
          explanation: answer.explanation,
        }),
      },
    ]),
  );
}

function latestAnswer(question: QuestionRecord) {
  return question.user_question_answers
    ?.slice()
    .sort(
      (a, b) =>
        new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime(),
    )[0];
}

function hasLocalPracticeQuestions(questionIds: string[]) {
  return questionIds.some((questionId) =>
    questionId.startsWith(localPracticeQuestionIdPrefix),
  );
}

function practiceSessionStorageKey(source: "question_bank" | "high_priority") {
  return `pontua-enem:practice-session:${source}`;
}

function readStoredPracticeSession(
  key: string,
  source: "question_bank" | "high_priority",
): StoredPracticeSession | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPracticeSession>;
    if (
      parsed.version !== 1 ||
      parsed.source !== source ||
      !parsed.session ||
      !Array.isArray(parsed.session.questionIds) ||
      !parsed.answers ||
      typeof parsed.answers !== "object"
    ) {
      return null;
    }
    return parsed as StoredPracticeSession;
  } catch {
    return null;
  }
}

function writeStoredPracticeSession(key: string, session: StoredPracticeSession) {
  try {
    window.localStorage.setItem(key, JSON.stringify(session));
  } catch {
    // localStorage can be blocked or unavailable in some browser modes.
  }
}
