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
