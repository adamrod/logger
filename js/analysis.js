import { entryDate } from './entry-log.js';
import { dayKey, roundValue } from './format.js';

const COMPARE = {
  weight: (a, b) => a.weight - b.weight || a.reps - b.reps,
  reps: (a, b) => a.reps - b.reps || a.weight - b.weight,
};

const byDay = (sets) => [...Map.groupBy(sets, (set) => dayKey(entryDate(set))).values()];

const topSet = (day, metric) => day.reduce((top, set) => (COMPARE[metric](set, top) > 0 ? set : top));

const volume = (day) => roundValue(day.reduce((sum, set) => sum + set.reps * set.weight, 0));

const isMostlyUnweighted = (sets) => sets.filter((set) => set.weight === 0).length > sets.length / 2;

export const defaultMetric = (sets) => (isMostlyUnweighted(sets) ? 'reps' : 'weight');

export function dailySeries(sets, metric) {
  return byDay(sets).map((day) => {
    if (metric === 'volume') return { date: entryDate(day[0]), value: volume(day) };
    const set = topSet(day, metric);
    return { set, date: entryDate(set), value: set[metric] };
  });
}

export function repRecords(sets) {
  return [...Map.groupBy(sets, (set) => roundValue(set.weight)).values()]
    .map((sameWeight) => sameWeight.reduce((best, set) => (set.reps > best.reps ? set : best)))
    .sort((a, b) => b.weight - a.weight);
}
