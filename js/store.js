import { createEntryLog } from './entry-log.js';
import { notifyChange } from './events.js';
import { mergeLists } from './name-list.js';
import { recordChange } from './undo.js';

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

const exerciseList = createUndoableValue(KEYS.exercises, EMPTY_LIST);
const variantLists = createUndoableValue(KEYS.variants, {});
let chosenVariants = JSON.parse(localStorage.getItem(KEYS.chosenVariants) ?? '{}');

export const getExerciseList = exerciseList.get;

export const getVariantList = (exercise) => variantLists.get()[exercise] ?? EMPTY_LIST;

export const saveExerciseList = exerciseList.save;

export const saveVariantList = (exercise, list) => variantLists.save({ ...variantLists.get(), [exercise]: list });

export function moveVariantList(from, to) {
  const { [from]: moved = EMPTY_LIST, ...others } = variantLists.get();
  variantLists.save({ ...others, [to]: mergeLists(others[to] ?? EMPTY_LIST, moved) });
}

export const getChosenVariant = (exercise) => chosenVariants[exercise];

export function saveChosenVariant(exercise, variant) {
  chosenVariants = { ...chosenVariants, [exercise]: variant };
  localStorage.setItem(KEYS.chosenVariants, JSON.stringify(chosenVariants));
}

function createUndoableValue(key, fallback) {
  let value = JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;

  function replace(previous, next) {
    value = next;
    localStorage.setItem(key, JSON.stringify(value));
    notifyChange();
  }

  const saved = {
    get: () => value,
    save: (next) => {
      recordChange(saved, value, next);
      replace(value, next);
    },
    replace,
    combine: ({ before }, { after }) => ({ before, after }),
  };
  return saved;
}
