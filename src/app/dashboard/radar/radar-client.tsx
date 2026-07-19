"use client";

import { AlertTriangle, Layers, ListChecks, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import type { AccessContext } from "@/lib/access";
import { calculatePriorityScore, priorityLabel } from "@/lib/db/scoring";
import type { TopicWithSubject } from "@/lib/db/types";
import { priorityTone } from "@/lib/utils";

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
        const matchesSearch =
          row.topic.name.toLowerCase().includes(search.toLowerCase()) ||
          row.topic.subjects.name.toLowerCase().includes(search.toLowerCase());
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
            label="Tópicos mapeados"
            value={String(allRows.length)}
            helper="com recorrência histórica"
            icon={Layers}
          />
        </Reveal>
        <Reveal delay={60}>
          <StatCard
            label="Prioridade máxima"
            value={String(maxCount)}
            helper="tópicos mais urgentes"
            icon={AlertTriangle}
          />
        </Reveal>
        <Reveal delay={120}>
          <StatCard
            label="Prioridade alta"
            value={String(highCount)}
            helper="para o próximo ciclo"
            icon={ListChecks}
          />
        </Reveal>
        <Reveal delay={180}>
          <StatCard
            label="Sem respostas"
            value={String(withoutAnswers)}
            helper="responda para personalizar"
            icon={Search}
          />
        </Reveal>
      </section>

      <Reveal delay={80}>
      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
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
                { value: "personalizada", label: "Prioridade personalizada" },
                { value: "recorrencia", label: "Recorrência" },
                { value: "desempenho", label: "Desempenho" },
              ]}
              onChange={setOrder}
            />
          </div>
          <label className="block lg:w-64">
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
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">Tópico</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Recorrência</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Respondidas</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Acerto</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Score</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Prioridade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map(({ topic, performance, score, label }) => {
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
                      <td className="tnum px-4 py-3 text-right text-slate-700">
                        {answered}
                      </td>
                      <td
                        className={`tnum px-4 py-3 text-right font-semibold ${
                          answered === 0
                            ? "text-slate-400"
                            : accuracy < 55
                              ? "text-rose-600"
                              : "text-slate-900"
                        }`}
                      >
                        {answered === 0 ? "—" : `${accuracy}%`}
                      </td>
                      <td className="tnum px-4 py-3 text-right font-semibold text-slate-900">
                        {score}
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
      </section>
      </Reveal>

      {visibleRows.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Tópicos sem respostas aparecem com acerto “—”. Responda questões deles para
          personalizar a prioridade com sua taxa de erro.
        </p>
      ) : null}
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
