import { addExercise, addVariant, allExercises, allVariants, isOtherExercise, noteOf, removeExercise, removeVariant, renameExercise, saveNote } from '../js/exercises.js';
import { moveListsToNames, names, notes, sets } from '../js/store.js';
import { assertEqual, test } from './harness.js';

const namesRowsOf = (exercise) => names.getEntries()
  .filter((row) => row.exercise === exercise)
  .map(({ variant = '', state }) => `${variant}:${state}`);

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

test('an exercise added by hand is stored as a names row until it is removed', () => {
  addExercise('Plank');
  assertEqual(namesRowsOf('Plank'), [':added'], 'added');
  assertEqual(allExercises().includes('Plank'), true);
  removeExercise('Plank');
  assertEqual(namesRowsOf('Plank'), [':removed'], 'removed');
  assertEqual(allExercises().includes('Plank'), false);
  addExercise('plank');
  assertEqual(namesRowsOf('Plank'), [':added'], 'added back');
});

test('adding an already shown exercise stores nothing', () => {
  sets.add({ exercise: 'Hip thrusts', reps: 8, weight: 100 });
  addExercise('hip thrusts');
  assertEqual(namesRowsOf('Hip thrusts'), []);
});

test('variants added and removed by hand are stored per exercise', () => {
  addVariant('Lunge', 'Walking');
  addVariant('Lunge', 'Reverse');
  removeVariant('Lunge', 'Walking');
  assertEqual(namesRowsOf('Lunge'), ['Walking:removed', 'Reverse:added']);
  assertEqual(allVariants('Lunge'), ['Reverse']);
});

test('the same name stored twice by two devices shows once and is removed once', () => {
  names.add({ exercise: 'Farmer walk', state: 'added' });
  names.add({ exercise: 'Farmer walk', state: 'added' });
  assertEqual(allExercises().filter((name) => name === 'Farmer walk'), ['Farmer walk']);
  removeExercise('Farmer walk');
  assertEqual(namesRowsOf('Farmer walk'), [':removed', ':removed']);
});

test('renaming moves the variant rows to the new name', () => {
  addVariant('Rows', 'Pendlay');
  sets.add({ exercise: 'Rows', reps: 5, weight: 80 });
  renameExercise('Rows', 'Barbell row');
  assertEqual(namesRowsOf('Rows'), []);
  assertEqual(namesRowsOf('Barbell row').filter((row) => row.startsWith('Pendlay')), ['Pendlay:added']);
});

test('lists kept in local storage by earlier versions move into names', () => {
  localStorage.setItem('logger.v2.exercise-list', JSON.stringify({ added: ['Sled push'], removed: ['Old press'] }));
  localStorage.setItem('logger.v2.variant-lists', JSON.stringify({ 'Sled push': { added: ['Heavy'], removed: [] } }));
  moveListsToNames();
  assertEqual(namesRowsOf('Sled push'), [':added', 'Heavy:added']);
  assertEqual(namesRowsOf('Old press'), [':removed']);
  assertEqual(localStorage.getItem('logger.v2.exercise-list'), null);
  assertEqual(localStorage.getItem('logger.v2.variant-lists'), null);
});
