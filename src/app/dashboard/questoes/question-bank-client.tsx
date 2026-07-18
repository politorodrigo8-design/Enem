"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  Filter,
  ImageIcon,
  Search,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PremiumGate } from "@/components/dashboard/premium-gate";
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
};

const pageSize = 1;

export function QuestionBankClient({
  questions,
  access,
  answerSource = "question_bank",
}: Props) {
  const router = useRouter();
  const [area, setArea] = useState("Todas");
  const [discipline, setDiscipline] = useState("Todas");
  const [topic, setTopic] = useState("Todos");
  const [difficulty, setDifficulty] = useState("Todas");
  const [year, setYear] = useState("Todos");
  const [status, setStatus] = useState("Todas");
  const [search, setSearch] = useState("");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<{
    questionId: string;
    isCorrect: boolean;
    explanation: string;
  } | null>(null);
  const [answerState, setAnswerState] = useState(() =>
    Object.fromEntries(
      questions.flatMap((question) => {
        const answer = latestAnswer(question);
        return answer
          ? [
              [
                question.id,
                {
                  selectedOption: answer.selected_option,
                  isCorrect: answer.is_correct,
                  explanation: question.explanation,
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
  const [pending, startTransition] = useTransition();

  const areas = useMemo(
    () => ["Todas", ...Array.from(new Set(questions.map((q) => q.subjects.area)))],
    [questions],
  );
  const disciplines = useMemo(
    () => ["Todas", ...Array.from(new Set(questions.map((q) => q.subjects.name)))],
    [questions],
  );
  const topics = useMemo(
    () => ["Todos", ...Array.from(new Set(questions.map((q) => q.topics.name)))],
    [questions],
  );
  const years = useMemo(
    () => ["Todos", ...Array.from(new Set(questions.map((q) => String(q.year))))],
    [questions],
  );

  const filtered = useMemo(() => {
    return questions.filter((question) => {
      const answered = Boolean(answerState[question.id]);
      const reviewed = Boolean(reviewState[question.id]);
      const matchesStatus =
        status === "Todas" ||
        (status === "Respondida" && answered) ||
        (status === "Não respondida" && !answered);
      const matchesSearch =
        !search ||
        question.statement.toLowerCase().includes(search.toLowerCase()) ||
        question.topics.name.toLowerCase().includes(search.toLowerCase());

      return (
        (area === "Todas" || question.subjects.area === area) &&
        (discipline === "Todas" || question.subjects.name === discipline) &&
        (topic === "Todos" || question.topics.name === topic) &&
        (difficulty === "Todas" || question.difficulty === difficulty) &&
        (year === "Todos" || String(question.year) === year) &&
        (status === "Favoritas" ? reviewed : matchesStatus) &&
        matchesSearch
      );
    });
  }, [answerState, area, difficulty, discipline, questions, reviewState, search, status, topic, year]);

  const currentIndex = Math.min(index, Math.max(filtered.length - 1, 0));
  const question = filtered[currentIndex];
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const persistedResult = question ? answerState[question.id] : undefined;
  const currentResult =
    result?.questionId === question?.id
      ? result
      : question && persistedResult
        ? {
            questionId: question.id,
            isCorrect: persistedResult.isCorrect,
            explanation: persistedResult.explanation,
          }
        : null;
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
            explanation: response.explanation ?? question.explanation,
          },
        }));
        setResult({
          questionId: question.id,
          isCorrect: Boolean(response.isCorrect),
          explanation: response.explanation ?? question.explanation,
        });
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
      <Card className="mb-6">
        <CardContent>
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Filter className="h-4 w-4 text-blue-700" aria-hidden="true" />
            Filtros
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Select label="Área" value={area} options={areas} onChange={(value) => { setArea(value); move(0); }} />
            <Select label="Disciplina" value={discipline} options={disciplines} onChange={(value) => { setDiscipline(value); move(0); }} />
            <Select label="Tópico" value={topic} options={topics} onChange={(value) => { setTopic(value); move(0); }} />
            <Select label="Dificuldade" value={difficulty} options={["Todas", "Baixa", "Média", "Alta"]} onChange={(value) => { setDifficulty(value); move(0); }} />
            <Select label="Ano" value={year} options={years} onChange={(value) => { setYear(value); move(0); }} />
            <Select label="Status" value={status} options={["Todas", "Respondida", "Não respondida", "Favoritas"]} onChange={(value) => { setStatus(value); move(0); }} />
            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Busca</span>
              <div className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-400">
                <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    move(0);
                  }}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  placeholder="Buscar no enunciado ou tópico"
                />
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {!question ? (
        <EmptyState
          icon={Search}
          title="Nenhuma questão encontrada"
          description="Ajuste os filtros para continuar treinando."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>
                    Questão {currentIndex + 1} de {filtered.length}
                  </CardTitle>
                  <p className="mt-2 text-sm text-slate-500">{question.source}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="blue">{question.subjects.area}</Badge>
                  <Badge tone="violet">{question.topics.name}</Badge>
                  <Badge tone="slate">{question.difficulty}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                          alt={media.alt_text || "Midia da questao"}
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
                              {media.source_page ? `, pagina ${media.source_page}` : ""}.
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
                    Esta questao depende de midia, mas nenhuma imagem verificada
                    esta associada no banco. Ela deve permanecer fora da
                    importacao aprovada ate a revisao editorial concluir a midia.
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
                      currentResult && question.correct_option === option.option_key;
                    const isWrong =
                      currentResult && isSelected && question.correct_option !== option.option_key;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => !currentResult && setSelected(option.option_key)}
                        className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition ${
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50"
                            : isWrong
                              ? "border-rose-300 bg-rose-50"
                              : isSelected
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
                    );
                  })}
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
                    onClick={() => move(Math.min(filtered.length - 1, currentIndex + 1))}
                    disabled={currentIndex === filtered.length - 1}
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
                    {currentResult.explanation}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Detail label="Disciplina" value={question.subjects.name} />
                <Detail label="Tópico" value={question.topics.name} />
                <Detail label="Dificuldade" value={question.difficulty} />
                <Detail label="Origem" value={question.source} />
                <Detail
                  label="Histórico"
                  value={`${Math.max(question.user_question_answers?.length ?? 0, answerState[question.id] ? 1 : 0)} resposta(s)`}
                />
                <Button
                  variant="outline"
                  full
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
                  <PremiumGate compact feature="A revisão de erros completa" />
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm font-bold text-slate-950">Paginação</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Página {currentIndex + 1} de {totalPages}. {filtered.length} questões
                  encontradas.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </>
  );
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
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400"
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
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{value}</p>
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
    alt: question.media_alt || "Midia da questao",
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
