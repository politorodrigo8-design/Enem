export const editableEditorialStatuses = ["pending", "approved", "rejected", "needs_review"];
export const editableOptionKeys = ["A", "B", "C", "D", "E"];

export function canEditEditorial(accessLevel) {
  return accessLevel === "admin";
}

export function normalizeDifficulty(value) {
  return value === "Media" ? "Média" : value;
}

export function isValidMediaUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateEditorialQuestionForSave(question, mediaRecords = []) {
  const errors = [];
  const approved = question.review_status === "approved";

  if (!editableEditorialStatuses.includes(question.review_status)) {
    errors.push("Status editorial invalido.");
  }

  if (!approved) {
    return { ok: errors.length === 0, errors };
  }

  if (!question.statement?.trim()) errors.push("Enunciado vazio impede aprovacao.");
  if (!question.explanation?.trim()) errors.push("Resolucao vazia impede aprovacao.");
  if (!question.area?.trim() || !question.subject?.trim() || !question.topic?.trim()) {
    errors.push("Area, disciplina e assunto sao obrigatorios para aprovacao.");
  }
  if (!question.classification_version?.trim()) {
    errors.push("Versao de classificacao obrigatoria para aprovacao.");
  }

  const options = Array.isArray(question.options) ? question.options : [];
  if (options.length < 5) {
    errors.push("Aprovacao exige cinco alternativas para este formato.");
  }
  const optionKeys = new Set(options.map((option) => option.option_key));
  const emptyOption = options.find((option) => !option.option_text?.trim());
  if (emptyOption) errors.push(`Alternativa ${emptyOption.option_key} esta vazia.`);
  if (!editableOptionKeys.includes(question.correct_option) || !optionKeys.has(question.correct_option)) {
    errors.push("Gabarito invalido para as alternativas informadas.");
  }

  if (!question.reviewed || !question.source_verified || !question.answer_verified) {
    errors.push("Aprovacao exige revisao, fonte verificada e gabarito verificado.");
  }

  const invalidMedia = mediaRecords.find((media) => media?.url && !isValidMediaUrl(media.url));
  if (invalidMedia) {
    errors.push("Ha URL de midia invalida associada a questao.");
  }

  if (question.media_required) {
    const verifiedMedia = mediaRecords.some(
      (media) => media?.verified === true && isValidMediaUrl(media.url),
    );
    if (!question.media_verified || !verifiedMedia) {
      errors.push("Questao com midia obrigatoria exige registro de midia valido e verificado.");
    }
  }

  return { ok: errors.length === 0, errors };
}

export function firstEditorialValidationMessage(question, mediaRecords = []) {
  const result = validateEditorialQuestionForSave(question, mediaRecords);
  return result.ok ? null : result.errors[0];
}
