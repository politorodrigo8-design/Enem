export const ESSAY_CREDIT_COST = 10;
export const MAX_ESSAY_UPLOAD_FILES = 2;
// Espelha src/lib/schemas/essay.ts: o envio cabe em uma requisição só, cortada
// por volta de 4,5 MB antes de chegar à aplicação.
export const MAX_ESSAY_UPLOAD_SIZE_BYTES = 3 * 1024 * 1024;
export const MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES = 3 * 1024 * 1024;
// Prazo de devolutiva prometido ao aluno, em dias úteis.
export const ESSAY_TURNAROUND_BUSINESS_DAYS = 2;
export const ACCEPTED_ESSAY_UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

export function extensionForEssayMime(mimeType) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  return "bin";
}

export function isAllowedEssayMime(mimeType) {
  return ACCEPTED_ESSAY_UPLOAD_TYPES.has(mimeType);
}

/**
 * Soma dias úteis a uma data no formato yyyy-mm-dd. A âncora ao meio-dia UTC
 * evita que a conta ande um dia por causa do fuso.
 */
export function addBusinessDays(isoDate, days) {
  const cursor = new Date(`${isoDate}T12:00:00.000Z`);
  if (Number.isNaN(cursor.getTime())) {
    throw new Error("invalid iso date");
  }

  let remaining = days;
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return cursor.toISOString().slice(0, 10);
}

export function essayResponseDeadlineDate(submittedIsoDate) {
  return addBusinessDays(submittedIsoDate, ESSAY_TURNAROUND_BUSINESS_DAYS);
}

export function formatEssayMegabytes(bytes) {
  const megabytes = bytes / (1024 * 1024);
  const rounded = Number.isInteger(megabytes) ? megabytes : Math.round(megabytes * 10) / 10;
  return `${String(rounded).replace(".", ",")} MB`;
}

export function validateEssayFileBatch(files) {
  const errors = [];
  if (!Array.isArray(files) || files.length === 0) {
    errors.push("Selecione pelo menos um arquivo.");
    return { ok: false, errors };
  }

  if (files.length > MAX_ESSAY_UPLOAD_FILES) {
    errors.push(`Envie no máximo ${MAX_ESSAY_UPLOAD_FILES} arquivos por redação.`);
  }

  const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  if (totalSize > MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES) {
    errors.push(
      `O envio deve ter no máximo ${formatEssayMegabytes(
        MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES,
      )} somando os arquivos.`,
    );
  }

  const hasPdf = files.some((file) => file.type === "application/pdf");
  if (hasPdf && files.length > 1) {
    errors.push("PDF deve ser enviado como arquivo único.");
  }

  files.forEach((file, index) => {
    if (!isAllowedEssayMime(file.type)) {
      errors.push(`Arquivo ${index + 1}: use PDF, PNG, JPG ou JPEG.`);
    }
    if (!Number.isFinite(file.size) || file.size <= 0) {
      errors.push(`Arquivo ${index + 1}: arquivo vazio.`);
    }
    if (file.size > MAX_ESSAY_UPLOAD_SIZE_BYTES) {
      errors.push(
        `Arquivo ${index + 1}: limite de ${formatEssayMegabytes(
          MAX_ESSAY_UPLOAD_SIZE_BYTES,
        )} por arquivo.`,
      );
    }
  });

  return { ok: errors.length === 0, errors };
}

export function buildEssayStoragePath({ userId, submissionId, pageOrder, randomId, mimeType }) {
  if (!userId || !submissionId || !randomId) {
    throw new Error("missing path component");
  }
  const extension = extensionForEssayMime(mimeType);
  return `essays/${userId}/${submissionId}/${pageOrder}-${randomId}.${extension}`;
}

export function canDebitEssayCredits(balance) {
  return Number.isInteger(balance) && balance >= ESSAY_CREDIT_COST;
}

export function debitEssayCredits(balance) {
  if (!canDebitEssayCredits(balance)) {
    throw new Error("insufficient credits");
  }
  return balance - ESSAY_CREDIT_COST;
}

export function isFinalizedOrConfirmedStatus(status) {
  return ["pending", "in_review", "completed", "cancelled"].includes(status);
}

export function canConfirmEssaySubmission({ status, fileCount, balance }) {
  return status === "uploading" && fileCount > 0 && fileCount <= MAX_ESSAY_UPLOAD_FILES && canDebitEssayCredits(balance);
}
