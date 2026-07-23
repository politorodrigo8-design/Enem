export const weekdayOptions = [
  { value: "Segunda-feira", label: "Segunda", shortLabel: "Seg", offset: 0 },
  { value: "Terça-feira", label: "Terça", shortLabel: "Ter", offset: 1 },
  { value: "Quarta-feira", label: "Quarta", shortLabel: "Qua", offset: 2 },
  { value: "Quinta-feira", label: "Quinta", shortLabel: "Qui", offset: 3 },
  { value: "Sexta-feira", label: "Sexta", shortLabel: "Sex", offset: 4 },
  { value: "Sábado", label: "Sábado", shortLabel: "Sáb", offset: 5 },
  { value: "Domingo", label: "Domingo", shortLabel: "Dom", offset: 6 },
] as const;

export type WeekdayValue = (typeof weekdayOptions)[number]["value"];

const weekdayAliases = new Map(
  weekdayOptions.flatMap((day) => {
    const normalizedValue = normalizeWeekday(day.value);
    const normalizedLabel = normalizeWeekday(day.label);

    return [
      [normalizedValue, day.value],
      [normalizedValue.replace(" feira", ""), day.value],
      [normalizedLabel, day.value],
    ] as Array<[string, WeekdayValue]>;
  }),
);

const weekdayOffsets = new Map<string, number>(
  weekdayOptions.map((day) => [day.value, day.offset]),
);

export function formatSelectedWeekdays(selectedDays: string[]) {
  return weekdayOptions
    .filter((day) => selectedDays.includes(day.value))
    .map((day) => day.value)
    .join(", ");
}

export function parseSelectedWeekdays(value?: string | null): WeekdayValue[] {
  if (!value) return [];

  const selected = new Set<WeekdayValue>();
  for (const item of value.split(/\s*(?:,|;|\||\be\b)\s*/i)) {
    const day = weekdayAliases.get(normalizeWeekday(item));
    if (day) selected.add(day);
  }

  return weekdayOptions
    .filter((day) => selected.has(day.value))
    .map((day) => day.value);
}

/** Deslocamento do dia em relação à segunda-feira (início da semana do plano). */
export function weekdayOffsetFromMonday(day: string) {
  return weekdayOffsets.get(day) ?? null;
}

export function normalizeWeekday(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}
