"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Layers,
  ListChecks,
  Search,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, buttonClasses } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import type { AccessContext } from "@/lib/access";
import { calculatePriorityScore, priorityLabel } from "@/lib/db/scoring";
import type { TopicWithSubject } from "@/lib/db/types";
import { priorityTone } from "@/lib/utils";

type TopicPerformanceRow = NonNullable<TopicWithSubject["user_topic_performance"]>[number];

const selectClasses =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

export function RadarClient({
  topics,
  access,
}: {
  topics: TopicWithSubject[];
  access: AccessContext;
}) {
  const [area, setArea] = useState("Todas");
  const [priority, setPriority] = useState("Todas");
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("personalizada");

  const areas = useMemo(
    () => ["Todas", ...Array.from(new Set(topics.map((topic) => topic.subjects.area)))],
    [topics],
  );

  const allRows = useMemo(() => {
    return topics.map((topic) => {
      const performance = topic.user_topic_performance?.[0];
      const score = performance?.priority_score || calculatePriorityScore(topic, performance);
      return {
        topic,
        performance,
        score,
        label: priorityLabel(score),
      };
    });
  }, [topics]);

  const rows = useMemo(() => {
    return allRows
      .filter((row) => {
        const matchesArea = area === "Todas" || row.topic.subjects.area === area;
        const matchesPriority = priority === "Todas" || row.label === priority;
        const term = search.trim().toLowerCase();
        const matchesSearch =
          !term ||
          row.topic.name.toLowerCase().includes(term) ||
          row.topic.subjects.name.toLowerCase().includes(term);
        return matchesArea && matchesPriority && matchesSearch;
      })
      .sort((a, b) => {
        if (order === "recorrencia") {
          return Number(b.topic.historical_recurrence) - Number(a.topic.historical_recurrence);
        }
        if (order === "desempenho") {
          return (
            Number(a.performance?.accuracy_percentage ?? 0) -
            Number(b.performance?.accuracy_percentage ?? 0)
          );
        }
        return b.score - a.score;
      });
  }, [allRows, area, order, priority, search]);

  const visibleRows = access.hasPlatformAccess ? rows : [];
  const topRows = allRows.slice().sort((a, b) => b.score - a.score).slice(0, 3);

  const maxCount = allRows.filter((row) => row.label.includes("máxima")).length;
  const highCount = allRows.filter((row) => row.label.includes("alta")).length;
  const withoutAnswers = allRows.filter((row) => !row.performance?.total_answers).length;

  function clearFilters() {
    setArea("Todas");
    setPriority("Todas");
    setSearch("");
    setOrder("personalizada");
  }

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Reveal delay={0}>
          <StatCard
            label="Topicos mapeados"
            value={String(allRows.length)}
            helper="com recorrência histórica"
            icon={Layers}
          />
        </Reveal>
        <Reveal delay={60}>
          <StatCard
            label="Prioridade maxima"
            value={String(maxCount)}
            helper="primeiros da fila"
            icon={AlertTriangle}
          />
        </Reveal>
        <Reveal delay={120}>
          <StatCard
            label="Prioridade alta"
            value={String(highCount)}
            helper="bons para o próximo ciclo"
            icon={ListChecks}
          />
        </Reveal>
        <Reveal delay={180}>
          <StatCard
            label="Sem respostas"
            value={String(withoutAnswers)}
            helper="treine para personalizar"
            icon={Search}
          />
        </Reveal>
      </section>

      {topRows.length ? (
        <Reveal delay={40}>
          <section className="mt-6 rounded-lg border border-blue-100 bg-blue-50/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-blue-900">
                  <Target className="h-4.5 w-4.5" aria-hidden="true" />
                  Comece por estes assuntos
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700">
                  Os três assuntos mais urgentes para o próximo treino.
                </p>
              </div>
              <Link
                href="/dashboard/praticar?tab=banco"
                className={buttonClasses({ variant: "primary", size: "sm" })}
              >
                Treinar questões
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <ol className="mt-4 grid gap-3 lg:grid-cols-3">
              {topRows.map(({ topic, performance, label }, index) => (
                <li key={topic.id} className="rounded-lg bg-white p-4 ring-1 ring-inset ring-blue-100">
                  <div className="flex items-center justify-between gap-3">
                    <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-700 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${priorityTone(label)}`}>
                      {label.replace("Prioridade ", "")}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-950">{topic.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {buildPriorityReason(topic, performance)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </Reveal>
      ) : null}

      <Reveal delay={80}>
        <details className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-slate-100 p-4 text-sm font-bold text-slate-950">
            <span>Ver todos os tópicos e filtros</span>
            <span className="tnum text-xs font-semibold text-slate-500">
              {visibleRows.length} tópicos
            </span>
          </summary>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-end">
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <Select label="Área" value={area} options={areas} onChange={setArea} />
              <Select
                label="Prioridade"
                value={priority}
                options={[
                  "Todas",
                  "Prioridade máxima",
                  "Prioridade alta",
                  "Prioridade média",
                  "Prioridade complementar",
                ]}
                onChange={setPriority}
              />
              <Select
                label="Ordenar por"
                value={order}
                options={[
                  { value: "personalizada", label: "Ordem recomendada" },
                  { value: "recorrencia", label: "Mais recorrentes" },
                  { value: "desempenho", label: "Mais fracos primeiro" },
                ]}
                onChange={setOrder}
              />
            </div>
            <label className="block lg:w-72">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Busca
              </span>
              <div className="mt-1.5 flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 transition-colors focus-within:border-blue-400 hover:border-slate-300">
                <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Buscar tópico ou disciplina"
                />
              </div>
            </label>
          </div>

          {visibleRows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Search}
                title="Nenhum tópico encontrado"
                description="Ajuste os filtros ou limpe a busca para visualizar as prioridades."
                action={
                  <Button type="button" variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5 font-semibold">Tópico</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Recorrencia</th>
                    <th className="px-4 py-2.5 font-semibold">Seu desempenho</th>
                    <th className="px-4 py-2.5 font-semibold">Por que aparece</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Prioridade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map(({ topic, performance, label }) => {
                    const answered = performance?.total_answers ?? 0;
                    const accuracy = Math.round(performance?.accuracy_percentage ?? 0);
                    return (
                      <tr key={topic.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-950">{topic.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {topic.subjects.area} • {topic.subjects.name}
                          </p>
                        </td>
                        <td className="tnum px-4 py-3 text-right text-slate-700">
                          {topic.historical_recurrence}%
                        </td>
                        <td className="px-4 py-3">
                          <p
                            className={`tnum font-semibold ${
                              answered === 0
                                ? "text-slate-400"
                                : accuracy < 55
                                  ? "text-rose-600"
                                  : "text-slate-900"
                            }`}
                          >
                            {answered === 0 ? "Sem respostas" : `${accuracy}% de acerto`}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {answered ? `${answered} respondida(s)` : "treine para personalizar"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="max-w-md text-sm leading-5 text-slate-700">
                            {buildPriorityReason(topic, performance)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${priorityTone(label)}`}
                          >
                            {label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </details>
      </Reveal>

    </>
  );
}

function buildPriorityReason(
  topic: TopicWithSubject,
  performance?: TopicPerformanceRow,
) {
  const answered = performance?.total_answers ?? 0;
  const accuracy = Number(performance?.accuracy_percentage ?? 0);
  const recurrence = Number(topic.historical_recurrence);

  if (!answered) {
    return `Recorrencia ${recurrence}% e sem respostas suas.`;
  }

  if (accuracy < 55) {
    return `Baixo acerto e recorrência ${recurrence}%.`;
  }

  if (recurrence >= 70) {
    return `Tema recorrente para manter no ciclo.`;
  }

  return `Reforço para fechar lacunas menores.`;
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: (string | { value: string; label: string })[];
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
        className={`mt-1.5 ${selectClasses}`}
      >
        {options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}
