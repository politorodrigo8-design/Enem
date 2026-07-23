"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const weekdayOptions = [
  { value: "Segunda-feira", label: "Segunda", shortLabel: "Seg" },
  { value: "Terça-feira", label: "Terça", shortLabel: "Ter" },
  { value: "Quarta-feira", label: "Quarta", shortLabel: "Qua" },
  { value: "Quinta-feira", label: "Quinta", shortLabel: "Qui" },
  { value: "Sexta-feira", label: "Sexta", shortLabel: "Sex" },
  { value: "Sábado", label: "Sábado", shortLabel: "Sáb" },
  { value: "Domingo", label: "Domingo", shortLabel: "Dom" },
];

const weekdayAliases = new Map(
  weekdayOptions.flatMap((day) => {
    const normalizedValue = normalizeWeekday(day.value);
    const normalizedLabel = normalizeWeekday(day.label);

    return [
      [normalizedValue, day.value],
      [normalizedValue.replace(" feira", ""), day.value],
      [normalizedLabel, day.value],
    ];
  }),
);

export function formatSelectedWeekdays(selectedDays: string[]) {
  return weekdayOptions
    .filter((day) => selectedDays.includes(day.value))
    .map((day) => day.value)
    .join(", ");
}

export function parseSelectedWeekdays(value?: string | null) {
  if (!value) return [];

  const selected = new Set<string>();
  for (const item of value.split(/\s*(?:,|;|\||\be\b)\s*/i)) {
    const day = weekdayAliases.get(normalizeWeekday(item));
    if (day) selected.add(day);
  }

  return weekdayOptions
    .filter((day) => selected.has(day.value))
    .map((day) => day.value);
}

export function WeekdaySelector({
  id,
  label,
  value,
  onChange,
  className,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const selectedDays = parseSelectedWeekdays(value);

  function toggleDay(day: string) {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((selectedDay) => selectedDay !== day)
      : [...selectedDays, day];

    onChange(formatSelectedWeekdays(next));
  }

  return (
    <fieldset id={id} className={cn("block", className)}>
      <legend className="text-sm font-semibold text-slate-700">{label}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {weekdayOptions.map((day) => {
          const selected = selectedDays.includes(day.value);

          return (
            <button
              key={day.value}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleDay(day.value)}
              className={cn(
                "flex h-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700",
                selected
                  ? "border-blue-600 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              {selected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              <span className="sm:hidden">{day.shortLabel}</span>
              <span className="hidden sm:inline">{day.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function normalizeWeekday(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}
