"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatSelectedWeekdays,
  parseSelectedWeekdays,
  weekdayOptions,
  type WeekdayValue,
} from "@/lib/weekdays";

export { formatSelectedWeekdays, parseSelectedWeekdays };

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

  function toggleDay(day: WeekdayValue) {
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
