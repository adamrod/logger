import { roundValue } from './format.js';
import { DECIMAL } from './number-field.js';

export function currentGoal(entries) {
  const latest = entries.at(-1);
  return latest?.low === undefined ? null : { low: latest.low, high: latest.high };
}

export function readGoal(texts) {
  const bounds = texts.map(DECIMAL.parse);
  return bounds.every((value) => value > 0) ? { low: Math.min(...bounds), high: Math.max(...bounds) } : null;
}

export const goalType = (goal) => (goal && goal.low === goal.high ? 'exact' : 'range');

export const isSameGoal = (a, b) => a?.low === b?.low && a?.high === b?.high;

export function goalText({ low, high }) {
  const bounds = low === high ? [low] : [low, high];
  return bounds.map(roundValue).join('–');
}

export function goalGap(weight, { low, high }) {
  if (weight > high) return roundValue(weight - high);
  if (weight < low) return roundValue(weight - low);
  return 0;
}

export function goalGapText(weight, goal) {
  const gap = goalGap(weight, goal);
  if (gap > 0) return `${gap} over`;
  if (gap < 0) return `${-gap} under`;
  return 'on goal';
}
