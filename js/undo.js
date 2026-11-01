import { notifyChange } from './events.js';

const MAX_STEPS = 100;

let done = [];
let undone = [];
let step = null;
let placeNow = () => null;

const afterThisAction = (callback) => Promise.resolve().then(callback);

export const canUndo = () => done.length > 0;

export const canRedo = () => undone.length > 0;

export function trackPlace(currentPlace) {
  placeNow = currentPlace;
}

export function undoable(action, key = null) {
  if (step) return action();
  step = { key, parts: [], before: placeNow(), after: null };
  try {
    return action();
  } finally {
    keep(step);
    step = null;
  }
}

export function recordChange(target, before, after) {
  if (step) step.parts = withChange(step.parts, { target, before, after });
}

export function nextUndo() {
  const step = done.at(-1);
  if (!step) return null;
  const parts = step.parts.toReversed().map(({ target, before, after }) => ({ target, from: after, to: before }));
  return replayOf(step.before, parts, () => {
    done = done.filter((kept) => kept !== step);
    undone = [...undone, step];
  });
}

export function nextRedo() {
  const step = undone.at(-1);
  if (!step) return null;
  const parts = step.parts.map(({ target, before, after }) => ({ target, from: before, to: after }));
  return replayOf(step.after, parts, () => {
    undone = undone.filter((kept) => kept !== step);
    done = [...done, step];
  });
}

function keep(finished) {
  if (!finished.parts.length) return;
  const last = done.at(-1);
  const isContinued = finished.key !== null && last?.key === finished.key;
  if (isContinued) last.parts = finished.parts.reduce(withChange, last.parts);
  else done = [...done, finished].slice(-MAX_STEPS);
  const kept = isContinued ? last : finished;
  undone = [];
  afterThisAction(() => { kept.after = placeNow(); });
  notifyChange();
}

function withChange(parts, change) {
  const earlier = parts.find((part) => part.target === change.target);
  if (!earlier) return [...parts, change];
  const combined = { target: change.target, ...change.target.combine(earlier, change) };
  return parts.map((part) => (part === earlier ? combined : part));
}

function replayOf(place, parts, move) {
  return {
    place,
    parts,
    apply() {
      move();
      parts.forEach(({ target, from, to }) => target.replace(from, to));
      notifyChange();
    },
  };
}
