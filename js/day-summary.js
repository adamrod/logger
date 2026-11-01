import { entryDate } from './entry-log.js';
import { dayKey } from './format.js';
import { variantRows } from './set-history.js';

const onDay = (day) => (entry) => dayKey(entryDate(entry)) === dayKey(day);

export const loggedDays = (...entryLists) => [...new Set(entryLists.flat().map((entry) => dayKey(entryDate(entry))))]
  .sort((a, b) => a - b)
  .map((key) => new Date(key));

export function nearbyDays(days, day) {
  const key = dayKey(day);
  return {
    previous: days.findLast((logged) => dayKey(logged) < key) ?? null,
    next: days.find((logged) => dayKey(logged) > key) ?? null,
  };
}

export function daySummary(day, sets, weighIns) {
  const daySets = sets.filter(onDay(day));
  const exercises = [...Map.groupBy(daySets, (set) => set.exercise)]
    .map(([exercise, exerciseSets]) => ({ exercise, rows: variantRows(exerciseSets) }));
  return { exercises, setCount: daySets.length, bodyWeight: weighIns.findLast(onDay(day))?.weight ?? null };
}
