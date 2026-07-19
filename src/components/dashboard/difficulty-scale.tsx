"use client";

import { cn } from "@/lib/utils";

const levels = [1, 2, 3, 4, 5] as const;
const levelLabels: Record<number, string> = {
  1: "Tranquilo",
  2: "Fácil",
  3: "Médio",
  4: "Difícil",
  5: "Muito difícil",
};

/** Seletor de dificuldade percebida: 5 níveis segmentados (substitui sliders). */
export function DifficultyScale({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <fieldset className="py-4 first:pt-0 last:pb-0">
      <div className="mb-2.5 flex items-baseline justify-between gap-4">
        <legend className="float-left text-sm font-semibold text-slate-900">{label}</legend>
        <span className="text-xs font-medium text-slate-500">
          {levelLabels[value] ?? ""}
        </span>
      </div>
      <div
        className="grid grid-cols-5 gap-1.5"
        role="radiogroup"
        aria-label={`Dificuldade em ${label}`}
      >
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={value === level}
            aria-label={`${level} — ${levelLabels[level]}`}
            onClick={() => onChange(level)}
            className={cn(
              "tnum h-9 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700",
              value === level
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800",
            )}
          >
            {level}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Versão de leitura da escala: barras preenchidas até o nível. */
export function DifficultyMeter({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <div className="flex items-center gap-2.5">
        <div className="flex gap-1" aria-hidden="true">
          {levels.map((level) => (
            <span
              key={level}
              className={cn(
                "h-2 w-5 rounded-full",
                level <= value ? "bg-blue-700" : "bg-slate-200",
              )}
            />
          ))}
        </div>
        <span className="sr-only">
          {value} de 5 — {levelLabels[value] ?? ""}
        </span>
        <span className="tnum w-7 text-right text-sm font-semibold text-slate-950">
          {value}/5
        </span>
      </div>
    </div>
  );
}
