import { entryDate } from './entry-log.js';
import { dayKey, roundValue } from './format.js';

const COMPARE = {
  weight: (a, b) => a.weight - b.weight || a.reps - b.reps,
  reps: (a, b) => a.reps - b.reps || a.weight - b.weight,
};

const byDay = (sets) => [...Map.groupBy(sets, (set) => dayKey(entryDate(set))).values()];

const topSet = (day, metric) => day.reduce((top, set) => (COMPARE[metric](set, top) > 0 ? set : top));

const volume = (day) => roundValue(day.reduce((sum, set) => sum + set.reps * set.weight, 0));

const toTenth = (value) => Math.round(value * 10) / 10;

const isMostlyUnweighted = (sets) => sets.filter((set) => set.weight === 0).length > sets.length / 2;

export const defaultMetric = (sets) => (isMostlyUnweighted(sets) ? 'reps' : 'weight');

export function dailySeries(sets, metric, weighIns = []) {
  return byDay(sets).map((day) => {
    if (metric === 'volume') return { date: entryDate(day[0]), value: volume(day) };
    if (metric === 'relative') return relativePoint(topSet(day, 'weight'), weighIns);
    const set = topSet(day, metric);
    return { set, date: entryDate(set), value: set[metric] };
  });
}

export function bestDayIndex(daily, metric) {
  const compare = COMPARE[metric] ? (a, b) => COMPARE[metric](a.set, b.set) : (a, b) => a.value - b.value;
  return daily.reduce((best, day, index) => (compare(day, daily[best]) > 0 ? index : best), 0);
}

function relativePoint(set, weighIns) {
  const date = entryDate(set);
  const bodyWeight = toTenth(bodyWeightAt(weighIns, date));
  return { set, date, bodyWeight, value: Math.round((set.weight / bodyWeight) * 100) };
}

export function bodyWeightAt(weighIns, date) {
  const time = date.getTime();
  const nextIndex = weighIns.findIndex((entry) => entryDate(entry).getTime() >= time);
  if (nextIndex === -1) return weighIns.at(-1).weight;
  if (nextIndex === 0) return weighIns[0].weight;
  const before = weighIns[nextIndex - 1];
  const after = weighIns[nextIndex];
  const start = entryDate(before).getTime();
  const share = (time - start) / (entryDate(after).getTime() - start);
  return before.weight + share * (after.weight - before.weight);
}

export function repRecords(sets) {
  return [...Map.groupBy(sets, (set) => roundValue(set.weight)).values()]
    .map((sameWeight) => sameWeight.reduce((best, set) => (set.reps > best.reps ? set : best)))
    .sort((a, b) => b.weight - a.weight);
}
