import { visibleNames, withName, withoutName } from './name-list.js';
import { getEntries, getExerciseList, getVariantList, saveExerciseList, saveVariantList } from './store.js';

const loggedExercises = () => getEntries().map((entry) => entry.exercise);

const loggedVariants = (exercise) => getEntries()
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

export function addVariant(exercise, name) {
  const { name: known, list } = withName(getVariantList(exercise), loggedVariants(exercise), name);
  if (list !== getVariantList(exercise)) saveVariantList(exercise, list);
  return known;
}

export const removeVariant = (exercise, name) => saveVariantList(exercise, withoutName(getVariantList(exercise), name));
