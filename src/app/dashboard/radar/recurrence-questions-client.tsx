"use client";

import Link from "next/link";
import { ArrowRight, Filter, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import type { AccessContext } from "@/lib/access";
import type { QuestionRecord } from "@/lib/db/types";

const controlClasses =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

export function RecurrenceQuestionsClient({
  questions,
  access,
}: {
  questions: QuestionRecord[];
  access: AccessContext;
}) {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("Todas");
  const [topic, setTopic] = useState("Todos");
  const [year, setYear] = useState("Todos");
  const [priority, setPriority] = useState("Todas");

  const options = useMemo(
    () => ({
      areas: unique(["Todas", ...questions.map((q) => q.subjects.area)]),
      topics: unique(["Todos", ...questions.map((q) => q.topics.name)]),
      years: unique(["Todos", ...questions.map((q) => String(q.year))]),
      priorities: unique(["Todas", ...questions.map((q) => q.recurrence_category)]),
    }),
    [questions],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return questions.filter((question) => {
      const searchable = [
        question.statement,
        question.subjects.area,
        question.subjects.name,
        question.topics.name,
        question.subtopic,
        question.priority_reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!term || searchable.includes(term)) &&
        (area === "Todas" || question.subjects.area === area) &&
        (topic === "Todos" || question.topics.name === topic) &&
        (year === "Todos" || String(question.year) === year) &&
        (priority === "Todas" || question.recurrence_category === priority)
      );
    });
  }, [area, priority, questions, search, topic, year]);

  const visible = access.hasPlatformAccess ? filtered : [];
  const reviewedHighPriority = visible.filter(
    (question) =>
      question.reviewed &&
      question.review_status === "approved" &&
      question.source_verified &&
      question.answer_verified &&
      question.priority_reason,
  );

  function clearFilters() {
    setSearch("");
    setArea("Todas");
    setTopic("Todos");
    setYear("Todos");
    setPriority("Todas");
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Treino e recorrencia
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            Questões que valem entrar no treino
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">
            Use esta parte como atalho: encontre um assunto, escolha uma area ou
            foque nos itens de maior prioridade.
          </p>
        </div>
        <Link
          href="/dashboard/praticar?tab=banco"
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          Treinar agora
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <Notice tone="warning" className="mb-6">
        O Radar organiza prioridades de estudo. Ele nao tenta adivinhar a prova.
      </Notice>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Encontrar questoes
            <span className="tnum text-xs font-semibold text-slate-500">
              {visible.length} de {questions.length}
            </span>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Limpar
          </button>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-[1.4fr_0.8fr_0.9fr_0.7fr_0.9fr]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Busca
            </span>
            <div className="mt-1.5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 transition-colors focus-within:border-blue-400 hover:border-slate-300">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Tema, palavra ou disciplina"
              />
            </div>
          </label>
          <Select label="Area" value={area} options={options.areas} onChange={setArea} />
          <Select label="Assunto" value={topic} options={options.topics} onChange={setTopic} />
          <Select label="Ano" value={year} options={options.years} onChange={setYear} />
          <Select
            label="Foco"
            value={priority}
            options={options.priorities}
            onChange={setPriority}
          />
        </div>
      </div>

      {!visible.length ? (
        <EmptyState
          icon={Search}
          title="Nenhuma questao encontrada"
          description="Limpe a busca ou escolha menos filtros para voltar a ver sugestoes."
          action={
            <Button type="button" variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((question) => {
            const isReviewedHigh = reviewedHighPriority.some((item) => item.id === question.id);
            return (
              <article
                key={question.id}
                className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">
                      {question.topics.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {question.subjects.area} • {question.subjects.name} • {question.year}
                    </p>
                  </div>
                  <Badge tone={question.is_demo ? "amber" : isReviewedHigh ? "green" : "slate"}>
                    {question.is_demo ? "Exemplo" : question.recurrence_category}
                  </Badge>
                </div>

                <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-700">
                  {question.statement}
                </p>

                <div className="mt-4 flex gap-2.5 border-t border-slate-100 pt-4">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  <p className="text-xs leading-5 text-slate-600">
                    {question.priority_reason ||
                      "Boa para aquecer o treino neste assunto enquanto novas questoes oficiais sao revisadas."}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Badge tone="slate">{question.difficulty}</Badge>
                  {question.is_official ? <Badge tone="green">Oficial</Badge> : null}
                  {question.content_recurrence ? (
                    <Badge tone="blue">{question.content_recurrence}</Badge>
                  ) : null}
                </div>

                <div className="mt-4 flex gap-2.5 text-xs leading-5 text-slate-500">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                  <span>
                    Fonte: {question.source}. Revisao: {question.review_status}.
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
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
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1.5 ${controlClasses}`}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
