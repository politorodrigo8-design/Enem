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
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { AccordionCard, Detail } from "@/components/ui/accordion-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PremiumGate } from "@/components/dashboard/premium-gate";
import { QuestionExplanationCreditAction } from "@/components/dashboard/ai-credit-actions";
import { ThemeBadge } from "@/components/dashboard/subject-theme-badge";
import {
  submitQuestionAnswerAction,
  finishPracticeSessionAction,
  toggleQuestionFavoriteAction,
  updatePracticeSessionProgressAction,
} from "@/lib/actions/learning";
import type { AccessContext } from "@/lib/access";
import type { ActivePracticeSession, PracticeQuestionRecord } from "@/lib/db/types";
import {
  buildShortQuestionFeedback,
  getPracticeSessionStats,
} from "@/lib/practice-session/rules.mjs";
import { selectRecommendedQuestions } from "@/lib/questions/rules.mjs";
import { cn } from "@/lib/utils";
import {
  isLocalQuestionId,
  localAnswerTaxonomy,
  recordLocalQuestionAnswer,
  useLocalQuestionProgress,
} from "@/lib/local-question-progress";
import {
  questionContentWindow,
  useQuestionContent,
} from "@/lib/questions/use-question-content";
import {
  QuestionOptionsPlaceholder,
  QuestionStatementPlaceholder,
} from "@/components/dashboard/question-content-placeholder";

export type TopicPriority = Record<
  string,
  { score: number; reason: string; hasPerformance?: boolean }
>;

type Props = {
  questions: PracticeQuestionRecord[];
  access: AccessContext;
  userId: string;
  answerSource?: "question_bank" | "high_priority";
  initialQuestionId?: string;
  initialTopic?: string;
  initialGoal?: number | null;
  topicPriority?: TopicPriority;
  activePracticeSession?: ActivePracticeSession | null;
};

export type FocusMode = "recommended" | "unanswered" | "review" | "all";

// Janela mínima entre revalidações disparadas por foco/visibilidade.
const revalidateOnFocusIntervalMs = 60_000;

const allQuestionsSize = "Todas";
const sessionSizePresets = ["10", "15", "20"];
// "Todas" ou a quantidade de questões da sessão — a meta do dia entra como
// tamanho válido mesmo fora dos atalhos fixos.
type SessionSize = string;

