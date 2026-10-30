import { addVariant, allExercises, allVariants, isOtherExercise, renameExercise } from '../js/exercises.js';
import { sets } from '../js/store.js';
import { assertEqual, test } from './harness.js';

const exercisesOf = (names) => sets.getEntries().filter((entry) => names.includes(entry.exercise)).map((entry) => entry.exercise);

test('renaming moves every set and variant to the new name', () => {
  sets.add({ exercise: 'Pull ups', variant: 'Wide', reps: 8, weight: 0 });
  sets.add({ exercise: 'Pull ups', reps: 6, weight: 10 });
  addVariant('Pull ups', 'Narrow');
  assertEqual(renameExercise('Pull ups', 'Pull-ups'), 'Pull-ups');
  assertEqual(exercisesOf(['Pull ups', 'Pull-ups']), ['Pull-ups', 'Pull-ups']);
  assertEqual(allVariants('Pull-ups'), ['Narrow', 'Wide']);
  assertEqual(allExercises().includes('Pull ups'), false);
});

test('renaming can change only the letter case', () => {
  sets.add({ exercise: 'front squat', reps: 5, weight: 80 });
  assertEqual(renameExercise('front squat', 'Front squat'), 'Front squat');
  assertEqual(exercisesOf(['front squat', 'Front squat']), ['Front squat']);
});

test('renaming onto an existing exercise merges into it', () => {
  sets.add({ exercise: 'Chin ups', reps: 8, weight: 0 });
  sets.add({ exercise: 'Chinups', reps: 7, weight: 0 });
  assertEqual(renameExercise('Chinups', 'chin ups'), 'Chin ups');
  assertEqual(exercisesOf(['Chin ups', 'Chinups']), ['Chin ups', 'Chin ups']);
});

test('renaming to the same name changes nothing', () => {
  sets.add({ exercise: 'Dips', reps: 10, weight: 0 });
  const before = sets.getSyncMeta();
  assertEqual(renameExercise('Dips', 'Dips'), 'Dips');
  assertEqual(sets.getSyncMeta(), before);
});

test('another exercise with the typed name counts as a merge target', () => {
  assertEqual(isOtherExercise('dips', 'Chin ups'), true);
  assertEqual(isOtherExercise('Dips', 'Dips'), false);
  assertEqual(isOtherExercise('Ring dips', 'Dips'), false);
});
