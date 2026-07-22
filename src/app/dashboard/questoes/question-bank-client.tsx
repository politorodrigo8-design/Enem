"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  Filter,
  ImageIcon,
  ListChecks,
  Search,
  Target,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PremiumGate } from "@/components/dashboard/premium-gate";
import { QuestionExplanationCreditAction } from "@/components/dashboard/ai-credit-actions";
import {
  submitQuestionAnswerAction,
  toggleQuestionReviewAction,
} from "@/lib/actions/learning";
import type { AccessContext } from "@/lib/access";
import type { QuestionRecord } from "@/lib/db/types";

type Props = {
  questions: QuestionRecord[];
  access: AccessContext;
  answerSource?: "question_bank" | "high_priority";
  initialQuestionId?: string;
  initialTopic?: string;
};

const pageSize = 1;
const sessionSizes = ["10", "15", "20", "30", "Todas"] as const;

export function QuestionBankClient({
  questions,
  access,
  answerSource = "question_bank",
  initialQuestionId,
  initialTopic,
}: Props) {
  const router = useRouter();
  const initialTopicName =
    !initialQuestionId && initialTopic
      ? questions.find(
          (question) =>
            question.topics.id === initialTopic ||
            question.topics.name === initialTopic,
        )?.topics.name ?? "Todos"
      : "Todos";
  const [area, setArea] = useState("Todas");
  const [discipline, setDiscipline] = useState("Todas");
  const [topic, setTopic] = useState(initialTopicName);
  const [difficulty, setDifficulty] = useState("Todas");
  const [year, setYear] = useState("Todos");
  const [origin, setOrigin] = useState("Todas");
  const [board, setBoard] = useState("Todas");
  const [status, setStatus] = useState("Todas");
  const [search, setSearch] = useState("");
  const [sessionSize, setSessionSize] = useState<(typeof sessionSizes)[number]>(() =>
    answerSource === "question_bank" ? "Todas" : "15",
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<{
    questionId: string;
    isCorrect: boolean;
    explanation: string;
    correctOption: string;
  } | null>(null);
  const [answerState, setAnswerState] = useState(() =>
    Object.fromEntries(
      questions.flatMap((question) => {
        const answer = latestAnswer(question);
        // O gabarito e a resolução não vêm mais no payload; para respostas já
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
  const [filtersOpen, setFiltersOpen] = useState(answerSource === "question_bank");
  const [pending, startTransition] = useTransition();
  const orderedQuestions = useMemo(() => {
    if (!initialQuestionId) return questions;
    const selectedQuestion = questions.find((question) => question.id === initialQuestionId);
    if (!selectedQuestion) return questions;
    return [
      selectedQuestion,
      ...questions.filter((question) => question.id !== initialQuestionId),
    ];
  }, [initialQuestionId, questions]);

  const questionsByArea = useMemo(
    () =>
      area === "Todas"
        ? orderedQuestions
        : orderedQuestions.filter((question) => question.subjects.area === area),
    [area, orderedQuestions],
  );
  const questionsByDiscipline = useMemo(
    () =>
      discipline === "Todas"
        ? questionsByArea
        : questionsByArea.filter((question) => question.subjects.name === discipline),
    [discipline, questionsByArea],
  );
  const areas = useMemo(
    () => uniqueOptions("Todas", orderedQuestions.map((q) => q.subjects.area)),
    [orderedQuestions],
  );
  const disciplines = useMemo(
    () => uniqueOptions("Todas", questionsByArea.map((q) => q.subjects.name)),
    [questionsByArea],
  );
  const topics = useMemo(
    () => uniqueOptions("Todos", questionsByDiscipline.map((q) => q.topics.name)),
    [questionsByDiscipline],
  );
  const years = useMemo(
    () => [
      "Todos",
      ...Array.from(new Set(orderedQuestions.map((q) => String(q.year)))).sort(
        (a, b) => Number(b) - Number(a),
      ),
    ],
    [orderedQuestions],
  );
  const origins = useMemo(
    () => uniqueOptions("Todas", orderedQuestions.map((q) => questionOrigin(q))),
    [orderedQuestions],
  );
  const boards = useMemo(
    () => uniqueOptions("Todas", orderedQuestions.map((q) => questionBoard(q))),
    [orderedQuestions],
  );

  const filtered = useMemo(() => {
    return orderedQuestions.filter((question) => {
      const answered = Boolean(answerState[question.id]);
      const reviewed = Boolean(reviewState[question.id]);
      const matchesStatus =
        status === "Todas" ||
        (status === "Respondida" && answered) ||
        (status === "Não respondida" && !answered);
      const matchesSearch =
        !search ||
        [
          question.statement,
          question.topics.name,
          question.subjects.name,
          question.subjects.area,
          question.source,
          question.exam_name,
          question.exam_color,
          question.official_source,
          question.question_number ? `questao ${question.question_number}` : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());

      return (
        (area === "Todas" || question.subjects.area === area) &&
        (discipline === "Todas" || question.subjects.name === discipline) &&
        (topic === "Todos" || question.topics.name === topic) &&
        (difficulty === "Todas" || question.difficulty === difficulty) &&
        (year === "Todos" || String(question.year) === year) &&
        (origin === "Todas" || questionOrigin(question) === origin) &&
        (board === "Todas" || questionBoard(question) === board) &&
        (status === "Favoritas" ? reviewed : matchesStatus) &&
        matchesSearch
      );
    });
  }, [answerState, area, board, difficulty, discipline, orderedQuestions, origin, reviewState, search, status, topic, year]);

  const sessionQuestions = useMemo(() => {
    if (sessionSize === "Todas") return filtered;
    return filtered.slice(0, Number(sessionSize));
  }, [filtered, sessionSize]);
  const currentIndex = Math.min(index, Math.max(sessionQuestions.length - 1, 0));
  const question = sessionQuestions[currentIndex];
  const totalPages = Math.max(1, Math.ceil(sessionQuestions.length / pageSize));
  const persistedResult = question ? answerState[question.id] : undefined;
  const currentResult =
    result?.questionId === question?.id
      ? result
      : question && persistedResult
        ? {
            questionId: question.id,
            isCorrect: persistedResult.isCorrect,
            explanation: persistedResult.explanation,
            correctOption: persistedResult.correctOption,
          }
        : null;
  const knownCorrectOption = Boolean(currentResult?.correctOption);
  const displayedSelected =
    selected || (question ? answerState[question.id]?.selectedOption ?? "" : "");
  const accessBlocked = !access.hasPlatformAccess;
  const legacyMedia = getQuestionMedia(question);
  const associatedMedia = question?.question_media ?? [];

  function move(nextIndex: number) {
    setIndex(nextIndex);
    setSelected("");
    setResult(null);
  }

  function submitAnswer() {
    if (!question || !selected) return;

    startTransition(async () => {
      const response = await submitQuestionAnswerAction({
        questionId: question.id,
        selectedOption: selected,
        responseTimeSeconds: 0,
        source: answerSource,
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
        setResult({
          questionId: question.id,
          isCorrect: Boolean(response.isCorrect),
          explanation: response.explanation ?? "",
          correctOption: response.correctOption ?? "",
        });
      }
    });
  }

  function resetFilters() {
    setArea("Todas");
    setDiscipline("Todas");
    setTopic("Todos");
    setDifficulty("Todas");
    setYear("Todos");
    setOrigin("Todas");
    setBoard("Todas");
    setStatus("Todas");
    setSearch("");
    move(0);
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
      {answerSource === "high_priority" ? (
        <PriorityExplanation questions={questions} />
      ) : null}

      <details
        className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/5"
        open={filtersOpen}
        onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Filtros e sessão
          </span>
          <span className="text-xs font-medium text-slate-500">
            {sessionQuestions.length} na sessão - {filtered.length} no filtro
          </span>
        </summary>
        <div className="border-t border-slate-100 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Select label="Área" value={area} options={areas} onChange={(value) => { setArea(value); setDiscipline("Todas"); setTopic("Todos"); move(0); }} />
            <Select label="Disciplina" value={discipline} options={disciplines} onChange={(value) => { setDiscipline(value); setTopic("Todos"); move(0); }} />
            <Select label="Tópico" value={topic} options={topics} onChange={(value) => { setTopic(value); move(0); }} />
            <Select label="Dificuldade" value={difficulty} options={["Todas", "Baixa", "Média", "Alta"]} onChange={(value) => { setDifficulty(value); move(0); }} />
            <Select label="Ano" value={year} options={years} onChange={(value) => { setYear(value); move(0); }} />
            <Select label="Origem" value={origin} options={origins} onChange={(value) => { setOrigin(value); move(0); }} />
            <Select label="Banca/fonte" value={board} options={boards} onChange={(value) => { setBoard(value); move(0); }} />
            <Select label="Status" value={status} options={["Todas", "Respondida", "Não respondida", "Favoritas"]} onChange={(value) => { setStatus(value); move(0); }} />
            <Select
              label="Tamanho da sessão"
              value={sessionSize}
              options={[...sessionSizes]}
              onChange={(value) => {
                setSessionSize(value as (typeof sessionSizes)[number]);
                move(0);
              }}
            />
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Busca
              </span>
              <div className="mt-1.5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 hover:border-slate-300">
                <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    move(0);
                  }}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  placeholder="Buscar enunciado, tópico, fonte, ano ou número"
                />
              </div>
            </label>
          </div>
        </div>
      </details>

      {!question ? (
        <EmptyState
          icon={Search}
          title="Nenhuma questão encontrada"
          description="Nenhuma questão corresponde aos filtros escolhidos. Limpe os filtros para voltar a ver todas as questões."
          action={
            <Button variant="outline" onClick={resetFilters}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
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
                  <Badge tone="slate">{questionBoard(question)}</Badge>
                  <Badge tone="slate">{question.year}</Badge>
                  <Badge tone="blue">{question.subjects.area}</Badge>
                  <Badge tone="blue">{question.topics.name}</Badge>
                  <Badge tone="slate">{question.difficulty}</Badge>
                  <Badge tone={priorityBadgeTone(question)}>
                    {priorityDisplay(question)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div key={question.id} className="animate-rise">
              <p className="text-lg leading-8 text-slate-900">{question.statement}</p>
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
                              {media.source_page ? `, página ${media.source_page}` : ""}.
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
                  <ImageIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <p>
                    Esta questão depende de uma imagem que ainda está em revisão
                    editorial. Assim que a mídia for verificada, ela aparecerá
                    aqui completa.
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
                      currentResult && knownCorrectOption &&
                      currentResult.correctOption === option.option_key;
                    const isWrong =
                      currentResult && knownCorrectOption && isSelected &&
                      currentResult.correctOption !== option.option_key;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => !currentResult && setSelected(option.option_key)}
                        className={`flex w-full items-start gap-3 rounded-lg border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50"
                            : isWrong
                              ? "border-rose-300 bg-rose-50"
                              : isSelected
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
                    onClick={() => move(Math.min(sessionQuestions.length - 1, currentIndex + 1))}
                    disabled={currentIndex === sessionQuestions.length - 1}
                  >
                    Próxima
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <Button
                  onClick={submitAnswer}
                  disabled={!selected || pending || Boolean(currentResult) || accessBlocked}
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
                  className={`mt-6 rounded-lg border p-5 ${
                    currentResult.isCorrect
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {currentResult.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-700" />
                    )}
                    <p className="font-bold text-slate-950">
                      {currentResult.isCorrect ? "Resposta correta" : "Resposta incorreta"}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {currentResult.explanation ||
                      "A explicação completa aparece depois de uma nova tentativa nesta sessão."}
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
                  <Detail label="Tópico" value={question.topics.name} />
                  <Detail label="Dificuldade" value={question.difficulty} />
                  <Detail label="Origem" value={questionOrigin(question)} />
                  <Detail label="Banca/fonte" value={questionBoard(question)} />
                  <Detail label="Prova" value={formatExamDetail(question)} />
                  <Detail label="Fonte" value={question.source} />
                  <Detail
                    label="Histórico"
                    value={`${Math.max(question.user_question_answers?.length ?? 0, answerState[question.id] ? 1 : 0)} resposta(s)`}
                  />
                  <Detail
                    label="Resultados"
                    value={`${sessionQuestions.length} na sessão (${filtered.length} no filtro, página ${currentIndex + 1} de ${totalPages})`}
                  />
                </dl>
                <PriorityDetails question={question} />
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
                  {reviewState[question.id] ? "Remover da revisão" : "Adicionar à revisão"}
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

function PriorityExplanation({ questions }: { questions: QuestionRecord[] }) {
  const withReason = questions.filter((question) => question.priority_reason).length;
  const topTopics = uniqueOptions(
    "",
    questions.map((question) => question.topics.name).filter(Boolean),
  )
    .filter(Boolean)
    .slice(0, 3);

  return (
    <section className="mb-6 rounded-lg border border-blue-100 bg-blue-50/70 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-blue-950">
            <Target className="h-4 w-4 text-blue-700" aria-hidden="true" />
            Por que essas {questions.length} questões são prioritárias?
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
            Elas combinam recorrência histórica do assunto, prioridade editorial
            e sinais do seu desempenho. Quando ainda falta dado pessoal, o app usa
            questões demonstrativas ou revisadas como ponto de partida.
          </p>
        </div>
        {topTopics.length ? (
          <div className="flex flex-wrap gap-2">
            {topTopics.map((topic) => (
              <Badge key={topic} tone="blue">
                {topic}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <PriorityMetric
          icon={ListChecks}
          label="Prontas"
          value={questions.length}
          helper="aptas para treino nesta fila"
        />
        <PriorityMetric
          icon={Target}
          label="Com motivo"
          value={withReason}
          helper="prioridade editorial registrada"
        />
        <PriorityMetric
          icon={Search}
          label="Assuntos"
          value={topTopics.length}
          helper="tópicos cobertos nesta fila"
        />
      </div>
    </section>
  );
}

function PriorityMetric({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-inset ring-blue-100">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <Icon className="h-4 w-4 text-blue-700" aria-hidden="true" />
      </div>
      <p className="tnum mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-0.5 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

function PriorityDetails({ question }: { question: QuestionRecord }) {
  const reason = question.priority_reason?.trim();

  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Prioridade
          </p>
          <p className="mt-1 text-sm font-bold text-slate-950">
            {priorityDisplay(question)}
          </p>
        </div>
        <span className="tnum rounded-md bg-white px-2 py-1 text-xs font-bold text-blue-800 ring-1 ring-inset ring-blue-100">
          {Math.round(Number(question.priority_score ?? 0))}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        {reason ||
          "Priorização baseada na recorrência do assunto e no peso estratégico do tema."}
      </p>
      {question.content_recurrence ? (
        <p className="mt-2 text-xs font-semibold text-blue-800">
          {question.content_recurrence}
        </p>
      ) : null}
    </div>
  );
}

function uniqueOptions(first: string, values: string[]) {
  return [first, ...Array.from(new Set(values.filter(Boolean)))];
}

function priorityDisplay(question: QuestionRecord) {
  if (
    question.recurrence_category ===
    "Potencial muito alto de recorrencia do conteudo"
  ) {
    return "Prioridade máxima";
  }

  if (question.recurrence_category === "Alta prioridade") {
    return "Prioridade alta";
  }

  if (question.recurrence_category === "Prioridade media") {
    return "Prioridade média";
  }

  if (Number(question.priority_score ?? 0) >= 70) {
    return "Prioridade alta";
  }

  return "Prioridade complementar";
}

function priorityBadgeTone(question: QuestionRecord): "blue" | "amber" | "slate" {
  const label = priorityDisplay(question);
  if (label.includes("máxima")) return "amber";
  if (label.includes("alta")) return "blue";
  return "slate";
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
    return examName.toLowerCase().includes("enem") ? "ENEM/Inep" : examName;
  }

  if (question.source.toLowerCase().includes("enem")) {
    return "ENEM/Inep";
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

function latestAnswer(question: QuestionRecord) {
  return question.user_question_answers
    ?.slice()
    .sort(
      (a, b) =>
        new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime(),
    )[0];
}
