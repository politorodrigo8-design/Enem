export const ESSAY_CREDIT_COST = 10;
export const MAX_ESSAY_UPLOAD_FILES = 4;
export const MAX_ESSAY_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES = 30 * 1024 * 1024;
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

export function validateEssayFileBatch(files) {
  const errors = [];
  if (!Array.isArray(files) || files.length === 0) {
    errors.push("Selecione pelo menos um arquivo.");
    return { ok: false, errors };
  }

  if (files.length > MAX_ESSAY_UPLOAD_FILES) {
    errors.push("Envie no maximo 4 arquivos por redacao.");
  }

  const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  if (totalSize > MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES) {
    errors.push("A submissao deve ter no maximo 30 MB no total.");
  }

  const hasPdf = files.some((file) => file.type === "application/pdf");
  if (hasPdf && files.length > 1) {
    errors.push("PDF deve ser enviado como arquivo unico.");
  }

  files.forEach((file, index) => {
    if (!isAllowedEssayMime(file.type)) {
      errors.push(`Arquivo ${index + 1}: use PDF, PNG, JPG ou JPEG.`);
    }
    if (!Number.isFinite(file.size) || file.size <= 0) {
      errors.push(`Arquivo ${index + 1}: arquivo vazio.`);
    }
    if (file.size > MAX_ESSAY_UPLOAD_SIZE_BYTES) {
      errors.push(`Arquivo ${index + 1}: limite de 10 MB por arquivo.`);
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
