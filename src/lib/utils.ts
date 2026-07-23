import { twMerge } from "tailwind-merge";

// twMerge resolve conflitos de utilitários (ex.: "p-5" + "p-0" → "p-0"),
// garantindo que a classe passada por último sempre vença.
export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(" "));
}

export function priorityTone(priority: string) {
  if (priority.includes("máxima")) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (priority.includes("alta")) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (priority.includes("média")) {
    return "bg-blue-50 text-blue-700 ring-blue-200";
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

/**
 * Returns a redirect target that is guaranteed to stay inside the app.
 * Rejects absolute URLs (https://evil.com) and protocol-relative ones
 * (//evil.com) that would otherwise cause an open redirect.
 */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/dashboard",
) {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
