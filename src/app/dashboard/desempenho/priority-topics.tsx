"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, PlayCircle, Search, TrendingUp } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);

  const areas = useMemo(
    () => ["Todas", ...Array.from(new Set(items.map((item) => item.area)))],
    [items],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query);
    return items.filter((item) => {
      if (area !== "Todas" && item.area !== area) return false;
      if (!normalizedQuery) return true;
      return normalize(`${item.discipline} ${item.name} ${item.area}`).includes(
        normalizedQuery,
      );
    });
  }, [area, items, query]);
  const hasActiveSearch = Boolean(query.trim());
  const priorityCutoffIndex = useMemo(() => {
    const lastMediumOrHigher = filtered.findLastIndex(isMediumOrHigherPriority);
    return lastMediumOrHigher >= 0 ? lastMediumOrHigher + 1 : Math.min(filtered.length, 8);
  }, [filtered]);
  const visible = expanded || hasActiveSearch ? filtered : filtered.slice(0, priorityCutoffIndex);
  const collapsedCount = Math.max(0, filtered.length - priorityCutoffIndex);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <CardTitle>Todos os assuntos</CardTitle>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            O mapa completo do que o ENEM cobra: primeiro aparecem as prioridades
            até a média; o restante fica recolhido para a lista não virar parede.
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
          <>
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
            {!hasActiveSearch && collapsedCount ? (
              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:min-h-10"
                aria-expanded={expanded}
              >
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                  aria-hidden="true"
                />
                {expanded
                  ? "Mostrar só até prioridade média"
                  : `Mostrar mais ${collapsedCount} assuntos`}
              </button>
            ) : null}
          </>
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

function isMediumOrHigherPriority(item: PriorityTopicItem) {
  const label = normalize(item.label);
  return (
    label.includes("maxima") ||
    label.includes("alta") ||
    label.includes("media")
  );
}

function PriorityTopicRow({
  item,
  mode,
}: {
  item: PriorityTopicItem;
  mode: "personal" | "recurrence";
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = `priority-details-${item.id}-${mode}`;
  const essential =
    mode === "personal"
      ? `${item.accuracy ?? 0}% de acerto em ${item.answered} ${
          item.answered === 1 ? "resposta" : "respostas"
        }`
      : `${item.recurrence}% de recorrência histórica`;

  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={
              expanded
                ? `Ocultar detalhes de ${item.discipline}: ${item.name}`
                : `Entender prioridade de ${item.discipline}: ${item.name}`
            }
            onClick={() => setExpanded((current) => !current)}
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-150", expanded && "rotate-180")}
              aria-hidden="true"
            />
          </button>
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
        <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
          {essential}
        </p>
        <div
          id={detailsId}
          className={cn(
            "grid transition-[grid-template-rows] duration-150 ease-out",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-600">
              <p>{item.reason}</p>
              <p className="tnum mt-1 text-xs font-semibold text-slate-500">
                Radar: prioridade {Math.round(item.priorityScore)} · recorrência{" "}
                {item.recurrence}% ·{" "}
                {item.answered
                  ? `${item.answered} ${item.answered === 1 ? "resposta" : "respostas"}`
                  : "sem respostas registradas"}
              </p>
            </div>
          </div>
        </div>
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
