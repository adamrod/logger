import { addVariant, allExercises, allVariants, isOtherExercise, noteOf, renameExercise, saveNote } from '../js/exercises.js';
import { notes, sets } from '../js/store.js';
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

test('a note is added, changed and removed by saving its text', () => {
  saveNote('Back squat', 'Bar 22\nSafety 9');
  assertEqual(noteOf('Back squat'), 'Bar 22\nSafety 9', 'added');
  saveNote('Back squat', 'Bar 21\nSafety 9');
  assertEqual(noteOf('Back squat'), 'Bar 21\nSafety 9', 'changed');
  assertEqual(notes.getEntries().filter((entry) => entry.exercise === 'Back squat').length, 1, 'rows');
  saveNote('Back squat', '  ');
  assertEqual(noteOf('Back squat'), '', 'removed');
  assertEqual(notes.getEntries().some((entry) => entry.exercise === 'Back squat'), false, 'row removed');
});

test('renaming moves the note to the new name', () => {
  sets.add({ exercise: 'Bench', reps: 5, weight: 80 });
  saveNote('Bench', 'Eleiko: bar 10, safety 7');
  renameExercise('Bench', 'Bench press');
  assertEqual(noteOf('Bench press'), 'Eleiko: bar 10, safety 7');
  assertEqual(noteOf('Bench'), '');
});
