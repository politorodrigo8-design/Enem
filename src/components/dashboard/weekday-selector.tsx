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

  // O número de colunas depende da largura do card que hospeda o seletor, não do
  // viewport: em telas grandes ele vive numa coluna estreita. 44rem é o mínimo
  // real para 7 trilhas com o rótulo completo ("Segunda"..."Domingo").
  return (
    <fieldset id={id} className={cn("block", className)}>
      <legend className="text-sm font-semibold text-slate-700">{label}</legend>
      <div className="@container mt-2">
        <div className="grid grid-cols-4 gap-1.5 @min-[26rem]:gap-2 @min-[44rem]:grid-cols-7">
          {weekdayOptions.map((day) => {
            const selected = selectedDays.includes(day.value);

            return (
              <button
                key={day.value}
                type="button"
                aria-pressed={selected}
                aria-label={day.label}
                onClick={() => toggleDay(day.value)}
                className={cn(
                  "flex h-11 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 @min-[26rem]:gap-1.5 @min-[26rem]:px-2 lg:h-10",
                  selected
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                {selected ? (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : null}
                <span className="truncate @min-[44rem]:hidden">{day.shortLabel}</span>
                <span className="hidden truncate @min-[44rem]:inline">{day.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