const focusModes: Array<{ id: FocusMode; label: string }> = [
  { id: "recommended", label: "Recomendadas" },
  { id: "unanswered", label: "Todas as não respondidas" },
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

function sliceForSize(questions: PracticeQuestionRecord[], size: SessionSize) {
  const limit = Number(size);
  return size === allQuestionsSize || !Number.isFinite(limit) || limit < 1
    ? questions
    : questions.slice(0, Math.floor(limit));
}

export function QuestionBankClient({
  questions,
  access,
  userId,
  answerSource = "question_bank",
  initialQuestionId,
  initialTopic,
  initialGoal,
  topicPriority,
  activePracticeSession,
}: Props) {
  const router = useRouter();
  // Em coluna única (abaixo de xl) os botões de navegação ficam no fim do card:
  // sem reposicionar o scroll, o aluno cairia no meio da questão seguinte.
  const questionCardRef = useRef<HTMLDivElement>(null);
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
  // "Retomar estudo de hoje" abre o Praticar já com o assunto na URL: a sessão
  // do servidor só é descartada quando o aluno escolhe OUTRO assunto — senão
  // ele refaria as questões que já respondeu.
  const restoredPracticeSession = useMemo(() => {
    if (!activePracticeSession) return null;
    if (!initialTopicName) return activePracticeSession;
    return coerceFilters(activePracticeSession.filters)?.topic === initialTopicName
      ? activePracticeSession
      : null;
  }, [activePracticeSession, initialTopicName]);

  const [focusMode, setFocusMode] = useState<FocusMode>(
    () =>
      coerceFocusMode(restoredPracticeSession?.focus_mode) ??
      (initialTopicName ? "all" : "recommended"),
  );
  const [filters, setFilters] = useState<Filters>(
    () =>
      coerceFilters(restoredPracticeSession?.filters) ??
      (initialTopicName
        ? { ...defaultFilters, topic: initialTopicName }
        : defaultFilters),
  );
  const [sessionSize, setSessionSize] = useState<SessionSize>(
    () =>
      coerceSessionSize(restoredPracticeSession?.session_size) ??
      (initialGoal ? String(initialGoal) : "15"),
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
  const [favoriteState, setFavoriteState] = useState(() =>
    Object.fromEntries(
      questions.map((question) => [
        question.id,
        Boolean(question.user_question_favorites?.length),
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
  const finishingPracticeRef = useRef(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [practiceFocusActive, setPracticeFocusActive] = useState(
    () => Boolean(restoredPracticeSession || initialQuestionId || initialTopicName),
  );
  const [localSessionHydrated, setLocalSessionHydrated] = useState(false);
  const localQuestionProgress = useLocalQuestionProgress();
  const localSessionKey = useMemo(
    () => practiceSessionStorageKey(answerSource, userId),
    [answerSource, userId],
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
        favoriteState,
        filters,
        topicPriority,
      }),
    [answerState, favoriteState, filters, focusMode, orderedQuestions, topicPriority],
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
      favoriteState,
      topicPriority,
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
        .filter((item): item is PracticeQuestionRecord => Boolean(item)),
    [questionById, session.questionIds],
  );

  const selectionChanged =
    focusMode !== session.focusMode ||
    sessionSize !== session.sessionSize ||
    (focusMode === "all" && !sameFilters(filters, session.filters));

  function startNewSession() {
    // Cada resposta já está gravada; a sessão anterior só precisa ser fechada
    // para registrar o resumo — nunca é motivo para barrar o aluno.
    const closesCurrentSession = !sessionFinished && sessionSubmittedCount > 0;

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
    setPracticeFocusActive(true);
    move(0, false);

    if (!closesCurrentSession) return;
    startTransition(async () => {
      const response = await closeSessionOnServer();
      if (!response.ok) toast.error(response.message);
      router.refresh();
    });
  }

  function discardSelectionChange() {
    setFocusMode(session.focusMode);
    setSessionSize(session.sessionSize);
    setFilters(session.filters);
  }

  function enterFocusSession() {
    if (selectionChanged) {
      startNewSession();
      return;
    }
    if (!sessionQuestions.length) {
      toast.error("Nenhuma questão encontrada para esta sessão.");
      return;
    }
    setPracticeFocusActive(true);
    window.requestAnimationFrame(() => {
      questionCardRef.current?.scrollIntoView({ block: "start" });
    });
  }

  function requestSessionAdjustment() {
    if (hasUnfinishedSubmissions) {
      const confirmed = window.confirm(
        "Seu progresso fica salvo e esta sessão pode ser retomada. Ajustar filtros agora não finaliza o bloco; para encerrar definitivamente, use “Finalizar e salvar sessão”. Ajustar sessão?",
      );
      if (!confirmed) return;
    }
    setPracticeFocusActive(false);
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
  // Enunciado e alternativas não vêm no índice do acervo: chegam por aqui, para
  // a questão aberta e as vizinhas.
  const questionContentById = useQuestionContent(
    questionContentWindow(
      sessionQuestions.map((item) => item.id),
      currentIndex,
    ),
  );
  const questionContent = question ? questionContentById[question.id] : undefined;
  const accessBlocked = !access.hasPlatformAccess;
  const legacyMedia = getQuestionMedia(question);
  const associatedMedia = question?.question_media ?? [];
  const sessionStats = getPracticeSessionStats({
    questionIds: session.questionIds,
    answerState: sessionAnswerState,
  });
  const configuredSessionCount = sliceForSize(filtered, sessionSize).length;
  const answeredInSession = sessionStats.answered;
  const sessionSubmittedQuestions = sessionStats.answeredQuestionIds
    .map((questionId) => questionById.get(questionId))
    .filter((item): item is PracticeQuestionRecord => Boolean(item));
  const sessionSubmittedCount = sessionStats.answered;
  const sessionSubmittedCorrect = sessionStats.correct;
  const sessionSubmittedWrong = sessionStats.wrong;
  const hasUnfinishedSubmissions = sessionSubmittedCount > 0 && !sessionFinished;
  const sessionUsesLocalQuestions = hasLocalPracticeQuestions(session.questionIds);

  const filterOptions = useMemo(
    () => buildFilterOptions(orderedQuestions, filters),
    [filters, orderedQuestions],
  );
  // A meta do dia entra como atalho de tamanho quando não é um dos fixos.
  const sessionSizeOptions = useMemo(() => {
    const goal = initialGoal ? String(initialGoal) : null;
    const numeric =
      goal && !sessionSizePresets.includes(goal)
        ? [...sessionSizePresets, goal].sort((a, b) => Number(a) - Number(b))
        : sessionSizePresets;
    return [...numeric, allQuestionsSize];
  }, [initialGoal]);

  /* eslint-disable react-hooks/set-state-in-effect -- Restores browser-only session state after hydration. */
  useEffect(() => {
    const stored = readStoredPracticeSession(localSessionKey, answerSource);
    // Sessão guardada de outro assunto não serve para o assunto pedido na URL.
    const storedTopicMatches =
      !initialTopicName || stored?.session.filters.topic === initialTopicName;
    if (!stored || !storedTopicMatches) {
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

    if (
      stored.session.questionIds.some((questionId) => !isLocalQuestionId(questionId)) ||
      Object.keys(stored.answers).some((questionId) => !isLocalQuestionId(questionId))
    ) {
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
    Object.entries(answers).forEach(([questionId, answer]) => {
      if (!isLocalQuestionId(questionId)) return;
      recordLocalQuestionAnswer({
        questionId,
        selectedOption: answer.selectedOption,
        isCorrect: answer.isCorrect,
        responseTimeSeconds: 0,
        answeredAt: stored.updatedAt,
      });
    });
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

  // Revalidar no foco custa o acervo inteiro de novo (payload RSC de MB): sem
  // janela mínima, alternar de aba do navegador refazia a página a cada volta —
  // "focus" e "visibilitychange" ainda disparam juntos no mesmo gesto.
  useEffect(() => {
    let lastRefreshAt = Date.now();

    function revalidateFromServer() {
      const now = Date.now();
      if (now - lastRefreshAt < revalidateOnFocusIntervalMs) return;
      lastRefreshAt = now;
      router.refresh();
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
  }, [router]);

  /* eslint-disable react-hooks/set-state-in-effect -- Syncs local fallback answers into filter state after hydration. */
  useEffect(() => {
    const answers = Object.fromEntries(
      Object.values(localQuestionProgress).map((answer) => [
        answer.questionId,
        {
          selectedOption: answer.selectedOption,
          isCorrect: answer.isCorrect,
          explanation: "",
          correctOption: "",
        },
      ]),
    ) as AnswerState;
    if (!Object.keys(answers).length) return;
    setAnswerState((current) => ({ ...current, ...answers }));
  }, [localQuestionProgress]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!localSessionHydrated) return;

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
    localSessionHydrated,
    localSessionKey,
    practiceSessionId,
    session,
    sessionAnswerState,
    sessionFinished,
  ]);

  useEffect(() => {
    if (!hasUnfinishedSubmissions || sessionFinished) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue =
        "Seu progresso fica salvo e a sessão pode ser retomada depois.";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnfinishedSubmissions, sessionFinished]);

  function move(nextIndex: number, persistProgress = true) {
    const safeIndex = Math.max(0, nextIndex);
    setIndex(safeIndex);
    setSelected("");
    setResult(null);
    questionCardRef.current?.scrollIntoView({ block: "start" });
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
          favoriteState,
          filters: defaultFilters,
          topicPriority,
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
        if (isLocalQuestionId(question.id)) {
          recordLocalQuestionAnswer({
            questionId: question.id,
            selectedOption: selected,
            isCorrect: Boolean(response.isCorrect),
            responseTimeSeconds: 0,
            answeredAt: new Date().toISOString(),
            ...localAnswerTaxonomy(question),
          });
        }
        setSessionFinished(false);
        setResult({
          questionId: question.id,
          isCorrect: Boolean(response.isCorrect),
          explanation: response.explanation ?? "",
          correctOption: response.correctOption ?? "",
        });
        router.refresh();
      }
    });
  }

  function closeSessionOnServer() {
    return finishPracticeSessionAction({
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
  }

  function finishSession() {
    if (finishingPracticeRef.current) return;
    if (!sessionSubmittedCount) {
      toast.error("Responda pelo menos uma questão desta sessão antes de finalizar.");
      return;
    }

    finishingPracticeRef.current = true;
    startTransition(async () => {
      try {
        const response = await closeSessionOnServer();
        toast[response.ok ? "success" : "error"](response.message);
        if (response.ok) {
          setSessionFinished(true);
          setPracticeFocusActive(false);
          setPracticeSessionId("");
          router.refresh();
        }
      } finally {
        finishingPracticeRef.current = false;
      }
    });
  }

  function toggleFavorite() {
    if (!question) return;
    startTransition(async () => {
      const response = await toggleQuestionFavoriteAction(question.id);
      toast[response.ok ? "success" : "error"](response.message);
      if (response.ok && typeof response.favorited === "boolean") {
        setFavoriteState((current) => ({
          ...current,
          [question.id]: Boolean(response.favorited),
        }));
        router.refresh();
      }
    });
  }

  return (
    <>
      {initialTopicName && !practiceFocusActive ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3">
          <p className="text-sm font-semibold text-blue-950">
            Estudando: {initialTopicName}
            <span className="ml-2 font-normal text-blue-800">
              {initialGoal
                ? `— meta de hoje: ${initialGoal} questões deste assunto.`
                : "— questões deste assunto contam para sua meta de hoje."}
            </span>
          </p>
          <Button variant="outline" size="sm" onClick={clearTopicFocus}>
            <X className="h-4 w-4" aria-hidden="true" />
            Sair do assunto
          </Button>
        </div>
      ) : null}

      {!practiceFocusActive ? (
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
                  "min-h-11 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:min-h-0",
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
              {sessionSizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSessionSize(size)}
                  className={cn(
                    "tnum inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors sm:min-h-0 sm:min-w-0 sm:px-2.5 sm:py-1.5 sm:text-xs",
                    sessionSize === size
                      ? "border-blue-300 bg-blue-50 text-blue-900"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold text-slate-700">
              <span className="tnum">{filtered.length}</span> disponíveis
              <span className="text-slate-400"> · </span>
              <span className="tnum">{configuredSessionCount}</span> nesta sessão
            </p>
          </div>
        </div>

        {focusMode === "recommended" ? (
          <RecommendationCriteria
            questions={filtered}
            topicPriority={topicPriority}
          />
        ) : null}

        {focusMode === "all" ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
      ) : null}

      {selectionChanged && !practiceFocusActive ? (
        <div className="animate-rise mb-4 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-blue-950">
            Seleção alterada —{" "}
            <span className="tnum">
              {configuredSessionCount}
            </span>{" "}
            {configuredSessionCount === 1
              ? "questão pronta"
              : "questões prontas"}{" "}
            para a nova sessão.
          </p>
          <div className="flex flex-wrap gap-2 md:shrink-0">
            <Button variant="outline" size="sm" onClick={discardSelectionChange}>
              Voltar à sessão atual
            </Button>
            <Button
              size="sm"
              onClick={startNewSession}
              disabled={!filtered.length || pending}
            >
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Iniciar nova sessão
            </Button>
          </div>
        </div>
      ) : null}

      {!practiceFocusActive || sessionFinished ? (
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
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-950">
              {sessionFinished
                ? "Sessão finalizada"
                : hasUnfinishedSubmissions
                  ? "Sessão em andamento"
                  : "Sessão pronta para começar"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Cada resposta é salva na hora e já conta no seu desempenho.
              Esta sessão tem {sessionQuestions.length}{" "}
              {sessionQuestions.length === 1 ? "questão" : "questões"}; finalizar
              fecha o bloco e registra o resumo.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-center">
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
              <Button
                className="whitespace-nowrap"
                onClick={startNewSession}
                disabled={!filtered.length}
              >
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                Iniciar nova sessão
              </Button>
            ) : !practiceFocusActive ? (
              <Button
                className="whitespace-nowrap"
                onClick={enterFocusSession}
                disabled={!sessionQuestions.length}
              >
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                Resolver {sessionQuestions.length}{" "}
                {sessionQuestions.length === 1 ? "questão" : "questões"}
              </Button>
            ) : (
              <Button
                className="whitespace-nowrap"
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
      ) : (
        <PracticeFocusBar
          topicName={initialTopicName ?? undefined}
          currentIndex={currentIndex}
          total={sessionQuestions.length}
          answered={answeredInSession}
          correct={sessionSubmittedCorrect}
          wrong={sessionSubmittedWrong}
          canFinish={Boolean(sessionSubmittedCount) && !pending}
          onAdjust={requestSessionAdjustment}
          onFinish={finishSession}
        />
      )}

      {!practiceFocusActive ? null : !question ? (
        <EmptyState
          icon={Search}
          title="Nenhuma questão encontrada"
          description={
            focusMode === "review"
              ? "Você ainda não salvou questões como favoritas. Use o marcador na lateral de qualquer questão."
              : focusMode === "unanswered"
                ? "Você já respondeu todas as questões deste foco. Explore o banco ou revise seus erros."
                : focusMode === "recommended"
                  ? "Você já respondeu as questões recomendadas para os seus assuntos prioritários. Explore o banco para escolher outro assunto."
                  : "Nenhuma questão corresponde aos filtros escolhidos."
          }
          action={
            selectionChanged && filtered.length ? (
              <Button onClick={startNewSession}>
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                Iniciar nova sessão
              </Button>
            ) : focusMode === "recommended" ? (
              <Button variant="outline" onClick={() => changeFocus("all")}>
                Explorar banco
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
          ref={questionCardRef}
          className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]"
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
                  <ThemeBadge kind="area" name={question.subjects.area} />
                  <ThemeBadge name={question.subjects.name} />
                  <Badge tone="slate">{question.difficulty}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div key={question.id} className="animate-rise">
                {questionContent ? (
                  <p className="break-words text-base leading-7 text-slate-900 sm:text-lg sm:leading-8">
                    {questionContent.statement}
                  </p>
                ) : (
                  <QuestionStatementPlaceholder />
                )}
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
                  {!questionContent ? (
                    <QuestionOptionsPlaceholder />
                  ) : (
                    questionContent.question_options
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
                          key={option.option_key}
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
                    })
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none"
                    onClick={() => move(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none"
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
                  className="w-full sm:w-auto"
                  onClick={submitAnswer}
                  disabled={
                    !selected ||
                    !questionContent ||
                    pending ||
                    Boolean(currentResult) ||
                    accessBlocked
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
                    "mt-6 rounded-lg border p-4 sm:p-5",
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
                      "Resolução ainda não disponível para esta questão."}
                  </p>
                </div>
              ) : null}

              {currentResult && currentIndex === sessionQuestions.length - 1 ? (
                <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:p-5">
                  <p className="font-bold text-blue-950">
                    Sessão concluída — {answeredInSession} de{" "}
                    {sessionQuestions.length} respondidas
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Suas respostas já estão no histórico e no seu desempenho. As
                    questões respondidas saem da fila das não respondidas; monte
                    outra sessão quando quiser.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <aside>
            {/* key: recolhe os acordeões ao navegar entre questões. */}
            <AccordionCard key={question.id} title="Detalhes">
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
            </AccordionCard>
            <div className="mt-4 space-y-3">
              {hasWhyThisQuestion(
                question,
                topicPriority?.[question.topics.name]?.reason,
              ) ? (
                <AccordionCard key={question.id} title="Por que esta questão">
                  <WhyThisQuestion
                    question={question}
                    topicReason={topicPriority?.[question.topics.name]?.reason}
                  />
                </AccordionCard>
              ) : null}
              <QuestionExplanationCreditAction
                key={question.id}
                questionId={question.id}
                selectedOption={displayedSelected || undefined}
                disabled={accessBlocked || !currentResult}
              />
              <Button
                variant="outline"
                full
                onClick={toggleFavorite}
                disabled={pending || accessBlocked}
              >
                {favoriteState[question.id] ? (
                  <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                )}
                {favoriteState[question.id]
                  ? "Remover das favoritas"
                  : "Salvar nas favoritas"}
              </Button>
              {accessBlocked ? (
                <PremiumGate compact feature="A revisão de erros completa" />
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function PracticeFocusBar({
  topicName,
  currentIndex,
  total,
  answered,
  correct,
  wrong,
  canFinish,
  onAdjust,
  onFinish,
}: {
  topicName?: string;
  currentIndex: number;
  total: number;
  answered: number;
  correct: number;
  wrong: number;
  canFinish: boolean;
  onAdjust: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="sticky top-16 z-20 -mx-4 mb-6 flex flex-col gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 xl:-mx-8 xl:px-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="tnum rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-950">
            Questão {currentIndex + 1} de {total}
          </span>
          <span className="text-sm font-semibold text-slate-600">
            {answered}/{total} respondidas
          </span>
          {topicName ? (
            <span className="min-w-0 truncate text-sm font-medium text-slate-500">
              Estudando: {topicName}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onAdjust}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Ajustar sessão
          </Button>
          <Button size="sm" onClick={onFinish} disabled={!canFinish}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Finalizar e salvar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center sm:max-w-sm">
        <SessionMetric label="Progresso" value={`${answered}/${total}`} />
        <SessionMetric label="Acertos" value={String(correct)} />
        <SessionMetric label="Erros" value={String(wrong)} />
      </div>
    </div>
  );
}

function SessionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/70 bg-white/75 px-1.5 py-2 sm:px-3">
      <p className="tnum text-base font-bold text-slate-950">{value}</p>
      {/* Caixa alta só a partir de sm: em 320px a célula oferece ~65px e
          "PROGRESSO" em 12px mede 75px — não cabe sem furar o piso de 12px. */}
      <p className="mt-0.5 text-xs font-semibold text-slate-500 sm:uppercase sm:tracking-wide">
        {label}
      </p>
    </div>
  );
}

/**
 * O critério da recomendação fica na tela: o aluno paga para saber o que
 * estudar, então precisa ler por que aquelas questões estão na frente dele.
 */
function RecommendationCriteria({
  questions,
  topicPriority,
}: {
  questions: PracticeQuestionRecord[];
  topicPriority?: TopicPriority;
}) {
  const topicNames = Array.from(
    new Set(questions.map((question) => question.topics.name)),
  );
  // Sem prioridade calculada não há critério a declarar — melhor não afirmar
  // nada do que prometer uma curadoria que não existe.
  if (!topicNames.some((name) => Number(topicPriority?.[name]?.score) > 0)) {
    return null;
  }

  const hasPerformance = topicNames.some(
    (name) => topicPriority?.[name]?.hasPerformance,
  );

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="text-sm leading-6 text-slate-700">
        Selecionadas{" "}
        {topicNames.length === 1
          ? "em 1 assunto prioritário"
          : `nos ${topicNames.length} assuntos mais prioritários para você`}
        :{" "}
        <span className="font-semibold text-slate-900">
          {formatTopicList(topicNames)}
        </span>
        .
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        {hasPerformance
          ? "Critério: assuntos que mais caem no ENEM cruzados com a sua taxa de acerto mais baixa neles."
          : "Critério: assuntos que mais caem no ENEM e pesam mais na prova. Você ainda não tem acertos registrados — responda algumas questões e a lista passa a seguir o seu desempenho."}
      </p>
    </div>
  );
}

function formatTopicList(names: string[]) {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

// A razão do assunto vem do mesmo motor de prioridades da tela Hoje.
function hasWhyThisQuestion(question: PracticeQuestionRecord, topicReason?: string) {
  return Boolean(
    topicReason?.trim() ||
      question.priority_reason?.trim() ||
      recurrenceDisplay(question),
  );
}

function WhyThisQuestion({
  question,
  topicReason,
}: {
  question: PracticeQuestionRecord;
  topicReason?: string;
}) {
  const reason = topicReason?.trim() || question.priority_reason?.trim();
  const recurrenceLabel = recurrenceDisplay(question);

  return (
    <div>
      <p className="text-sm leading-6 text-slate-600">
        {reason ||
          "O assunto desta questão aparece com frequência nas últimas provas do ENEM."}
      </p>
      {recurrenceLabel ? (
        <p className="mt-1.5 text-sm font-semibold text-blue-800">
          {recurrenceLabel}
        </p>
      ) : null}
    </div>
  );
}

// As categorias vêm do pipeline editorial sem acentos; nunca exibir o valor cru.
function recurrenceDisplay(question: PracticeQuestionRecord) {
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
  questions: PracticeQuestionRecord[],
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
  favoriteState,
  filters,
  topicPriority,
}: {
  questions: PracticeQuestionRecord[];
  focusMode: FocusMode;
  answerState: Record<string, unknown>;
  favoriteState: Record<string, unknown>;
  filters: typeof defaultFilters;
  topicPriority?: TopicPriority;
}) {
  const selected = questions.filter((question) => {
    const answered = Boolean(answerState[question.id]);
    const favorited = Boolean(favoriteState[question.id]);

    const matchesFocus =
      focusMode === "all" ||
      (focusMode === "unanswered" && !answered) ||
      (focusMode === "review" && favorited) ||
      (focusMode === "recommended" && !answered);

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

  // "Recomendadas" é uma seleção curta dos assuntos mais prioritários do aluno —
  // não o acervo inteiro reordenado (era o que fazia o modo prometer curadoria
  // e devolver mais de mil questões).
  if (focusMode !== "recommended") return selected;
  return selectRecommendedQuestions({
    questions: selected,
    topicPriority,
  }) as PracticeQuestionRecord[];
}

function questionOrigin(question: PracticeQuestionRecord) {
  if (question.is_official) return "Oficial";
  if (question.is_authorial) return "Autoral";
  if (question.is_inspired) return "Inspirada";
  if (question.is_demo) return "Demonstrativa";
  return "Revisada";
}

function questionBoard(question: PracticeQuestionRecord) {
  if (question.is_official) {
    const examName = question.exam_name?.trim() || "ENEM";
    return examName.toLowerCase().includes("enem") ? "ENEM" : examName;
  }

  if (question.source.toLowerCase().includes("enem")) {
    return "ENEM";
  }

  return "Pontua Enem";
}

function formatQuestionSource(question: PracticeQuestionRecord) {
  const parts = [
    question.source,
    question.exam_color,
    question.question_number ? `questão ${question.question_number}` : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function formatExamDetail(question: PracticeQuestionRecord) {
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
        className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:h-10"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function getQuestionMedia(question?: PracticeQuestionRecord) {
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
  if (value === allQuestionsSize) return value;
  return value && /^\d{1,3}$/.test(value) && Number(value) > 0 ? value : null;
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
  favoriteState,
  topicPriority,
}: {
  restoredPracticeSession?: ActivePracticeSession | null;
  orderedQuestions: PracticeQuestionRecord[];
  focusMode: FocusMode;
  sessionSize: SessionSize;
  filters: Filters;
  answerState: AnswerState;
  favoriteState: Record<string, boolean>;
  topicPriority?: TopicPriority;
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
        favoriteState,
        filters,
        topicPriority,
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

function latestAnswer(question: PracticeQuestionRecord) {
  return question.user_question_answers
    ?.slice()
    .sort(
      (a, b) =>
        new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime(),
    )[0];
}

function hasLocalPracticeQuestions(questionIds: string[]) {
  return questionIds.some((questionId) => isLocalQuestionId(questionId));
}

// A chave inclui o aluno: em navegador compartilhado (irmão, laboratório da
// escola) a sessão de um não pode aparecer para o outro.
function practiceSessionStorageKey(
  source: "question_bank" | "high_priority",
  userId: string,
) {
  return `pontua-enem:practice-session:${source}:${userId || "sem-conta"}`;
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
      !coerceFilters(parsed.session.filters) ||
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
