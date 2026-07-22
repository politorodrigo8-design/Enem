import matematicaRows from "../../../supabase/imports/enem-piloto-matematica.json";
import linguagensRows from "../../../supabase/imports/enem-piloto-linguagens.json";
import humanasRows from "../../../supabase/imports/enem-piloto-humanas.json";
import naturezaRows from "../../../supabase/imports/enem-piloto-natureza.json";
import type {
  QuestionRecord,
  SimulationWithQuestions,
  TopicWithSubject,
} from "@/lib/db/types";

type FallbackImportRow = {
  statement: string;
  area: string;
  subject: string;
  topic: string;
  subtopic?: string | null;
  difficulty: string;
  year: number;
  source: string;
  source_url?: string | null;
  exam_name?: string | null;
  exam_color?: string | null;
  exam_day?: string | null;
  exam_edition?: string | null;
  question_number?: number | null;
  language?: string | null;
  is_official?: boolean;
  is_demo?: boolean;
  is_authorial?: boolean;
  is_inspired?: boolean;
  explanation: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_option: string;
  discipline?: string | null;
  competence?: string | null;
  skill?: string | null;
  content_recurrence?: string | null;
  charge_pattern?: string | null;
  estimated_priority?: string;
  priority_score?: number;
  confidence_level?: string | null;
  priority_reason?: string | null;
  official_source?: string | null;
  official_exam_url?: string | null;
  official_answer_key_url?: string | null;
  priority_is_educational_estimate?: boolean;
  reviewed?: boolean;
  review_status?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  editorial_reviewer?: string | null;
  last_editorial_review_at?: string | null;
  editorial_notes?: string | null;
  source_verified?: boolean;
  answer_verified?: boolean;
  media_required?: boolean;
  media_verified?: boolean;
  media_url?: string | null;
  media_type?: string | null;
  media_alt?: string | null;
  media_caption?: string | null;
  source_pdf?: string | null;
  source_page?: number | null;
  media_width?: number | null;
  media_height?: number | null;
  classification_version?: string;
  recurrence_category?: string;
};

type FallbackOptions = {
  includeAnswerKeys?: boolean;
};

export const fallbackQuestionIdPrefix = "fallback-question-";
export const fallbackSimulationIdPrefix = "fallback-simulation-";

const importedRows = [
  ...(matematicaRows as FallbackImportRow[]),
  ...(linguagensRows as FallbackImportRow[]),
  ...(humanasRows as FallbackImportRow[]),
  ...(naturezaRows as FallbackImportRow[]),
].filter((row) => isApprovedFallbackRow(row));

const fallbackQuestionsWithAnswers = importedRows.map((row, index) =>
  buildFallbackQuestion(row, index, true),
);
const fallbackQuestionsForClient = fallbackQuestionsWithAnswers.map((question) =>
  stripFallbackAnswerKey(question),
);
const fallbackQuestionById = new Map(
  fallbackQuestionsWithAnswers.map((question) => [question.id, question]),
);

const fallbackTopics = buildFallbackTopics(fallbackQuestionsWithAnswers);
const fallbackSimulationsWithAnswers = buildFallbackSimulations(
  fallbackQuestionsWithAnswers,
);
const fallbackSimulationsForClient = fallbackSimulationsWithAnswers.map(
  (simulation) => ({
    ...simulation,
    simulation_questions: simulation.simulation_questions.map((item) => ({
      ...item,
      questions: stripFallbackAnswerKey(item.questions),
    })),
  }),
);
const fallbackSimulationById = new Map(
  fallbackSimulationsWithAnswers.map((simulation) => [simulation.id, simulation]),
);

export function getFallbackQuestionRecords(options: FallbackOptions = {}) {
  return options.includeAnswerKeys
    ? fallbackQuestionsWithAnswers
    : fallbackQuestionsForClient;
}

export function getFallbackTopicsWithPerformance() {
  return fallbackTopics;
}

export function getFallbackSimulations(options: FallbackOptions = {}) {
  return options.includeAnswerKeys
    ? fallbackSimulationsWithAnswers
    : fallbackSimulationsForClient;
}

export function isFallbackQuestionId(questionId: string) {
  return questionId.startsWith(fallbackQuestionIdPrefix);
}

export function isFallbackSimulationId(simulationId: string) {
  return simulationId.startsWith(fallbackSimulationIdPrefix);
}

