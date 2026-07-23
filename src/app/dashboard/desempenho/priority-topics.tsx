"use client";

import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { priorityTone } from "@/lib/utils";

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

export function PriorityTopics({ items }: { items: PriorityTopicItem[] }) {
  const highlighted = items.slice(0, 6);
  const remaining = items.slice(6);
  const remainingByArea = new Map<string, PriorityTopicItem[]>();
  for (const item of remaining) {
    const group = remainingByArea.get(item.area) ?? [];
    group.push(item);
    remainingByArea.set(item.area, group);
  }

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
              className="flex flex-col gap-3 py-4 first:pt-0 md:flex-row md:items-center md:justify-between"
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

        {remaining.length ? (
          <details className="mt-2 border-t border-slate-100 pt-4">
            <summary className="cursor-pointer list-none text-sm font-bold text-blue-700">
              Ver todos os {items.length} assuntos mapeados
            </summary>
            <div className="mt-4 space-y-6">
              {Array.from(remainingByArea.entries()).map(([area, group]) => (
                <div key={area}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {area}
                  </p>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {group.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-4 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {item.discipline}: {item.name}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="tnum text-xs text-slate-500">
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
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
