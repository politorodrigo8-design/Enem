export const questionOptionKeys = ["A", "B", "C", "D", "E"];

// Corridas de traços/setas que a digitalização das provas oficiais deixa no
// texto: são o cabeçalho e o rodapé impressos do caderno, não conteúdo.
const watermarkNoise = "[\\s\\u2014\\u2013\\->=_.,;:\"'()\\[\\]\\d]";
// A corrida precisa ter 3+ tra\u00e7os/setas: com 2 caracteres o padr\u00e3o pegaria
// enunciado leg\u00edtimo que come\u00e7a por express\u00e3o matem\u00e1tica ("2 >= x").
const leadingWatermark = new RegExp(
  `^${watermarkNoise}*[\\u2014\\u2013>]{3,}${watermarkNoise}*(?:enem[a-z0-9!\u00ba\u00aa]*\\b\\.?\\s*)?`,
  "i",
);
const ocrResiduePattern = /[\u2014\u2013]{3,}|>{3,}|\uFFFD/;

export function normalizeQuestionTextKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Remove a marca d'água da digitalização do enunciado (cabeçalho "———>>> enem…",
 * rodapé com cor do caderno e número da questão) sem alterar o dado gravado.
 * @param {string | null | undefined} value
 */
export function cleanQuestionStatement(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .replace(leadingWatermark, "")
    .replace(/\s*\d+\s*-\s*AZUL\s*-\s*\d+[\u00ba\u00aa]?\s*Aplica[çc][ãa]o\b.*$/i, "")
    .replace(/\s*Exame Nacional\s*Quest[ãa]o\s*\d+\b.*$/i, "")
    .replace(/[\s\u2014\u2013>=\\|]{3,}$/, "")
    .replace(/^[\s\u2014\u2013\->=_."'()]+/, "")
    // Palavras que a digitalização colou no artigo inicial.
    .replace(/\bArela[çc][ãa]o\b/g, "A relação")
    .replace(/\bAimagem\b/g, "A imagem")
    .trim();
}

/** Sobrou marca d'água depois da limpeza: o enunciado está corrompido. */
export function hasOcrResidue(value) {
  return ocrResiduePattern.test(String(value ?? ""));
}

/**
 * Alternativa que só manda o aluno olhar uma imagem ("Alternativa A — ver
 * imagem da questao."). Sem mídia anexada, a questão é impossível de responder.
 * @param {string | null | undefined} value
 */
export function optionRefersToImage(value) {
  const key = normalizeQuestionTextKey(value);
  return (
    key.includes("ver imagem da questao") ||
    (key.includes("ver alternativa") && key.includes("imagem"))
  );
}

export function buildQuestionAnswerRecord({
  userId,
  question,
  selectedOption,
  responseTimeSeconds = 0,
}) {
  if (!userId) throw new Error("Usuario obrigatorio para salvar resposta.");
  if (!question?.id || !question.correct_option) throw new Error("Questao invalida.");
  if (!questionOptionKeys.includes(selectedOption)) throw new Error("Alternativa invalida.");

  const isCorrect = question.correct_option === selectedOption;
  return {
    row: {
      user_id: userId,
      question_id: question.id,
      selected_option: selectedOption,
      is_correct: isCorrect,
      response_time_seconds: Number(responseTimeSeconds) || 0,
    },
    result: {
      isCorrect,
      explanation: question.explanation,
    },
  };
}

export function nextReviewToggle(existingReview, userId, questionId) {
  if (!userId) throw new Error("Usuario obrigatorio para favoritar questao.");
  if (!questionId) throw new Error("Questao obrigatoria para favoritar.");

  if (existingReview?.id) {
    return {
      operation: "delete",
      reviewed: false,
      id: existingReview.id,
      userId,
      message: "Questao removida da revisao.",
    };
  }

  return {
    operation: "insert",
    reviewed: true,
    row: {
      user_id: userId,
      question_id: questionId,
      mastered: false,
    },
    message: "Questao adicionada a revisao.",
  };
}

export function nextFavoriteToggle(existingFavorite, userId, questionId) {
  if (!userId) throw new Error("Usuario obrigatorio para favoritar questao.");
  if (!questionId) throw new Error("Questao obrigatoria para favoritar.");

  if (existingFavorite?.id) {
    return {
      operation: "delete",
      favorited: false,
      id: existingFavorite.id,
      userId,
      message: "Questao removida das favoritas.",
    };
  }

  return {
    operation: "insert",
    favorited: true,
    row: {
      user_id: userId,
      question_id: questionId,
    },
    message: "Questao salva nas favoritas.",
  };
}

/**
 * Tamanho da recomendação: poucos assuntos prioritários, um punhado de questões
 * em cada. Sem esse corte "Recomendadas" era o acervo inteiro só reordenado —
 * o rótulo prometia curadoria e devolvia mais de mil questões.
 */
export const recommendedTopicCount = 6;
export const recommendedQuestionsPerTopic = 5;

/**
 * Seleciona as questões recomendadas a partir da prioridade real dos assuntos
 * do aluno (mesmo score do motor de prioridades).
 *
 * @param {{
 *   questions?: Array<{ topics?: { name?: string } }>,
 *   topicPriority?: Record<string, { score?: number }>,
 *   topicCount?: number,
 *   perTopic?: number,
 * }} input
 */
export function selectRecommendedQuestions({
  questions = [],
  topicPriority = {},
  topicCount = recommendedTopicCount,
  perTopic = recommendedQuestionsPerTopic,
} = {}) {
  const byTopic = new Map();
  for (const question of questions) {
    const topic = question?.topics?.name ?? "";
    const bucket = byTopic.get(topic);
    if (bucket) bucket.push(question);
    else byTopic.set(topic, [question]);
  }

  const rankedTopics = [...byTopic.keys()]
    .sort(
      (a, b) =>
        (Number(topicPriority[b]?.score) || 0) - (Number(topicPriority[a]?.score) || 0) ||
        a.localeCompare(b),
    )
    .slice(0, Math.max(1, topicCount));

  // Intercalado por assunto: qualquer tamanho de sessão (10, 15, 20) cobre
  // todos os assuntos prioritários em vez de esgotar só o primeiro.
  const selected = [];
  const limit = Math.max(1, perTopic);
  for (let position = 0; position < limit; position += 1) {
    for (const topic of rankedTopics) {
      const question = byTopic.get(topic)[position];
      if (question) selected.push(question);
    }
  }

  return selected;
}

export function latestQuestionAnswer(answers = []) {
  return [...answers].sort(
    (a, b) => new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime(),
  )[0];
}
