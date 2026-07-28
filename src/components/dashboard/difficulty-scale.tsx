"use client";

import { cn } from "@/lib/utils";
import {
  SELF_ASSESSMENT_LABELS,
  SELF_ASSESSMENT_LEGEND,
} from "@/lib/study/self-assessment-priority.mjs";

const levels = [1, 2, 3, 4, 5] as const;
const levelLabels = SELF_ASSESSMENT_LABELS as Record<number, string>;

/** Seletor de autopercepcao: 1 = mais dificuldade, 5 = mais facilidade. */
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
      <p className="mb-2 text-xs font-medium text-slate-500">
        {SELF_ASSESSMENT_LEGEND}
      </p>
      <div
        className="grid grid-cols-5 gap-1 sm:gap-1.5"
        role="radiogroup"
        aria-label={`Autopercepcao em ${label}: ${SELF_ASSESSMENT_LEGEND}`}
      >
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={value === level}
            aria-label={`${level} de 5 - ${levelLabels[level]}`}
            onClick={() => onChange(level)}
            className={cn(
              "tnum h-11 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 lg:h-9",
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

/** Versao de leitura da escala: barras preenchidas ate o nivel informado. */
export function DifficultyMeter({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5">
      <span className="min-w-0 text-sm font-medium text-slate-800">{label}</span>
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex gap-1" aria-hidden="true">
          {levels.map((level) => (
            <span
              key={level}
              className={cn(
                "h-2 w-5 shrink-0 rounded-full",
                level <= value ? "bg-blue-700" : "bg-slate-200",
              )}
            />
          ))}
        </div>
        <span className="sr-only">
          {value} de 5 - {levelLabels[value] ?? ""}
        </span>
        <span className="tnum w-7 text-right text-sm font-semibold text-slate-950">
          {value}/5
        </span>
      </div>
    </div>
  );
}
