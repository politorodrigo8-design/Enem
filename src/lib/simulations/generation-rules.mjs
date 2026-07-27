/**
 * @template T
 * @param {T[]} items
 * @param {() => number} [random]
 * @returns {T[]}
 */
function shuffle(items, random = Math.random) {
  return [...items].sort(() => random() - 0.5);
}

function topicIdFor(question) {
  return String(question?.topic_id ?? "sem-topico");
}

function questionIdFor(question) {
  return String(question?.id ?? "");
}

/**
 * @param {{ total_answers?: number | string | null, correct_answers?: number | string | null, accuracy_percentage?: number | string | null, priority_score?: number | string | null }} [performance]
 */
export function buildSimulationTopicWeaknessScore(performance = {}) {
  const totalAnswers = Number(performance.total_answers) || 0;
  const correctAnswers = Number(performance.correct_answers) || 0;
  const wrongAnswers = Math.max(0, totalAnswers - correctAnswers);
  const accuracy = Number(performance.accuracy_percentage) || 0;
  const errorRate = totalAnswers ? Math.max(0, 100 - accuracy) : 0;
  const priorityScore = Number(performance.priority_score) || 0;

  return Number(
    (
      priorityScore +
      wrongAnswers * 6 +
      errorRate / 3 +
      Math.min(totalAnswers, 10)
    ).toFixed(2),
  );
}

/**
 * @param {{
 *   candidates?: Array<{ id: string, topic_id?: string | null }>,
 *   count: number,
 *   prioritizeWeaknesses?: boolean,
 *   weaknessByTopic?: Map<string, number>,
 *   random?: () => number,
 * }} input
 * @returns {string[]}
 */
export function selectBalancedSimulationQuestionIds({
  candidates = [],
  count,
  prioritizeWeaknesses = false,
  weaknessByTopic = new Map(),
  random = Math.random,
}) {
  const questionCount = Math.max(0, Math.floor(Number(count) || 0));
  if (!questionCount || candidates.length < questionCount) return [];

  const byTopic = new Map();
  for (const candidate of candidates) {
    const id = questionIdFor(candidate);
    if (!id) continue;
    const topicId = topicIdFor(candidate);
    byTopic.set(topicId, [...(byTopic.get(topicId) ?? []), candidate]);
  }

  const groups = Array.from(byTopic.entries()).map(([topicId, questions]) => ({
    topicId,
    questions: shuffle(questions, random),
    picked: 0,
    weight: Math.max(1, Number(weaknessByTopic.get(topicId)) || 0),
  }));
  if (!groups.length) return [];

  if (!prioritizeWeaknesses) {
    const picked = [];
    const shuffledGroups = shuffle(groups, random);
    let round = 0;
    while (picked.length < questionCount) {
      let addedThisRound = false;
      for (const group of shuffledGroups) {
        if (picked.length >= questionCount) break;
        const candidate = group.questions[round];
        if (!candidate) continue;
        picked.push(questionIdFor(candidate));
        addedThisRound = true;
      }
      if (!addedThisRound) break;
      round += 1;
    }
    return picked.length === questionCount ? picked : [];
  }

  const picked = [];
  const maxPerTopic = Math.max(2, Math.ceil(questionCount * 0.45));
  while (picked.length < questionCount) {
    const availableGroups = groups.filter(
      (group) => group.picked < group.questions.length && group.picked < maxPerTopic,
    );
    const pool = availableGroups.length
      ? availableGroups
      : groups.filter((group) => group.picked < group.questions.length);
    if (!pool.length) break;

    pool.sort((a, b) => {
      const weightedNeed = b.weight / (b.picked + 1) - a.weight / (a.picked + 1);
      return (
        weightedNeed ||
        b.weight - a.weight ||
        b.questions.length - b.picked - (a.questions.length - a.picked)
      );
    });

    const group = pool[0];
    const candidate = group.questions[group.picked];
    if (!candidate) break;
    picked.push(questionIdFor(candidate));
    group.picked += 1;
  }

  return picked.length === questionCount ? picked : [];
}