export function getFallbackQuestionWithAnswer(questionId: string) {
  return fallbackQuestionById.get(questionId) ?? null;
}

export function scoreFallbackSimulation(
  simulationId: string,
  answers: Record<string, string>,
) {
  const simulation = fallbackSimulationById.get(simulationId);
  if (!simulation) return null;

  const questions = simulation.simulation_questions
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => item.questions);
  const results = questions
    .filter((question) => Boolean(answers[question.id]))
    .map((question) => ({
      questionId: question.id,
      isCorrect: question.correct_option === answers[question.id],
    }));
  const correct = results.filter((item) => item.isCorrect).length;
  const total = questions.length;

  return {
    results,
    correct,
    total,
    percentage: total ? Math.round((correct / total) * 100) : 0,
  };
}

function buildFallbackQuestion(
  row: FallbackImportRow,
  index: number,
  includeAnswerKey: boolean,
): QuestionRecord {
  const createdAt = row.reviewed_at || row.last_editorial_review_at || "2026-07-19T00:00:00.000Z";
  const sourceSlug = slugify(
    [row.source, row.exam_day, row.question_number ?? index + 1].join("-"),
  );
  const questionId = `${fallbackQuestionIdPrefix}${sourceSlug}-${index + 1}`;
  const area = displayArea(row.area);
  const subjectName = displaySubject(row.subject || row.discipline || area);
  const topicName = displayTopic(row.topic);
  const subjectId = `fallback-subject-${slugify(`${area}-${subjectName}`)}`;
  const topicId = `fallback-topic-${slugify(`${area}-${subjectName}-${topicName}`)}`;
  const difficulty = displayDifficulty(row.difficulty);
  const recurrenceCategory = row.recurrence_category || row.estimated_priority || "Complementar";
  const mediaUrl = row.media_url || null;

  return {
    id: questionId,
    statement: row.statement,
    subject_id: subjectId,
    topic_id: topicId,
    difficulty,
    year: Number(row.year),
    source: row.source,
    source_url: row.source_url || null,
    exam_name: row.exam_name || "ENEM",
    exam_color: row.exam_color || null,
    question_number: row.question_number || null,
    is_demo: Boolean(row.is_demo),
    is_official: Boolean(row.is_official),
    is_authorial: Boolean(row.is_authorial),
    is_inspired: Boolean(row.is_inspired),
    exam_edition: row.exam_edition || null,
    exam_day: row.exam_day || null,
    discipline: displaySubject(row.discipline || subjectName),
    subtopic: row.subtopic || null,
    competence: row.competence || null,
    skill: row.skill || null,
    content_recurrence: row.content_recurrence || null,
    charge_pattern: row.charge_pattern || null,
    estimated_priority: recurrenceCategory,
    priority_score: Number(row.priority_score ?? 0),
    confidence_level: row.confidence_level || null,
    priority_reason: row.priority_reason || null,
    official_source: row.official_source || row.source_pdf || null,
    official_exam_url: row.official_exam_url || row.source_url || null,
    official_answer_key_url: row.official_answer_key_url || null,
    priority_is_educational_estimate:
      row.priority_is_educational_estimate ?? true,
    last_editorial_review_at: row.last_editorial_review_at || createdAt,
    editorial_reviewer: row.editorial_reviewer || null,
    reviewed: Boolean(row.reviewed),
    review_status: row.review_status || "approved",
    reviewed_by: row.reviewed_by || null,
    reviewed_at: row.reviewed_at || createdAt,
    editorial_notes: row.editorial_notes || null,
    source_verified: Boolean(row.source_verified),
    answer_verified: Boolean(row.answer_verified),
    media_verified: Boolean(row.media_verified),
    media_required: Boolean(row.media_required),
    classification_version: row.classification_version || "fallback-2026-07",
    recurrence_category: recurrenceCategory,
    explanation: includeAnswerKey ? row.explanation : "",
    correct_option: includeAnswerKey ? row.correct_option : "",
    created_at: createdAt,
    media_url: mediaUrl,
    media_alt: row.media_alt || null,
    media_metadata:
      mediaUrl && (row.media_width || row.media_height)
        ? { width: row.media_width ?? null, height: row.media_height ?? null }
        : null,
    subjects: {
      id: subjectId,
      name: subjectName,
      area,
      slug: slugify(`${area}-${subjectName}`),
    },
    topics: {
      id: topicId,
      subject_id: subjectId,
      name: topicName,
      slug: slugify(`${area}-${subjectName}-${topicName}`),
      historical_recurrence: Number(row.priority_score ?? 0),
      priority_weight: Number(((row.priority_score ?? 0) / 10).toFixed(2)),
      difficulty_level: difficulty,
      strategic_importance: Number(
        Math.min(10, Number(row.priority_score ?? 0) / 10).toFixed(2),
      ),
    },
    question_options: [
      ["A", row.option_a],
      ["B", row.option_b],
      ["C", row.option_c],
      ["D", row.option_d],
      ["E", row.option_e],
    ].map(([optionKey, optionText]) => ({
      id: `${questionId}-option-${optionKey}`,
      question_id: questionId,
      option_key: optionKey,
      option_text: optionText,
    })),
    question_media: mediaUrl
      ? [
          {
            id: `${questionId}-media-1`,
            question_id: questionId,
            media_type: row.media_type || "image",
            url: mediaUrl,
            alt_text:
              row.media_alt ||
              `Mídia da questão ${row.question_number || index + 1}`,
            caption: row.media_caption || null,
            source_pdf: row.source_pdf || row.official_source || null,
            source_page: row.source_page || null,
            width: row.media_width || null,
            height: row.media_height || null,
            sort_order: 0,
            verified: Boolean(row.media_verified),
            created_at: createdAt,
          },
        ]
      : [],
    user_question_answers: [],
    user_question_reviews: [],
  };
}

