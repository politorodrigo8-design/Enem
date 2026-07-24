"use client";

import {
  CheckCircle2,
  History,
  ImageIcon,
  ListChecks,
  PlayCircle,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { QuestionExplanationCreditAction } from "@/components/dashboard/ai-credit-actions";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { markReviewMasteredAction, submitQuestionAnswerAction } from "@/lib/actions/learning";
import type { QuestionRecord } from "@/lib/db/types";
import {
  isLocalQuestionId,
  recordLocalQuestionAnswer,
  removeLocalQuestionAnswer,
} from "@/lib/local-question-progress";
import { cn } from "@/lib/utils";

type ReviewTab = "errors" | "answered";
type ReviewFilter = "Todas" | "Erradas" | "Acertadas" | "Marcadas";
type RetryResult = {
  selectedOption: string;
  isCorrect: boolean;
  explanation: string;
  correctOption: string;
};

const tabs: Array<{ id: ReviewTab; label: string; description: string }> = [
  {
    id: "errors",
    label: "Revisão de erros",
    description: "Refaça, confira o resultado e só então marque como dominada.",
  },
  {
    id: "answered",
    label: "Já respondidas",
    description: "Histórico das questões que você já resolveu no treino.",
  },
];

const filters: ReviewFilter[] = ["Todas", "Erradas", "Acertadas", "Marcadas"];

export function ReviewClient({
  reviewQuestions,
  answeredQuestions,
}: {
  reviewQuestions: QuestionRecord[];
  answeredQuestions: QuestionRecord[];
}) {
  const [tab, setTab] = useState<ReviewTab>("errors");
  const [filter, setFilter] = useState<ReviewFilter>("Todas");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, RetryResult>>({});
  const [masteredQuestionIds, setMasteredQuestionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pending, startTransition] = useTransition();

  const activeReviewQuestions = useMemo(
    () => reviewQuestions.filter((question) => !masteredQuestionIds.has(question.id)),
    [masteredQuestionIds, reviewQuestions],
  );
  const answered = useMemo(() => uniqueQuestions(answeredQuestions), [answeredQuestions]);
  const sourceQuestions = tab === "errors" ? activeReviewQuestions : answered;
  const filtered = useMemo(
    () => sourceQuestions.filter((question) => matchesFilter(question, filter, results)),
    [filter, results, sourceQuestions],
  );

  const wrongCount = activeReviewQuestions.filter(hasWrongHistory).length;
  const answeredCorrectCount = answered.filter((question) => latestAnswer(question)?.is_correct)
    .length;

  if (!reviewQuestions.length && !answered.length) {
    return (
      <EmptyState
        icon={Search}
        title="Nada para revisar"
        description="Erros, favoritas e questões já respondidas aparecem aqui depois dos treinos."
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

  const tabCounts: Record<ReviewTab, number> = {
    errors: activeReviewQuestions.length,
    answered: answered.length,
  };
  const filterCounts = buildFilterCounts(sourceQuestions, results);

  function retry(question: QuestionRecord) {
    const selected = selectedAnswers[question.id];
    if (!selected) return;

    startTransition(async () => {
      const result = await submitQuestionAnswerAction({
        questionId: question.id,
        selectedOption: selected,
        responseTimeSeconds: 0,
        source: "review",
      });
      toast[result.ok ? "success" : "error"](result.message);
      if (!result.ok) return;

      const retryResult = {
        selectedOption: selected,
        isCorrect: Boolean(result.isCorrect),
        explanation: result.explanation ?? "",
        correctOption: result.correctOption ?? "",
      };
      setResults((current) => ({ ...current, [question.id]: retryResult }));

      if (isLocalQuestionId(question.id)) {
        recordLocalQuestionAnswer({
          questionId: question.id,
          selectedOption: selected,
          isCorrect: retryResult.isCorrect,
          responseTimeSeconds: 0,
          answeredAt: new Date().toISOString(),
        });
      }
    });
  }

  function markMastered(question: QuestionRecord) {
    if (!canMarkMastered(question, results[question.id])) {
      toast.error("Refaça e acerte a questão antes de tirar da revisão.");
      return;
    }

    if (isLocalQuestionId(question.id)) {
      removeLocalQuestionAnswer(question.id);
      setMasteredQuestionIds((current) => new Set(current).add(question.id));
      toast.success("Questão removida da revisão local.");
      return;
    }

    startTransition(async () => {
      const result = await markReviewMasteredAction(question.id);
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        setMasteredQuestionIds((current) => new Set(current).add(question.id));
      }
    });
  }

  return (
    <div>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Na revisão"
          value={String(activeReviewQuestions.length)}
          helper="erros e favoritas pendentes"
          icon={ListChecks}
        />
        <StatCard
          label="Erradas"
          value={String(wrongCount)}
          helper="com erro no histórico"
          icon={XCircle}
        />
        <StatCard
          label="Já respondidas"
          value={String(answered.length)}
          helper={`${answeredCorrectCount} com última resposta correta`}
          icon={History}
        />
      </section>

      <div className="mt-6 border-b border-slate-200" role="tablist" aria-label="Revisão">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => {
                setTab(item.id);
                setFilter("Todas");
              }}
              className={cn(
                "-mb-px flex max-w-full flex-col items-start border-b-2 px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:min-w-64",
                tab === item.id
                  ? "border-blue-700 text-blue-950"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              <span className="inline-flex items-center gap-2 text-sm font-bold">
                {item.label}
                <span
                  className={cn(
                    "tnum rounded-md px-1.5 py-0.5 text-xs font-semibold",
                    tab === item.id
                      ? "bg-blue-50 text-blue-800"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {tabCounts[item.id]}
                </span>
              </span>
              <span className="mt-1 text-xs leading-5 text-slate-500">
                {item.description}
              </span>
            </button>
          ))}
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
              onClick={() => setFilter(option)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700",
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

      {!filtered.length ? (
        <div className="mt-6">
          <EmptyState
            icon={Search}
            title="Nada por aqui"
            description={
              tab === "errors"
                ? "Nenhum erro ou favorito corresponde a este filtro."
                : "Nenhuma questão respondida corresponde a este filtro."
            }
            action={
              <Button variant="outline" onClick={() => setFilter("Todas")}>
                Ver todas
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-5">
          {filtered.map((question) => (
            <QuestionReviewCard
              key={question.id}
              question={question}
              mode={tab}
              pending={pending}
              selectedOption={selectedAnswers[question.id] ?? ""}
              result={results[question.id]}
              onSelect={(option) =>
                setSelectedAnswers((current) => ({
                  ...current,
                  [question.id]: option,
                }))
              }
              onRetry={() => retry(question)}
              onMarkMastered={() => markMastered(question)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionReviewCard({
  question,
  mode,
  pending,
  selectedOption,
  result,
  onSelect,
  onRetry,
  onMarkMastered,
}: {
  question: QuestionRecord;
  mode: ReviewTab;
  pending: boolean;
  selectedOption: string;
  result?: RetryResult;
  onSelect: (option: string) => void;
  onRetry: () => void;
  onMarkMastered: () => void;
}) {
  const latest = latestAnswer(question);
  const displayedSelected = selectedOption || result?.selectedOption || latest?.selected_option || "";
  const knownCorrectOption = Boolean(result?.correctOption);
  const canMaster = canMarkMastered(question, result);
  const legacyMedia = getQuestionMedia(question);
  const associatedMedia = question.question_media ?? [];
  const answerCount = question.user_question_answers?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>{question.topics.name}</CardTitle>
            <p className="mt-2 text-sm text-slate-500">{formatQuestionSource(question)}</p>
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
            {hasActiveReview(question) ? <Badge tone="amber">Marcada</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            <p className="text-base leading-7 text-slate-900">{question.statement}</p>
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

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm leading-6 text-slate-600">
                {latest ? (
                  <span>
                    Última resposta:{" "}
                    <strong className={latest.is_correct ? "text-emerald-700" : "text-rose-700"}>
                      {latest.is_correct ? "correta" : "incorreta"}
                    </strong>
                    {latest.selected_option ? `, alternativa ${latest.selected_option}` : ""}.
                  </span>
                ) : (
                  <span>Escolha uma alternativa para refazer.</span>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  disabled={!selectedOption || pending || Boolean(result)}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Corrigir tentativa
                </Button>
                {mode === "errors" ? (
                  <Button size="sm" onClick={onMarkMastered} disabled={pending || !canMaster}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {canMaster ? "Dominei o conteúdo" : "Acerte para dominar"}
                  </Button>
                ) : null}
              </div>
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
              </div>
            ) : null}
          </div>

          <aside>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Histórico
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
      </CardContent>
    </Card>
  );
}

function buildFilterCounts(
  questions: QuestionRecord[],
  results: Record<string, RetryResult>,
): Record<ReviewFilter, number> {
  return {
    Todas: questions.length,
    Erradas: questions.filter((question) => matchesFilter(question, "Erradas", results))
      .length,
    Acertadas: questions.filter((question) => matchesFilter(question, "Acertadas", results))
      .length,
    Marcadas: questions.filter((question) => matchesFilter(question, "Marcadas", results))
      .length,
  };
}

function matchesFilter(
  question: QuestionRecord,
  filter: ReviewFilter,
  results: Record<string, RetryResult>,
) {
  if (filter === "Todas") return true;
  if (filter === "Marcadas") return hasActiveReview(question);
  const result = results[question.id];
  const latest = latestAnswer(question);
  const isCorrect = result?.isCorrect ?? latest?.is_correct ?? false;
  if (filter === "Acertadas") return isCorrect;
  return !isCorrect;
}

function canMarkMastered(question: QuestionRecord, result?: RetryResult) {
  return Boolean(result?.isCorrect || latestAnswer(question)?.is_correct);
}

function hasWrongHistory(question: QuestionRecord) {
  return Boolean(question.user_question_answers?.some((answer) => !answer.is_correct));
}

function hasActiveReview(question: QuestionRecord) {
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

function uniqueQuestions(questions: QuestionRecord[]) {
  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return Boolean(question.user_question_answers?.length);
  });
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
