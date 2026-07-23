export const ENEM_OBJECTIVE_QUESTIONS_PER_DAY = 90;
export const ENEM_OBJECTIVE_MINUTES_PER_DAY = 300;

export function calculateSimulationDurationMinutes(questionCount: number) {
  return Math.round(
    (questionCount * ENEM_OBJECTIVE_MINUTES_PER_DAY) /
      ENEM_OBJECTIVE_QUESTIONS_PER_DAY,
  );
}
