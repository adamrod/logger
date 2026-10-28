import { getEntries, getExerciseList, saveExerciseList } from './store.js';

export function allExercises() {
  const { added, removed } = getExerciseList();
  const logged = getEntries().map((entry) => entry.exercise);
  return [...new Set([...added, ...logged])].filter((name) => !removed.includes(name));
}

export function addExercise(name) {
  const { added, removed } = getExerciseList();
  const known = [...allExercises(), ...removed].find((existing) => existing.toLowerCase() === name.toLowerCase()) ?? name;
  if (!allExercises().includes(known)) {
    saveExerciseList({ added: [...added, known], removed: removed.filter((existing) => existing !== known) });
  }
  return known;
}

export function removeExercise(name) {
  const { added, removed } = getExerciseList();
  saveExerciseList({ added: added.filter((existing) => existing !== name), removed: [...removed, name] });
}
