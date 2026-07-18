"use client";

import { Search, SlidersHorizontal, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import type { AccessContext } from "@/lib/access";
import { calculatePriorityScore, priorityLabel } from "@/lib/db/scoring";
import type { TopicWithSubject } from "@/lib/db/types";
import { priorityTone } from "@/lib/utils";

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

  const rows = useMemo(() => {
    return topics
      .map((topic) => {
        const performance = topic.user_topic_performance?.[0];
        const score = performance?.priority_score || calculatePriorityScore(topic, performance);
        return {
          topic,
          performance,
          score,
          label: priorityLabel(score),
        };
      })
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
  }, [area, order, priority, search, topics]);
  const visibleRows = access.hasPlatformAccess ? rows : [];

  return (
    <>
      <Card className="mb-6">
        <CardContent>
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <SlidersHorizontal className="h-4 w-4 text-blue-700" aria-hidden="true" />
            Filtros e ordenação
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              options={["personalizada", "recorrencia", "desempenho"]}
              onChange={setOrder}
            />
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Busca</span>
              <div className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-400">
                <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  placeholder="Buscar tópico"
                />
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {visibleRows.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum tópico encontrado"
          description="Ajuste os filtros para visualizar prioridades."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleRows.map(({ topic, performance, score, label }) => (
            <Card key={topic.id}>
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      {topic.subjects.area} • {topic.subjects.name}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-950">{topic.name}</h2>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${priorityTone(label)}`}
                  >
                    {label}
                  </span>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <Metric label="Recorrência" value={`${topic.historical_recurrence}%`} />
                  <Metric
                    label="Respondidas"
                    value={String(performance?.total_answers ?? 0)}
                  />
                  <Metric label="Score" value={String(score)} />
                </div>
                <div className="mt-5 space-y-3">
                  <Progress value={Number(topic.historical_recurrence)} label="Recorrência histórica" />
                  <Progress
                    value={Number(performance?.accuracy_percentage ?? 0)}
                    label="Desempenho do aluno"
                    tone={(performance?.accuracy_percentage ?? 0) < 55 ? "red" : "green"}
                  />
                </div>
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex gap-3">
                    <Target className="mt-0.5 h-5 w-5 text-blue-700" aria-hidden="true" />
                    <p className="text-sm leading-6 text-slate-700">
                      {performance?.total_answers
                        ? "A prioridade personalizada considera seu histórico de respostas neste tópico."
                        : "Responda questões deste tópico para personalizar o score com sua taxa de erro."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}
