import { forgetName, visibleNames, withName, withoutLogged, withoutName } from './name-list.js';
import { getExerciseList, getVariantList, moveVariantList, saveExerciseList, saveVariantList, notes, sets } from './store.js';

const loggedExercises = () => sets.getEntries().map((entry) => entry.exercise);

const noteEntryOf = (exercise) => notes.getEntries().findLast((entry) => entry.exercise === exercise);

const loggedVariants = (exercise) => sets.getEntries()
  .filter((entry) => entry.exercise === exercise && entry.variant)
  .map((entry) => entry.variant);

export const allExercises = () => visibleNames(getExerciseList(), loggedExercises());

export const allVariants = (exercise) => visibleNames(getVariantList(exercise), loggedVariants(exercise));

export function addExercise(name) {
  const { name: known, list } = withName(getExerciseList(), loggedExercises(), name);
  if (list !== getExerciseList()) saveExerciseList(list);
  return known;
}

export const removeExercise = (name) => saveExerciseList(withoutName(getExerciseList(), name));

export function renameExercise(from, to) {
  const others = loggedExercises().filter((name) => name !== from);
  const { name: known, list } = withName(forgetName(getExerciseList(), from), others, to);
  if (known === from) return from;
  saveExerciseList(list);
  moveVariantList(from, known);
  sets.updateWhere((entry) => entry.exercise === from, { exercise: known });
  notes.updateWhere((entry) => entry.exercise === from, { exercise: known });
  return known;
}

export const isOtherExercise = (name, other) => allExercises()
  .some((existing) => existing !== other && existing.toLowerCase() === name.toLowerCase());

export function addVariant(exercise, name) {
  const { name: known, list } = withName(getVariantList(exercise), loggedVariants(exercise), name);
  if (list !== getVariantList(exercise)) saveVariantList(exercise, list);
  return known;
}

export const removeVariant = (exercise, name) => saveVariantList(exercise, withoutName(getVariantList(exercise), name));

function forgetLogged(list, logged, save) {
  const kept = withoutLogged(list, logged);
  if (kept.added.length < list.added.length) save(kept);
}

export function forgetLoggedNames() {
  forgetLogged(getExerciseList(), loggedExercises(), saveExerciseList);
  allExercises().forEach((exercise) => forgetLogged(
    getVariantList(exercise),
    loggedVariants(exercise),
    (list) => saveVariantList(exercise, list),
  ));
}

export const noteOf = (exercise) => noteEntryOf(exercise)?.note ?? '';

export function saveNote(exercise, text) {
  const entry = noteEntryOf(exercise);
  const hasText = text.trim() !== '';
  if (!entry && hasText) notes.add({ exercise, note: text });
  else if (entry && !hasText) notes.remove(entry.timestamp);
  else if (entry && entry.note !== text) notes.update(entry.timestamp, { note: text });
}