function stripFallbackAnswerKey(question: QuestionRecord): QuestionRecord {
  return {
    ...question,
    correct_option: "",
    explanation: "",
    question_options: question.question_options.map((option) => ({ ...option })),
    question_media: question.question_media?.map((media) => ({ ...media })) ?? [],
    subjects: { ...question.subjects },
    topics: { ...question.topics },
    user_question_answers: [],
    user_question_reviews: [],
  };
}

function buildFallbackTopics(questions: QuestionRecord[]): TopicWithSubject[] {
  const byTopic = new Map<
    string,
    {
      topic: TopicWithSubject;
      scores: number[];
      difficulties: string[];
    }
  >();

  for (const question of questions) {
    const current =
      byTopic.get(question.topics.id) ??
      {
        topic: {
          ...question.topics,
          subjects: { ...question.subjects },
          user_topic_performance: [],
        },
        scores: [],
        difficulties: [],
      };
    current.scores.push(Number(question.priority_score ?? 0));
    current.difficulties.push(question.difficulty);
    byTopic.set(question.topics.id, current);
  }

  return Array.from(byTopic.values())
    .map(({ topic, scores, difficulties }) => {
      const recurrence = Math.round(
        scores.reduce((sum, score) => sum + score, 0) / Math.max(scores.length, 1),
      );
      return {
        ...topic,
        historical_recurrence: recurrence,
        priority_weight: Number((recurrence / 10).toFixed(2)),
        difficulty_level: mostFrequent(difficulties),
        strategic_importance: Number(Math.min(10, recurrence / 10).toFixed(2)),
      };
    })
    .sort(
      (a, b) =>
        Number(b.historical_recurrence) - Number(a.historical_recurrence) ||
        a.name.localeCompare(b.name),
    );
}

