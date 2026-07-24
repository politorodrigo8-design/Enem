const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function calculateStudyStreak(studyDates, today) {
  if (!isoDatePattern.test(today)) return 0;

  const dates = new Set([...studyDates].filter((date) => isoDatePattern.test(date)));
  let cursor = dates.has(today) ? today : addDaysISO(today, -1);
  let streak = 0;

  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }

  return streak;
}

export function addDaysISO(value, days) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
