import type { QuestionMedia, QuestionOption, QuestionRecord } from "@/lib/db/types";
import {
  cleanQuestionStatement,
  hasOcrResidue,
  normalizeQuestionTextKey,
  optionRefersToImage,
} from "@/lib/questions/rules.mjs";

type MinimalQuestionForQuality = Pick<
  QuestionRecord,
  | "answer_verified"
  | "correct_option"
  | "media_required"
  | "review_status"
  | "reviewed"
  | "source_verified"
  | "statement"
> & {
  is_demo?: boolean | null;
  media_url?: string | null;
  question_media?: Array<Pick<QuestionMedia, "url">>;
  question_options?: Array<Pick<QuestionOption, "option_key" | "option_text">>;
};

// Chave de comparação de nomes da taxonomia (área/disciplina/assunto): ignora
// acentos e caixa para que variantes históricas não fragmentem o mesmo assunto.
export function normalizeTaxonomyKey(value: string) {
  return normalizeQuestionTextKey(value);
}

/**
 * Aplica a limpeza do enunciado no que vai para a tela. Não altera o dado
 * gravado: a marca d'água da digitalização continua no banco, só não é exibida.
 */
export function withCleanStatements<T extends { statement: string }>(questions: T[]): T[] {
  return questions.map((question) => {
    const statement = cleanQuestionStatement(question.statement);
    return statement === question.statement ? question : { ...question, statement };
  });
}

const requiredOptionKeys = ["A", "B", "C", "D", "E"];
const brokenTextFragments = [
  "[object object]",
  "undefined",
  "lorem ipsum",
  "sem enunciado",
  "alternativa a:",
];

export function isStudentReadyQuestion(question: MinimalQuestionForQuality) {
  // Questão demonstrativa é dado de semente para desenvolvimento e não pode
  // chegar a quem pagou (DESIGN.md proíbe expor conteúdo demonstrativo).
  // Antes ela era ISENTA das checagens de revisão, então um banco sem acervo
  // importado servia as 11 questões do seed.sql como se fossem o produto — e,
  // por haver 11 > 0, o acervo local de reserva nem entrava em cena.
  if (question.is_demo) {
    return false;
  }

  if (
    !question.reviewed ||
    question.review_status !== "approved" ||
    !question.source_verified ||
    !question.answer_verified
  ) {
    return false;
  }

  // O enunciado é avaliado limpo: o cabeçalho da digitalização é ruído
  // removível, mas lixo que sobra depois da limpeza é conteúdo corrompido.
  const statement = cleanQuestionStatement(question.statement);
  if (!hasUsableText(statement, 40) || hasOcrResidue(statement)) {
    return false;
  }

  const hasMedia =
    Boolean(question.media_url) ||
    Boolean(question.question_media?.some((media) => Boolean(media.url)));

  if (!hasCompleteOptions(question.question_options ?? [], question.correct_option, hasMedia)) {
    return false;
  }

  if (question.media_required && !hasMedia) {
    return false;
  }

  return true;
}

function hasCompleteOptions(
  options: Array<Pick<QuestionOption, "option_key" | "option_text">>,
  correctOption: string | undefined,
  hasMedia: boolean,
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

  // Alternativa que só remete a uma imagem inexistente deixa a questão sem
  // resposta possível — ainda que as cinco letras estejam preenchidas.
  if (!hasMedia && requiredOptions.some((option) => optionRefersToImage(option.text))) {
    return false;
  }

  const normalizedCorrectOption = correctOption?.trim().toUpperCase();
  return !normalizedCorrectOption || optionKeys.has(normalizedCorrectOption);
}

function hasUsableText(value: string | null | undefined, minLength: number) {
  const normalized = value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
  if (normalized.length < minLength) return false;
  return !brokenTextFragments.some((fragment) => normalized.includes(fragment));
}
