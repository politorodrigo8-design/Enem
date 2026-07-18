"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PreviewQuestion = {
  statement: string;
  area: string;
  subject: string;
  topic: string;
  difficulty: string;
  source: string;
  question_number: number;
  year: number;
  explanation: string;
  correct_option: string;
  media_url?: string | null;
  media_alt?: string | null;
  media_width?: number | "";
  media_height?: number | "";
  options: Array<{ option_key: string; option_text: string }>;
};

export function BatchPreviewClient({ questions }: { questions: PreviewQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const question = questions[index];
  const currentResult = submitted && selected ? selected === question.correct_option : null;
  const areas = useMemo(
    () => Array.from(new Set(questions.map((item) => item.area))).join(" / "),
    [questions],
  );

  function move(nextIndex: number) {
    setIndex(nextIndex);
    setSelected("");
    setSubmitted(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-blue-700">Preview editorial</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Lote 001 aprovado</h1>
        <p className="mt-2 text-sm text-slate-600">
          {questions.length} questoes approved carregadas dos JSONs de importacao. Areas: {areas}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>
                Questao {index + 1} de {questions.length}
              </CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                {question.source} | Q{question.question_number} | {question.year}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{question.area}</Badge>
              <Badge tone="violet">{question.topic}</Badge>
              <Badge tone="slate">{question.difficulty}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {question.media_url ? (
            <figure className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <Image
                src={question.media_url}
                alt={question.media_alt || "Midia da questao"}
                width={Number(question.media_width) || 900}
                height={Number(question.media_height) || 500}
                className="h-auto w-full object-contain"
                unoptimized
              />
            </figure>
          ) : null}

          <p className="whitespace-pre-line text-lg leading-8 text-slate-900">
            {question.statement}
          </p>

          <div className="mt-6 space-y-3">
            {question.options.map((option) => {
              const isSelected = selected === option.option_key;
              const isCorrect = submitted && question.correct_option === option.option_key;
              const isWrong = submitted && isSelected && !isCorrect;
              return (
                <button
                  key={option.option_key}
                  type="button"
                  onClick={() => !submitted && setSelected(option.option_key)}
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
                  <span className="text-sm leading-6 text-slate-800">{option.option_text}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => move(Math.max(0, index - 1))} disabled={index === 0}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </Button>
              <Button variant="outline" onClick={() => move(Math.min(questions.length - 1, index + 1))} disabled={index === questions.length - 1}>
                Proxima
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <Button onClick={() => setSubmitted(true)} disabled={!selected || submitted}>
              Responder
            </Button>
          </div>

          {currentResult !== null ? (
            <div
              className={`mt-6 rounded-lg border p-5 ${
                currentResult ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {currentResult ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-700" />
                )}
                <p className="font-bold text-slate-950">
                  {currentResult ? "Resposta correta" : "Resposta incorreta"}
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{question.explanation}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
