"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, PlayCircle, Search, TrendingUp } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, priorityTone } from "@/lib/utils";

export type PriorityTopicItem = {
  id: string;
  area: string;
  discipline: string;
  name: string;
  label: string;
  reason: string;
  recurrence: number;
  priorityScore: number;
  accuracy: number | null;
  answered: number;
  hasPersonalPerformance: boolean;
};

/** Prioridades pessoais e recorrência histórica ficam separadas. */
export function PriorityTopics({ items }: { items: PriorityTopicItem[] }) {
  const personalPriorities = useMemo(
    () =>
      items
        .filter((item) => item.hasPersonalPerformance && (item.accuracy ?? 100) < 75)
        .sort(
          (a, b) =>
            b.priorityScore - a.priorityScore ||
            (a.accuracy ?? 100) - (b.accuracy ?? 100) ||
            b.recurrence - a.recurrence ||
            a.name.localeCompare(b.name),
        )
        .slice(0, 4),
    [items],
  );
  const personalIds = useMemo(
    () => new Set(personalPriorities.map((item) => item.id)),
    [personalPriorities],
  );
  const recurringTopics = useMemo(
    () =>
      items
        .filter((item) => !personalIds.has(item.id))
        .slice()
        .sort(
          (a, b) =>
            b.recurrence - a.recurrence ||
            b.priorityScore - a.priorityScore ||
            a.discipline.localeCompare(b.discipline) ||
            a.name.localeCompare(b.name),
        )
        .slice(0, 10),
    [items, personalIds],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prioridades de estudo</CardTitle>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          A lista separa o que vem das suas respostas do que vem do histórico do
          ENEM. Isso orienta a revisão, mas não garante quais assuntos cairão.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-950">
              Mais recorrentes no ENEM
            </h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {recurringTopics.map((item) => (
              <PriorityTopicRow key={item.id} item={item} mode="recurrence" />
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-950">
              Pelo seu desempenho
            </h3>
          </div>
          {personalPriorities.length ? (
            <ul className="divide-y divide-slate-100">
              {personalPriorities.map((item) => (
                <PriorityTopicRow key={item.id} item={item} mode="personal" />
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-4">
              <p className="text-sm leading-6 text-slate-600">
                Responda mais questões para aparecerem prioridades ligadas aos
                seus erros e acertos.
              </p>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

/** Catálogo completo de assuntos do ENEM, com busca e filtro por área. */
export function AllTopics({ items }: { items: PriorityTopicItem[] }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("Todas");

  const areas = useMemo(
    () => ["Todas", ...Array.from(new Set(items.map((item) => item.area)))],
    [items],
  );

  const visible = useMemo(() => {
    const normalizedQuery = normalize(query);
    return items.filter((item) => {
      if (area !== "Todas" && item.area !== area) return false;
      if (!normalizedQuery) return true;
      return normalize(`${item.discipline} ${item.name} ${item.area}`).includes(
        normalizedQuery,
      );
    });
  }, [area, items, query]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <CardTitle>Todos os assuntos</CardTitle>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            O mapa completo do que o ENEM cobra: {items.length} assuntos com
            recorrência histórica, desempenho e ação direta.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar assunto ou disciplina"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:h-10 sm:w-64"
            />
          </label>
          <select
            value={area}
            onChange={(event) => setArea(event.target.value)}
            aria-label="Filtrar por área"
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:h-10"
          >
            {areas.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {visible.length ? (
          <ul className="divide-y divide-slate-100">
            {visible.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-slate-800 sm:truncate">
                    {item.discipline}: {item.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.area}</p>
                </div>
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:shrink-0 sm:justify-end">
                  <span className="tnum hidden w-16 text-right text-xs font-semibold text-slate-600 sm:inline-block">
                    {item.recurrence}%
                  </span>
                  <span
                    className={cn(
                      "hidden rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset md:inline-flex",
                      priorityTone(item.label),
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="tnum w-12 text-right text-xs text-slate-500">
                    {item.answered ? `${item.accuracy ?? 0}%` : "-"}
                  </span>
                  <Link
                    href={`/dashboard/praticar?topic=${item.id}`}
                    className="-mx-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 hover:text-blue-800 sm:mx-0 sm:min-h-0 sm:px-0 sm:hover:bg-transparent"
                  >
                    Treinar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm leading-6 text-slate-500">
            Nenhum assunto corresponde à busca. Tente outro termo ou limpe o
            filtro de área.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PriorityTopicRow({
  item,
  mode,
}: {
  item: PriorityTopicItem;
  mode: "personal" | "recurrence";
}) {
  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-slate-950">
            {item.discipline}: {item.name}
          </p>
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
              priorityTone(item.label),
            )}
          >
            {item.label}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {mode === "personal"
            ? `${item.accuracy ?? 0}% de acerto em ${item.answered} ${
                item.answered === 1 ? "resposta" : "respostas"
              }. ${item.reason}`
            : `${item.recurrence}% de recorrência histórica. ${item.reason}`}
        </p>
      </div>
      <Link
        href={`/dashboard/praticar?topic=${item.id}`}
        className={buttonClasses({ variant: "outline", size: "sm" })}
      >
        <PlayCircle className="h-4 w-4" aria-hidden="true" />
        Treinar
      </Link>
    </li>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
