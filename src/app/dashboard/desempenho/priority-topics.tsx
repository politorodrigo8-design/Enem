"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PlayCircle, Search } from "lucide-react";
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
  accuracy: number | null;
  answered: number;
};

/** Os 6 assuntos que mais aumentam a nota agora, com motivo e ação direta. */
export function PriorityTopics({ items }: { items: PriorityTopicItem[] }) {
  const highlighted = items.slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assuntos prioritários</CardTitle>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Ordenados pelo que mais aumenta sua nota: o quanto o assunto cai no
          ENEM e o quanto você ainda erra nele.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-slate-100">
          {highlighted.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-950">
                    {item.discipline}: {item.name}
                  </p>
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${priorityTone(item.label)}`}
                  >
                    {item.label}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {item.reason}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4 md:justify-end">
                <p className="tnum text-xs text-slate-500">
                  {item.answered
                    ? `${item.accuracy ?? 0}% de acerto em ${item.answered} ${
                        item.answered === 1 ? "resposta" : "respostas"
                      }`
                    : "Sem respostas ainda"}
                </p>
                <Link
                  href={`/dashboard/praticar?topic=${item.id}`}
                  className={buttonClasses({ variant: "outline", size: "sm" })}
                >
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  Treinar
                </Link>
              </div>
            </li>
          ))}
        </ul>
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
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Todos os assuntos</CardTitle>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            O mapa completo do que o ENEM cobra — {items.length} assuntos com
            histórico de recorrência, na ordem da sua prioridade.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
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
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:w-64"
            />
          </label>
          <select
            value={area}
            onChange={(event) => setArea(event.target.value)}
            aria-label="Filtrar por área"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {item.discipline}: {item.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.area}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={cn(
                      "hidden rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset sm:inline-flex",
                      priorityTone(item.label),
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="tnum w-12 text-right text-xs text-slate-500">
                    {item.answered ? `${item.accuracy ?? 0}%` : "—"}
                  </span>
                  <Link
                    href={`/dashboard/praticar?topic=${item.id}`}
                    className="text-sm font-semibold text-blue-700 hover:text-blue-800"
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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
