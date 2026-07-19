"use client";

import {
  Bookmark,
  CheckCircle2,
  ListChecks,
  PlayCircle,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  markReviewMasteredAction,
  submitQuestionAnswerAction,
} from "@/lib/actions/learning";
import type { QuestionRecord } from "@/lib/db/types";

const filters = ["Todas", "Erradas", "Marcadas"] as const;

export function ReviewClient({ questions }: { questions: QuestionRecord[] }) {
  const [filter, setFilter] = useState<string>("Todas");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<
    Record<string, { isCorrect: boolean; explanation: string }>
  >({});
  const [pending, startTransition] = useTransition();

  const wrongCount = useMemo(
    () =>
      questions.filter((question) =>
        question.user_question_answers?.some((answer) => !answer.is_correct),
      ).length,
    [questions],
  );
  const markedCount = useMemo(
    () =>
      questions.filter((question) => Boolean(question.user_question_reviews?.length))
        .length,
    [questions],
  );

  const filtered = useMemo(() => {
    return questions.filter((question) => {
      const wrong = question.user_question_answers?.some((answer) => !answer.is_correct);
      const marked = Boolean(question.user_question_reviews?.length);
      if (filter === "Erradas") return wrong;
      if (filter === "Marcadas") return marked;
      return true;
    });
  }, [filter, questions]);

  function retry(question: QuestionRecord) {
    const selected = selectedAnswers[question.id];
    if (!selected) return;

    startTransition(async () => {
      const result = await submitQuestionAnswerAction({
        questionId: question.id,
        selectedOption: selected,
      });
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        setResults((current) => ({
          ...current,
          [question.id]: {
            isCorrect: Boolean(result.isCorrect),
            explanation: result.explanation ?? "",
          },
        }));
      }
    });
  }

  function markMastered(questionId: string) {
    startTransition(async () => {
      const result = await markReviewMasteredAction(questionId);
      toast[result.ok ? "success" : "error"](result.message);
    });
  }

  if (!questions.length) {
    return (
      <EmptyState
        icon={Search}
        title="Nada para revisar"
        description="Erros e questões marcadas aparecem aqui depois dos treinos. Responda questões para montar sua lista de revisão."
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

  const filterCounts: Record<string, number> = {
    Todas: questions.length,
    Erradas: wrongCount,
    Marcadas: markedCount,
  };

  return (
    <div>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Para revisar"
          value={String(questions.length)}
          helper="questões na sua lista"
          icon={ListChecks}
        />
        <StatCard
          label="Erradas"
          value={String(wrongCount)}
          helper="com pelo menos um erro registrado"
          icon={XCircle}
        />
        <StatCard
          label="Marcadas"
          value={String(markedCount)}
          helper="salvas por você para rever"
          icon={Bookmark}
        />
      </section>

      <div
        className="mt-6 flex flex-wrap gap-2"
        role="group"
        aria-label="Filtrar questões de revisão"
      >
        {filters.map((option) => {
          const active = filter === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                active
                  ? "bg-blue-50 text-blue-900 ring-1 ring-inset ring-blue-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
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
            description="Nenhuma questão corresponde a este filtro. Escolha outro filtro para continuar a revisão."
            action={
              <Button variant="outline" onClick={() => setFilter("Todas")}>
                Ver todas
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-5">
          {filtered.map((question) => {
            const result = results[question.id];
            return (
              <Card key={question.id}>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="blue">{question.subjects.area}</Badge>
                    <Badge tone="slate">{question.topics.name}</Badge>
                    <Badge tone="slate">{question.difficulty}</Badge>
                  </div>
                  <p className="mt-4 text-base leading-7 text-slate-900">
                    {question.statement}
                  </p>
                  <div className="mt-4 grid gap-2.5">
                    {question.question_options
                      .slice()
                      .sort((a, b) => a.option_key.localeCompare(b.option_key))
                      .map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setSelectedAnswers((current) => ({
                              ...current,
                              [question.id]: option.option_key,
                            }))
                          }
                          className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                            selectedAnswers[question.id] === option.option_key
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
                  {result ? (
                    <div
                      className={`mt-4 rounded-lg border p-4 ${
                        result.isCorrect
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-rose-200 bg-rose-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {result.isCorrect ? (
                          <CheckCircle2
                            className="h-5 w-5 text-emerald-700"
                            aria-hidden="true"
                          />
                        ) : (
                          <XCircle className="h-5 w-5 text-rose-700" aria-hidden="true" />
                        )}
                        <p className="text-sm font-bold text-slate-950">
                          {result.isCorrect
                            ? "Nova tentativa correta"
                            : "Ainda precisa revisar"}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {result.explanation}
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retry(question)}
                      disabled={!selectedAnswers[question.id] || pending}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Refazer questão
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => markMastered(question.id)}
                      disabled={pending}
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Dominei o conteúdo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