function buildFallbackSimulations(
  questions: QuestionRecord[],
): SimulationWithQuestions[] {
  const byNewest = questions
    .slice()
    .sort(
      (a, b) =>
        Number(b.year) - Number(a.year) ||
        Number(b.priority_score ?? 0) - Number(a.priority_score ?? 0),
    );

  const specs = [
    {
      id: "diagnostico-oficial",
      title: "Diagnóstico oficial ENEM",
      description:
        "Amostra balanceada com questões oficiais das quatro áreas para localizar gargalos rapidamente.",
      difficulty: "Média",
      duration: 72,
      count: 24,
      questions: pickBalanced(byNewest, 24),
    },
    {
      id: "matematica-essencial",
      title: "Matemática essencial",
      description:
        "Treino cronometrado de matemática com foco em tópicos recorrentes e questões oficiais.",
      difficulty: "Alta",
      duration: 60,
      count: 20,
      questions: pickBalanced(
        byNewest.filter((question) => question.subjects.area === "Matemática"),
        20,
      ),
    },
    {
      id: "natureza-intensivo",
      title: "Natureza intensivo",
      description:
        "Biologia, Física e Química em uma sequência curta para revisar cobrança contextualizada.",
      difficulty: "Alta",
      duration: 60,
      count: 20,
      questions: pickBalanced(
        byNewest.filter(
          (question) => question.subjects.area === "Ciências da Natureza",
        ),
        20,
      ),
    },
    {
      id: "linguagens-humanas",
      title: "Linguagens e Humanas",
      description:
        "Leitura, interpretação e análise social com itens oficiais de Dia 1.",
      difficulty: "Média",
      duration: 72,
      count: 24,
      questions: pickBalanced(
        byNewest.filter((question) =>
          ["Linguagens", "Ciências Humanas"].includes(question.subjects.area),
        ),
        24,
      ),
    },
    {
      id: "reta-final-recorrencia",
      title: "Reta final por recorrência",
      description:
        "Questões de maior prioridade editorial para um treino de revisão amplo.",
      difficulty: "Alta",
      duration: 90,
      count: 30,
      questions: pickBalanced(
        byNewest
          .slice()
          .sort(
            (a, b) =>
              Number(b.priority_score ?? 0) - Number(a.priority_score ?? 0) ||
              Number(b.year) - Number(a.year),
          ),
        30,
      ),
    },
  ];

  return specs.map((spec) => ({
    id: `${fallbackSimulationIdPrefix}${spec.id}`,
    title: spec.title,
    description: spec.description,
    duration_minutes: spec.duration,
    difficulty: spec.difficulty,
    status: "Disponível",
    created_by: null,
    is_generated: false,
    criteria: null,
    created_at: "2026-07-19T00:00:00.000Z",
    simulation_questions: spec.questions.slice(0, spec.count).map((question, index) => ({
      position: index + 1,
      questions: question,
    })),
    user_simulations: [],
  }));
}

function pickBalanced(questions: QuestionRecord[], count: number) {
  const groups = new Map<string, QuestionRecord[]>();
  for (const question of questions) {
    const key = `${question.subjects.area}:${question.topics.name}`;
    groups.set(key, [...(groups.get(key) ?? []), question]);
  }

  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    const aScore = Math.max(...a.map((question) => Number(question.priority_score ?? 0)));
    const bScore = Math.max(...b.map((question) => Number(question.priority_score ?? 0)));
    return bScore - aScore || b.length - a.length;
  });

  const picked: QuestionRecord[] = [];
  let round = 0;
  while (picked.length < count) {
    let added = false;
    for (const group of sortedGroups) {
      const question = group[round];
      if (!question) continue;
      picked.push(question);
      added = true;
      if (picked.length >= count) break;
    }
    if (!added) break;
    round += 1;
  }

  return picked;
}

function isApprovedFallbackRow(row: FallbackImportRow) {
  return (
    row.reviewed === true &&
    row.review_status === "approved" &&
    row.source_verified === true &&
    row.answer_verified === true &&
    Boolean(row.statement) &&
    Boolean(row.correct_option)
  );
}

function displayArea(value: string) {
  const key = normalizeKey(value);
  const labels: Record<string, string> = {
    matematica: "Matemática",
    linguagens: "Linguagens",
    "ciencias humanas": "Ciências Humanas",
    "ciencias da natureza": "Ciências da Natureza",
    redacao: "Redação",
  };
  return labels[key] ?? value;
}

function displaySubject(value: string) {
  const key = normalizeKey(value);
  const labels: Record<string, string> = {
    matematica: "Matemática",
    fisica: "Física",
    quimica: "Química",
    historia: "História",
    geografia: "Geografia",
    sociologia: "Sociologia",
    filosofia: "Filosofia",
    biologia: "Biologia",
    ingles: "Inglês",
    espanhol: "Espanhol",
    linguagens: "Linguagens",
    redacao: "Redação",
  };
  return labels[key] ?? value;
}

function displayTopic(value: string) {
  return value.normalize("NFC");
}

function displayDifficulty(value: string) {
  const key = normalizeKey(value);
  if (key === "media") return "Média";
  if (key === "baixa") return "Baixa";
  if (key === "alta") return "Alta";
  return value;
}

function mostFrequent(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return (
    Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ??
    "Média"
  );
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return normalizeKey(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
