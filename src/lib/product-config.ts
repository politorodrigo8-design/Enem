import {
  ESSAY_CREDIT_COST,
  MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES,
  MAX_ESSAY_UPLOAD_FILES,
  MAX_ESSAY_UPLOAD_SIZE_BYTES,
} from "@/lib/schemas/essay";

export const PRODUCT_NAME = "Pontua Enem Completo";
export const ENEM_YEAR = "2026";
export const ESSAY_ACCEPTED_FILE_LABEL = "PNG, JPG, JPEG ou PDF";
export const ESSAY_CREDIT_COST_LABEL = `${ESSAY_CREDIT_COST} créditos`;
export const ESSAY_UPLOAD_LIMIT_LABEL = `até ${MAX_ESSAY_UPLOAD_FILES} imagens, ${formatMegabytes(
  MAX_ESSAY_UPLOAD_SIZE_BYTES,
)} por arquivo e ${formatMegabytes(MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES)} no total`;

export function formatAccessDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatMegabytes(value: number) {
  return `${Math.round(value / (1024 * 1024))} MB`;
}
