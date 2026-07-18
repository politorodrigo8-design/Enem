"use client";

import { CheckCircle2, RotateCcw, Search, XCircle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  markReviewMasteredAction,
  submitQuestionAnswerAction,
} from "@/lib/actions/learning";
import type { QuestionRecord } from "@/lib/db/types";

export function ReviewClient({ questions }: { questions: QuestionRecord[] }) {
  const [filter, setFilter] = useState("Todas");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();

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
          [question.id]: Boolean(result.isCorrect),
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

  return (
    <div>
      <Card className="mb-6">
        <CardContent>
          <label className="block max-w-xs">
            <span className="text-sm font-semibold text-slate-700">Filtro</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400"
            >
              {["Todas", "Erradas", "Marcadas"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      {!filtered.length ? (
        <EmptyState
          icon={Search}
          title="Nada para revisar"
          description="Erros e questões marcadas aparecerão aqui depois dos treinos."
        />
      ) : (
        <div className="grid gap-5">
          {filtered.map((question) => {
            const result = results[question.id];
            return (
              <Card key={question.id}>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="blue">{question.subjects.area}</Badge>
                    <Badge tone="violet">{question.topics.name}</Badge>
                    <Badge tone="slate">{question.difficulty}</Badge>
                  </div>
                  <p className="mt-5 text-base leading-7 text-slate-900">
                    {question.statement}
                  </p>
                  <div className="mt-5 grid gap-3">
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
                          className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                            selectedAnswers[question.id] === option.option_key
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
                  {typeof result === "boolean" ? (
                    <div
                      className={`mt-5 rounded-lg border p-4 ${
                        result
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-rose-200 bg-rose-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {result ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                        ) : (
                          <XCircle className="h-5 w-5 text-rose-700" />
                        )}
                        <p className="font-bold text-slate-950">
                          {result ? "Nova tentativa correta" : "Ainda precisa revisar"}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {question.explanation}
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => retry(question)}
                      disabled={!selectedAnswers[question.id] || pending}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Refazer questão
                    </Button>
                    <Button onClick={() => markMastered(question.id)} disabled={pending}>
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
