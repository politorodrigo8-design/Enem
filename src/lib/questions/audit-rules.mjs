import {
  cleanQuestionStatement,
  hasOcrResidue,
  normalizeQuestionTextKey,
  optionRefersToImage,
} from "./rules.mjs";

const optionKeys = ["A", "B", "C", "D", "E"];

export function auditQuestionRecord(question) {
  const issues = [];
  const options = normalizeOptions(question.question_options ?? []);
  const media = question.question_media ?? [];
  const hasMedia = Boolean(question.media_url || media.some((item) => item?.url));
  const statement = cleanQuestionStatement(question.statement ?? "");

  if (!statement.trim()) {
    issues.push(issue(question, "enunciado_vazio", "critico", "alta", "Enunciado vazio."));
  } else if (statement.trim().length < 40) {
    issues.push(issue(question, "enunciado_muito_curto", "medio", "media", "Enunciado curto de forma suspeita."));
  }
  if (hasOcrResidue(statement) || hasBrokenCharacters(statement)) {
    issues.push(issue(question, "caracteres_corrompidos", "alto", "media", "Texto parece conter residuo de OCR ou codificacao quebrada."));
  }

  if (!options.length) {
    issues.push(issue(question, "ausencia_de_alternativas", "critico", "alta", "Nenhuma alternativa cadastrada."));
  }
  const optionKeySet = new Set(options.map((option) => option.key));
  if (!optionKeys.every((key) => optionKeySet.has(key))) {
    issues.push(issue(question, "quantidade_invalida_de_alternativas", "critico", "alta", "A questao precisa ter alternativas A, B, C, D e E."));
  }
  for (const option of options) {
    if (!option.text) {
      issues.push(issue(question, "alternativa_vazia", "alto", "alta", `Alternativa ${option.key || "sem letra"} vazia.`));
    }
  }
  const duplicateOptions = duplicatedTexts(options.map((option) => option.text));
  if (duplicateOptions.length) {
    issues.push(issue(question, "alternativas_duplicadas", "alto", "alta", "Ha alternativas com texto repetido."));
  }

  const correctOption = String(question.correct_option ?? "").trim().toUpperCase();
  if (!correctOption) {
    issues.push(issue(question, "ausencia_de_alternativa_correta", "critico", "alta", "Gabarito ausente."));
  } else if (!optionKeySet.has(correctOption)) {
    issues.push(issue(question, "resposta_fora_das_alternativas", "critico", "alta", "Gabarito nao corresponde a uma alternativa cadastrada."));
  }

  if (question.media_required && !hasMedia) {
    issues.push(issue(question, "imagem_necessaria_ausente", "alto", "alta", "Questao marcada como dependente de midia sem imagem cadastrada."));
  }
  if (!hasMedia && options.some((option) => optionRefersToImage(option.text))) {
    issues.push(issue(question, "questao_depende_de_imagem_sem_midia", "alto", "media", "Alternativa remete a imagem, mas nenhuma midia foi encontrada."));
  }
  for (const item of media) {
    if (item?.url && !isValidMediaUrl(item.url)) {
      issues.push(issue(question, "url_de_imagem_invalida", "medio", "media", `URL de midia invalida: ${item.url}`));
    }
  }

  if (!question.source) {
    issues.push(issue(question, "origem_ausente", "medio", "alta", "Origem ausente."));
  }
  if (!question.year) {
    issues.push(issue(question, "ano_ausente", "medio", "alta", "Ano ausente."));
  }
  if (!question.subjects?.area) {
    issues.push(issue(question, "area_ausente", "alto", "alta", "Area ausente."));
  }
  if (!question.subjects?.name) {
    issues.push(issue(question, "materia_ausente", "alto", "alta", "Materia ausente."));
  }
  if (!question.topics?.name) {
    issues.push(issue(question, "conteudo_ou_habilidade_ausente", "medio", "alta", "Assunto/topico ausente."));
  }
  if (!question.id) {
    issues.push(issue(question, "questao_sem_identificador_confiavel", "critico", "alta", "ID ausente."));
  }

  return issues;
}

export function exactDuplicateGroups(questions) {
  const groups = new Map();
  for (const question of questions) {
    const key = normalizeQuestionTextKey(cleanQuestionStatement(question.statement ?? ""));
    if (!key) continue;
    const bucket = groups.get(key) ?? [];
    bucket.push(question);
    groups.set(key, bucket);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

export function buildQuestionAuditReport(questions) {
  const issues = questions.flatMap(auditQuestionRecord);
  for (const group of exactDuplicateGroups(questions)) {
    for (const question of group) {
      issues.push(issue(question, "duplicidade_exata", "medio", "alta", "Mesmo enunciado aparece mais de uma vez."));
    }
  }
  return issues;
}

function issue(question, problem, severity, confidence, reason) {
  return {
    id: question.id ?? "",
    origin: question.source ?? "",
    year: question.year ?? null,
    area: question.subjects?.area ?? "",
    subject: question.subjects?.name ?? "",
    problem,
    severity,
    confidence,
    reason,
    recommended_action: actionFor(problem),
  };
}

function normalizeOptions(options) {
  return options.map((option) => ({
    key: String(option.option_key ?? "").trim().toUpperCase(),
    text: String(option.option_text ?? "").trim(),
  }));
}

function duplicatedTexts(values) {
  const seen = new Set();
  const duplicates = [];
  for (const value of values) {
    const key = normalizeQuestionTextKey(value);
    if (!key) continue;
    if (seen.has(key)) duplicates.push(value);
    seen.add(key);
  }
  return duplicates;
}

function hasBrokenCharacters(value) {
  return /\uFFFD|Ã.|Â.|â€|â€™|â€œ|â€/.test(String(value ?? ""));
}

function isValidMediaUrl(value) {
  return /^\/[A-Za-z0-9/_.,@%+-]+\.(png|jpg|jpeg|webp)$/i.test(value) || /^https?:\/\/\S+$/i.test(value);
}

function actionFor(problem) {
  if (problem.includes("correta") || problem.includes("gabarito")) {
    return "Revisar gabarito manualmente antes de liberar.";
  }
  if (problem.includes("imagem") || problem.includes("midia")) {
    return "Conferir midia original e anexar imagem/descricao correta.";
  }
  if (problem.includes("duplicidade")) {
    return "Comparar as questoes e decidir se uma delas deve ser arquivada.";
  }
  return "Revisar cadastro editorial da questao.";
}
