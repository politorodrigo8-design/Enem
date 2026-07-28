import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildQuestionAnswerRecord,
  cleanQuestionStatement,
  hasOcrResidue,
  latestQuestionAnswer,
  nextReviewToggle,
  optionRefersToImage,
  recommendedQuestionsPerTopic,
  recommendedTopicCount,
  selectRecommendedQuestions,
} from "../src/lib/questions/rules.mjs";

const qualitySource = readFileSync(
  new URL("../src/lib/questions/quality.ts", import.meta.url),
  "utf8",
);
const queriesSource = readFileSync(
  new URL("../src/lib/db/queries.ts", import.meta.url),
  "utf8",
);

// quality.ts é TypeScript e não pode ser importado por estes testes; a regra é
// travada pela fonte. Foi a ausência dessa guarda que deixou passar um banco sem
// acervo servindo as 11 questões demonstrativas do seed.sql como se fossem o
// produto — e, por serem 11 > 0, o acervo local de reserva nem era consultado.
test("questao demonstrativa nunca chega ao aluno e a revisao e obrigatoria", () => {
  assert.match(qualitySource, /if \(question\.is_demo\) \{\s*return false;/);
  // O portão de revisão não pode voltar a ter exceção para is_demo.
  assert.doesNotMatch(qualitySource, /!question\.is_demo &&/);
  assert.match(
    qualitySource,
    /!question\.reviewed \|\|\s*question\.review_status !== "approved"/,
  );
});

test("acervo local entra quando o banco nao tem questao liberada", () => {
  assert.match(queriesSource, /if \(readyRecords\.length > 0\) \{\s*return readyRecords;/);
  assert.match(queriesSource, /return getFallbackQuestionRecords\(\);/);
  // Paginação: sem ela a API corta em max_rows e o acervo para de crescer.
  assert.match(queriesSource, /\.range\(from, from \+ questionPageSize - 1\)/);
});

test("monta payload real de persistencia de resposta e resultado correto", () => {
  const answer = buildQuestionAnswerRecord({
    userId: "user-1",
    question: {
      id: "question-1",
      correct_option: "B",
      explanation: "Porque B corresponde ao comando.",
    },
    selectedOption: "B",
    responseTimeSeconds: 12,
  });

  assert.deepEqual(answer.row, {
    user_id: "user-1",
    question_id: "question-1",
    selected_option: "B",
    is_correct: true,
    response_time_seconds: 12,
  });
  assert.equal(answer.result.isCorrect, true);
});

test("toggle de favorito insere quando nao existe e remove quando existe", () => {
  assert.deepEqual(nextReviewToggle(null, "user-1", "question-1"), {
    operation: "insert",
    reviewed: true,
    row: {
      user_id: "user-1",
      question_id: "question-1",
      mastered: false,
    },
    message: "Questao adicionada a revisao.",
  });

  assert.deepEqual(nextReviewToggle({ id: "review-1" }, "user-1", "question-1"), {
    operation: "delete",
    reviewed: false,
    id: "review-1",
    userId: "user-1",
    message: "Questao removida da revisao.",
  });
});

test("limpa a marca dagua da digitalizacao no enunciado", () => {
  const cleaned = cleanQuestionStatement(
    "——————————>>>>>>>>>>>>>—— enemooz Um segmento de reta está dividido em duas partes.",
  );
  assert.equal(cleaned, "Um segmento de reta está dividido em duas partes.");
  assert.equal(hasOcrResidue(cleaned), false);

  assert.equal(
    cleanQuestionStatement(
      "Analise o experimento descrito. 7 - AZUL - 1º Aplicação enemo027 Exame Nacional Questão94 ————>>>>——",
    ),
    "Analise o experimento descrito.",
  );
  assert.equal(
    cleanQuestionStatement("——————— enemooz Arelação de Newton-Laplace estabelece que…"),
    "A relação de Newton-Laplace estabelece que…",
  );
});

test("aponta enunciado que segue corrompido depois da limpeza", () => {
  const cleaned = cleanQuestionStatement(
    "A curcumina confere cor ———>>>> quando adicionada à água dos criadouros.",
  );
  assert.equal(hasOcrResidue(cleaned), true);
});

test("reconhece alternativa que so remete a uma imagem", () => {
  assert.equal(optionRefersToImage("Alternativa A — ver imagem da questao."), true);
  assert.equal(optionRefersToImage("Ver alternativa C na imagem."), true);
  assert.equal(optionRefersToImage("A imagem mostra um gráfico crescente."), false);
  assert.equal(optionRefersToImage("12 metros por segundo"), false);
});

test("recomendadas ficam nos assuntos prioritarios e nao devolvem o acervo", () => {
  const topics = [
    "Funcoes",
    "Ecologia",
    "Cinematica",
    "Sintaxe",
    "Genetica",
    "Termologia",
    "Geopolitica",
  ];
  const questions = topics.flatMap((name) =>
    Array.from({ length: 6 }, (_, position) => ({
      id: `${name}-${position}`,
      topics: { name },
    })),
  );
  // Score decrescente: "Geopolitica" e o assunto de menor prioridade.
  const topicPriority = Object.fromEntries(
    topics.map((name, position) => [name, { score: 30 - position }]),
  );

  const selected = selectRecommendedQuestions({ questions, topicPriority });
  const selectedTopics = new Set(selected.map((question) => question.topics.name));

  assert.equal(selected.length, recommendedTopicCount * recommendedQuestionsPerTopic);
  assert.ok(selected.length < questions.length);
  assert.equal(selectedTopics.size, recommendedTopicCount);
  assert.equal(selectedTopics.has("Geopolitica"), false);
  assert.equal(selected[0].topics.name, "Funcoes");
  // Intercalado: uma sessao curta cobre todos os assuntos prioritarios.
  assert.equal(
    new Set(selected.slice(0, recommendedTopicCount).map((q) => q.topics.name)).size,
    recommendedTopicCount,
  );
  for (const topic of selectedTopics) {
    assert.equal(
      selected.filter((question) => question.topics.name === topic).length,
      recommendedQuestionsPerTopic,
    );
  }
});

test("recomendadas usam o que existe quando o assunto tem poucas questoes", () => {
  const selected = selectRecommendedQuestions({
    questions: [
      { id: "a", topics: { name: "Funcoes" } },
      { id: "b", topics: { name: "Ecologia" } },
    ],
    topicPriority: { Ecologia: { score: 28 }, Funcoes: { score: 12 } },
  });

  assert.deepEqual(
    selected.map((question) => question.id),
    ["b", "a"],
  );
});

test("recupera a resposta persistida mais recente", () => {
  const latest = latestQuestionAnswer([
    { id: "old", answered_at: "2026-07-13T10:00:00Z" },
    { id: "new", answered_at: "2026-07-14T10:00:00Z" },
  ]);
  assert.equal(latest.id, "new");
});
