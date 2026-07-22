import type { QuestionMedia, QuestionOption, QuestionRecord } from "@/lib/db/types";

type MinimalQuestionForQuality = Pick<
  QuestionRecord,
  | "answer_verified"
  | "correct_option"
  | "media_required"
  | "media_url"
  | "review_status"
  | "reviewed"
  | "source_verified"
  | "statement"
> & {
  question_media?: Array<Pick<QuestionMedia, "url">>;
  question_options?: Array<Pick<QuestionOption, "option_key" | "option_text">>;
};

const requiredOptionKeys = ["A", "B", "C", "D", "E"];
const brokenTextFragments = [
  "[object object]",
  "undefined",
  "lorem ipsum",
  "sem enunciado",
  "alternativa a:",
];

export function isStudentReadyQuestion(question: MinimalQuestionForQuality) {
  if (
    !question.reviewed ||
    question.review_status !== "approved" ||
    !question.source_verified ||
    !question.answer_verified
  ) {
    return false;
  }

  if (!hasUsableText(question.statement, 40)) {
    return false;
  }

  if (!hasCompleteOptions(question.question_options ?? [], question.correct_option)) {
    return false;
  }

  if (question.media_required) {
    const hasLegacyMedia = Boolean(question.media_url);
    const hasAssociatedMedia = Boolean(
      question.question_media?.some((media) => Boolean(media.url)),
    );
    if (!hasLegacyMedia && !hasAssociatedMedia) {
      return false;
    }
  }

  return true;
}

function hasCompleteOptions(
  options: Array<Pick<QuestionOption, "option_key" | "option_text">>,
  correctOption?: string,
) {
  const normalizedOptions = options.map((option) => ({
    key: option.option_key.trim().toUpperCase(),
    text: option.option_text.trim(),
  }));
  const optionKeys = new Set(normalizedOptions.map((option) => option.key));
  const hasAllRequiredKeys = requiredOptionKeys.every((key) => optionKeys.has(key));
  if (!hasAllRequiredKeys) return false;

  const requiredOptions = normalizedOptions.filter((option) =>
    requiredOptionKeys.includes(option.key),
  );
  const normalizedTexts = requiredOptions.map((option) =>
    option.text.replace(/\s+/g, " ").toLowerCase(),
  );
  const hasDuplicatedText = new Set(normalizedTexts).size !== normalizedTexts.length;
  if (hasDuplicatedText) return false;

  const allTextsUsable = requiredOptions.every((option) => hasUsableText(option.text, 2));
  if (!allTextsUsable) return false;

  const normalizedCorrectOption = correctOption?.trim().toUpperCase();
  return !normalizedCorrectOption || optionKeys.has(normalizedCorrectOption);
}

function hasUsableText(value: string | null | undefined, minLength: number) {
  const normalized = value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
  if (normalized.length < minLength) return false;
  return !brokenTextFragments.some((fragment) => normalized.includes(fragment));
}
