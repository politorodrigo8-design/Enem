export const APP_TIME_ZONE = "America/Sao_Paulo";
export const APP_LOCALE = "pt-BR";

export function formatAppDateTime(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    ...options,
    timeZone: APP_TIME_ZONE,
  }).format(new Date(value));
}

/** Data (yyyy-mm-dd) no fuso do app — nunca usar toISOString para "hoje". */
export function appDateISO(value: string | number | Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
