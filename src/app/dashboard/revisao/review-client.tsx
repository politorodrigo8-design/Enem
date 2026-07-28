"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ImageIcon,
  PlayCircle,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { QuestionExplanationCreditAction } from "@/components/dashboard/ai-credit-actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { markReviewMasteredAction, submitQuestionAnswerAction } from "@/lib/actions/learning";
import type { QuestionRecord } from "@/lib/db/types";
import {
  isLocalQuestionId,
  recordLocalQuestionAnswer,
} from "@/lib/local-question-progress";
import { cn } from "@/lib/utils";

type ReviewFilter = "Para refazer" | "Acertadas" | "Marcadas";
type RetryResult = {
  selectedOption: string;
  isCorrect: boolean;
  explanation: string;
  correctOption: string;
};

const retryResetDelayMs = 4500;

const filters: ReviewFilter[] = ["Para refazer", "Acertadas", "Marcadas"];

/** Entra no histórico o que já foi respondido ou marcado para voltar depois. */
export function hasReviewHistory(question: QuestionRecord) {
  return Boolean(question.user_question_answers?.length) || isMarked(question);
}

export function ReviewClient({ questions }: { questions: QuestionRecord[] }) {
  const [filter, setFilter] = useState<ReviewFilter>("Para refazer");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, RetryResult>>({});
  const [index, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  // Em coluna única os botões de navegação ficam no fim do card: sem reposicionar
  // o scroll o aluno cairia no meio da questão seguinte.
  const questionCardRef = useRef<HTMLDivElement>(null);

  const history = useMemo(() => questions.filter(hasReviewHistory), [questions]);
  const filterCounts = useMemo(
    () => ({
      "Para refazer": history.filter((question) => matchesFilter(question, "Para refazer"))
        .length,
      Acertadas: history.filter((question) => matchesFilter(question, "Acertadas")).length,
      Marcadas: history.filter((question) => matchesFilter(question, "Marcadas")).length,
    }),
    [history],
  );

  // A fila é um retrato congelado no momento em que o filtro é escolhido:
  // responder aqui muda o histórico, e uma fila viva faria a questão atual
  // desaparecer debaixo do aluno antes de ele ler a correção.
  const [queueIds, setQueueIds] = useState<string[]>(() =>
    history
      .filter((question) => matchesFilter(question, "Para refazer"))
      .map((question) => question.id),
  );
  const questionById = useMemo(
    () => new Map(history.map((question) => [question.id, question])),
    [history],
  );
  const queue = useMemo(
    () =>
      queueIds
        .map((id) => questionById.get(id))
        .filter((item): item is QuestionRecord => Boolean(item)),
    [questionById, queueIds],
  );

  const currentIndex = Math.min(index, Math.max(queue.length - 1, 0));
  const question = queue[currentIndex];
  const result = question ? results[question.id] : undefined;
  const selectedOption = question ? selectedAnswers[question.id] ?? "" : "";

  function changeFilter(next: ReviewFilter) {
    setFilter(next);
    setQueueIds(
      history
        .filter((item) => matchesFilter(item, next))
        .map((item) => item.id),
    );
    setIndex(0);
  }

  function move(nextIndex: number) {
    setIndex(Math.max(0, Math.min(queue.length - 1, nextIndex)));
    questionCardRef.current?.scrollIntoView({ block: "start" });
  }

  function retry() {
    if (!question || !selectedOption) return;
    const target = question;

    startTransition(async () => {
      const response = await submitQuestionAnswerAction({
        questionId: target.id,
        selectedOption,
        responseTimeSeconds: 0,
        source: "review",
      });
      toast[response.ok ? "success" : "error"](response.message);
      if (!response.ok) return;

      const retryResult = {
        selectedOption,
        isCorrect: Boolean(response.isCorrect),
        explanation: response.explanation ?? "",
        correctOption: response.correctOption ?? "",
      };
      setResults((current) => ({ ...current, [target.id]: retryResult }));

      if (isLocalQuestionId(target.id)) {
        recordLocalQuestionAnswer({
          questionId: target.id,
          selectedOption,
          isCorrect: retryResult.isCorrect,
          responseTimeSeconds: 0,
          answeredAt: new Date().toISOString(),
        });
      }

      if (retryResult.isCorrect) {
        if (isLocalQuestionId(target.id) || !isMarked(target)) return;
        const mastered = await markReviewMasteredAction(target.id);
        if (!mastered.ok) toast.error(mastered.message);
        return;
      }

      window.setTimeout(() => {
        setResults((current) => {
          const next = { ...current };
          delete next[target.id];
          return next;
        });
        setSelectedAnswers((current) => {
          const next = { ...current };
          delete next[target.id];
          return next;
        });
      }, retryResetDelayMs);
    });
  }

  if (!history.length) {
    return (
      <EmptyState
        icon={Search}
        title="Nada por aqui ainda"
        description="Suas questões respondidas, os erros e as marcadas aparecem aqui depois dos treinos."
        action={
          <Link
            href="/dashboard/praticar?tab=banco"
            className={buttonClasses({ variant: "primary" })}
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            Treinar questões
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="border-b border-slate-200">
        <div className="-mb-px inline-flex max-w-full flex-col items-start border-b-2 border-blue-700 px-3 py-3 text-left">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-blue-950">
            Já respondidas
            <span className="tnum rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-800">
              {history.length}
            </span>
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Tudo que você já respondeu ou marcou no treino, uma questão por vez.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar questões">
        {filters.map((option) => {
          const active = filter === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => changeFilter(option)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:min-h-0",
                active
                  ? "bg-blue-50 text-blue-900 ring-1 ring-inset ring-blue-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {option}
              <span className="tnum text-xs font-semibold text-slate-400">
                {filterCounts[option]}
              </span>
            </button>
          );
        })}
      </div>

      {filter === "Para refazer" ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Reúne o que você errou e o que marcou para voltar depois.
        </p>
      ) : null}

      {!question ? (
        <div className="mt-6">
          <EmptyState
            icon={Search}
            title="Nada neste filtro"
            description={
              filter === "Para refazer"
                ? "Você não tem questões erradas nem marcadas esperando por você."
                : filter === "Acertadas"
                  ? "Você ainda não acertou nenhuma questão no treino."
                  : "Você ainda não marcou questões para voltar depois."
            }
            action={
              <Button
                variant="outline"
                onClick={() =>
                  changeFilter(filter === "Acertadas" ? "Para refazer" : "Acertadas")
                }
              >
                {filter === "Acertadas" ? "Ver para refazer" : "Ver acertadas"}
              </Button>
            }
          />
        </div>
      ) : (
        <div ref={questionCardRef} className="mt-6">
          <QuestionReviewCard
            key={question.id}
            question={question}
            position={currentIndex + 1}
            total={queue.length}
            pending={pending}
            selectedOption={selectedOption}
            result={result}
            onSelect={(option) =>
              setSelectedAnswers((current) => ({
                ...current,
                [question.id]: option,
              }))
            }
            onRetry={retry}
            onPrevious={() => move(currentIndex - 1)}
            onNext={() => move(currentIndex + 1)}
          />
        </div>
      )}
    </div>
  );
}

function QuestionReviewCard({
  question,
  position,
  total,
  pending,
  selectedOption,
  result,
  onSelect,
  onRetry,
  onPrevious,
  onNext,
}: {
  question: QuestionRecord;
  position: number;
  total: number;
  pending: boolean;
  selectedOption: string;
  result?: RetryResult;
  onSelect: (option: string) => void;
  onRetry: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const latest = latestAnswer(question);
  const displayedSelected =
    selectedOption || result?.selectedOption || latest?.selected_option || "";
  const knownCorrectOption = Boolean(result?.correctOption);
  const legacyMedia = getQuestionMedia(question);
  const associatedMedia = question.question_media ?? [];
  const answerCount = question.user_question_answers?.length ?? 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <CardTitle>
                Questão {position} de {total}
              </CardTitle>
              <p className="mt-2 break-words text-sm text-slate-500">
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
              {isMarked(question) ? <Badge tone="amber">Marcada</Badge> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-rise min-w-0">
            <p className="break-words text-base leading-7 text-slate-900">
              {question.statement}
            </p>
            {associatedMedia.length ? (
              <div className="mt-5 space-y-4">
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
                        className="max-h-[460px] w-full object-contain"
                      />
                      <figcaption className="border-t border-slate-200 px-4 py-3 text-xs leading-5 text-slate-600">
                        {media.caption || media.media_type}
                      </figcaption>
                    </figure>
                  ))}
              </div>
            ) : legacyMedia ? (
              <figure className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
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
              <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <ImageIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p>Esta questão depende de uma imagem que ainda está em revisão editorial.</p>
              </div>
            ) : null}

            <div className="mt-5 grid gap-2.5">
              {question.question_options
                .slice()
                .sort((a, b) => a.option_key.localeCompare(b.option_key))
                .map((option) => {
                  const isSelected = displayedSelected === option.option_key;
                  const isCorrect =
                    result && knownCorrectOption && result.correctOption === option.option_key;
                  const isWrong =
                    result &&
                    knownCorrectOption &&
                    isSelected &&
                    result.correctOption !== option.option_key;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => !result && onSelect(option.option_key)}
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

            <p className="mt-5 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">
              {latest ? (
                <span>
                  Última resposta:{" "}
                  <strong className={latest.is_correct ? "text-emerald-700" : "text-rose-700"}>
                    {latest.is_correct ? "correta" : "incorreta"}
                  </strong>
                  {latest.selected_option ? `, alternativa ${latest.selected_option}` : ""}.
                </span>
              ) : (
                <span>Você marcou esta questão e ainda não respondeu.</span>
              )}
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={onPrevious}
                  disabled={position === 1}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={onNext}
                  disabled={position === total}
                >
                  Próxima
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <Button
                className="w-full sm:w-auto"
                onClick={onRetry}
                disabled={!selectedOption || pending || Boolean(result)}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Responder de novo
              </Button>
            </div>

            {result ? (
              <div
                className={cn(
                  "mt-5 rounded-lg border p-4",
                  result.isCorrect
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50",
                )}
              >
                <div className="flex items-center gap-2">
                  {result.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-700" aria-hidden="true" />
                  )}
                  <p className="text-sm font-bold text-slate-950">
                    {result.isCorrect ? "Você acertou agora" : "Você errou esta tentativa"}
                  </p>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  Gabarito: alternativa {result.correctOption || "não informado"}.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {result.explanation ||
                    "A explicação completa pode ser gerada pela IA depois da tentativa."}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {result.isCorrect
                    ? "Esta questão sai da lista para refazer e fica entre as acertadas."
                    : "A questão continua na lista e a tentativa libera de novo em alguns segundos."}
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <aside>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Detalhes
          </p>
          <dl className="mt-2 divide-y divide-slate-200">
            <Detail label="Disciplina" value={question.subjects.name} />
            <Detail label="Assunto" value={question.topics.name} />
            <Detail label="Prova" value={formatExamDetail(question)} />
            <Detail label="Respostas" value={`${answerCount} registro(s)`} />
          </dl>
          <QuestionExplanationCreditAction
            questionId={question.id}
            selectedOption={displayedSelected || undefined}
            disabled={!result}
          />
        </div>
      </aside>
    </div>
  );
}

function matchesFilter(question: QuestionRecord, filter: ReviewFilter) {
  if (filter === "Marcadas") return isMarked(question);
  const latest = latestAnswer(question);
  if (filter === "Acertadas") return Boolean(latest?.is_correct);
  // "Para refazer" junta o que foi errado com o que o aluno marcou.
  return isMarked(question) || (Boolean(latest) && !latest?.is_correct);
}

function isMarked(question: QuestionRecord) {
  return Boolean(question.user_question_reviews?.some((review) => !review.mastered));
}

function latestAnswer(question: QuestionRecord) {
  return question.user_question_answers
    ?.slice()
    .sort(
      (a, b) =>
        new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime(),
    )[0];
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
