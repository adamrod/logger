import { createEntryLog } from './entry-log.js';
import { notifyChange } from './events.js';
import { mergeLists } from './name-list.js';

const KEYS = {
  exercises: 'logger.v2.exercise-list',
  variants: 'logger.v2.variant-lists',
  chosenVariants: 'logger.v2.chosen-variants',
};
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

export const entryLogs = [sets, bodyWeights, notes];

let exerciseList = JSON.parse(localStorage.getItem(KEYS.exercises) ?? 'null') ?? EMPTY_LIST;
let variantLists = JSON.parse(localStorage.getItem(KEYS.variants) ?? '{}');
let chosenVariants = JSON.parse(localStorage.getItem(KEYS.chosenVariants) ?? '{}');

export const getExerciseList = () => exerciseList;

export const getVariantList = (exercise) => variantLists[exercise] ?? EMPTY_LIST;

export function saveExerciseList(list) {
  exerciseList = list;
  localStorage.setItem(KEYS.exercises, JSON.stringify(exerciseList));
  notifyChange();
}

export const saveVariantList = (exercise, list) => saveVariantLists({ ...variantLists, [exercise]: list });

export function moveVariantList(from, to) {
  const { [from]: moved = EMPTY_LIST, ...others } = variantLists;
  saveVariantLists({ ...others, [to]: mergeLists(others[to] ?? EMPTY_LIST, moved) });
}

export const getChosenVariant = (exercise) => chosenVariants[exercise];

export function saveChosenVariant(exercise, variant) {
  chosenVariants = { ...chosenVariants, [exercise]: variant };
  localStorage.setItem(KEYS.chosenVariants, JSON.stringify(chosenVariants));
}

function saveVariantLists(lists) {
  variantLists = lists;
  localStorage.setItem(KEYS.variants, JSON.stringify(variantLists));
  notifyChange();
}
