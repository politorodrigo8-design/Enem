export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function priorityTone(priority: string) {
  if (priority.includes("máxima")) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (priority.includes("alta")) {
    return "bg-violet-50 text-violet-700 ring-violet-200";
  }

  if (priority.includes("média")) {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  return "bg-slate-50 text-slate-600 ring-slate-200";
}

export function statusTone(status: string) {
  if (status.includes("Concluído") || status.includes("Realizado")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status.includes("andamento")) {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status.includes("breve")) {
    return "bg-slate-100 text-slate-500 ring-slate-200";
  }

  return "bg-slate-50 text-slate-600 ring-slate-200";
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}
