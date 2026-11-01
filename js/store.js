import { createEntryLog } from './entry-log.js';
import { mergeLists } from './name-list.js';

const LIST_KEYS = { exercises: 'logger.v2.exercise-list', variants: 'logger.v2.variant-lists' };
const EMPTY_LIST = { added: [], removed: [] };

export const sets = createEntryLog({
  file: 'data.csv',
  columns: ['timestamp', 'exercise', 'variant', 'reps', 'weight'],
  numbers: ['reps', 'weight'],
  keys: { entries: 'logger.v2.entries.csv', sync: 'logger.v2.sync' },
});

export const bodyWeights = createEntryLog({
  file: 'bodyweight.csv',
  columns: ['timestamp', 'weight'],
  numbers: ['weight'],
  keys: { entries: 'logger.v2.bodyweight.csv', sync: 'logger.v2.bodyweight-sync' },
});

export const notes = createEntryLog({
  file: 'notes.csv',
  columns: ['timestamp', 'exercise', 'note'],
  numbers: [],
  keys: { entries: 'logger.v2.notes.csv', sync: 'logger.v2.notes-sync' },
});

export const names = createEntryLog({
  file: 'names.csv',
  columns: ['timestamp', 'exercise', 'variant', 'state'],
  numbers: [],
  keys: { entries: 'logger.v2.names.csv', sync: 'logger.v2.names-sync' },
});

export const entryLogs = [sets, bodyWeights, notes, names];

const exerciseScope = {
  holds: (row) => !row.variant,
  nameOf: (row) => row.exercise,
  rowFor: (name) => ({ exercise: name }),
};

const variantScope = (exercise) => ({
  holds: (row) => row.exercise === exercise && Boolean(row.variant),
  nameOf: (row) => row.variant,
  rowFor: (name) => ({ exercise, variant: name }),
});

function stateIn({ added, removed }, name) {
  if (added.includes(name)) return 'added';
  if (removed.includes(name)) return 'removed';
  return null;
}

function listIn({ holds, nameOf }) {
  const rows = names.getEntries().filter(holds);
  const namesWith = (state) => [...new Set(rows.filter((row) => row.state === state).map(nameOf))];
  return { added: namesWith('added'), removed: namesWith('removed') };
}

function saveListIn({ holds, nameOf, rowFor }, list) {
  const rows = names.getEntries().filter(holds);
  rows.forEach((row) => {
    const state = stateIn(list, nameOf(row));
    if (!state) names.remove(row.timestamp);
    else if (state !== row.state) names.update(row.timestamp, { state });
  });
  const stored = new Set(rows.map(nameOf));
  [...list.added, ...list.removed]
    .filter((name) => !stored.has(name))
    .forEach((name) => names.add({ ...rowFor(name), state: stateIn(list, name) }));
}

export const getExerciseList = () => listIn(exerciseScope);

export const getVariantList = (exercise) => listIn(variantScope(exercise));

export const saveExerciseList = (list) => saveListIn(exerciseScope, list);

export const saveVariantList = (exercise, list) => saveListIn(variantScope(exercise), list);

export function moveVariantList(from, to) {
  const moved = getVariantList(from);
  saveVariantList(from, EMPTY_LIST);
  saveVariantList(to, mergeLists(getVariantList(to), moved));
}

export function moveListsToNames() {
  const exerciseList = JSON.parse(localStorage.getItem(LIST_KEYS.exercises) ?? 'null');
  const variantLists = JSON.parse(localStorage.getItem(LIST_KEYS.variants) ?? '{}');
  if (exerciseList) saveExerciseList(exerciseList);
  Object.entries(variantLists).forEach(([exercise, list]) => saveVariantList(exercise, list));
  Object.values(LIST_KEYS).forEach((key) => localStorage.removeItem(key));
}
