import { formatAppDateTime } from "@/lib/dates";

/** Data curta com hora, padrão de todas as tabelas do painel. */
export function formatAdminDateTime(value: string | number | Date) {
  return formatAppDateTime(value, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Só a data, para colunas onde a hora é ruído. */
export function formatAdminDate(value: string | number | Date) {
  return formatAppDateTime(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
