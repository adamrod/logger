import { createEntryLog } from '../js/entry-log.js';
import { addVariant, allExercises, allVariants, noteOf, removeExercise, renameExercise, saveNote } from '../js/exercises.js';
import { getExerciseList, saveExerciseList, sets } from '../js/store.js';
import { arrivingEntries, leavingEntries } from '../js/history.js';
import { canRedo, nextRedo, nextUndo, trackPlace, undoable } from '../js/undo.js';
import { assertEqual, test } from './harness.js';

const undo = () => nextUndo().apply();
const redo = () => nextRedo().apply();

let logCount = 0;

function syncedLog(entries) {
  logCount += 1;
  const log = createEntryLog({
    file: 'undo.csv',
    columns: ['timestamp', 'weight'],
    numbers: ['weight'],
    keys: { entries: `undo.${logCount}.csv`, sync: `undo.${logCount}.sync` },
  });
  log.beginSync();
  log.applySync({ entries, at: '2026-10-30T12:00:00.000Z' });
  return log;
}

const SYNCED = { timestamp: '2026-10-01T07:00:00.000Z', weight: 70 };
const weights = (log) => log.getEntries().map((entry) => entry.weight);
const exercisesOf = (name) => sets.getEntries().filter((entry) => entry.exercise === name).length;

test('undoing a logged entry removes it and redoing brings it back unchanged', () => {
  const log = syncedLog([]);
  log.add({ weight: 72 });
  const [added] = log.getEntries();
  undo();
  assertEqual(log.getEntries(), [], 'after undo');
  assertEqual(log.hasChanges(), false, 'queued after undo');
  redo();
  assertEqual(log.getEntries(), [added], 'after redo');
});

test('undoing an edit restores the old values', () => {
  const log = syncedLog([SYNCED]);
  log.update(SYNCED.timestamp, { weight: 71 });
  undo();
  assertEqual(weights(log), [70]);
  redo();
  assertEqual(weights(log), [71]);
});

test('undoing a delete before it syncs restores the entry without queuing a delete', () => {
  const log = syncedLog([SYNCED]);
  log.remove(SYNCED.timestamp);
  undo();
  assertEqual(log.getEntries(), [SYNCED]);
  assertEqual(log.getSyncMeta().deletedIds, []);
});

test('undoing a delete that already synced queues the entry as added again', () => {
  const log = syncedLog([SYNCED]);
  log.remove(SYNCED.timestamp);
  log.beginSync();
  log.applySync({ entries: [], at: '2026-10-30T13:00:00.000Z' });
  undo();
  assertEqual(log.getEntries(), [SYNCED]);
  assertEqual(log.getSyncMeta().addedIds, [SYNCED.timestamp]);
});

test('undoing a backdated edit moves the entry back to its time', () => {
  const log = syncedLog([SYNCED]);
  log.update(SYNCED.timestamp, { timestamp: '2026-09-30T07:00:00.000Z' });
  undo();
  assertEqual(log.getEntries(), [SYNCED]);
  assertEqual(log.getSyncMeta().deletedIds, []);
});

test('a new change after an undo drops what could be redone', () => {
  const log = syncedLog([]);
  log.add({ weight: 72 });
  undo();
  assertEqual(canRedo(), true, 'redo before');
  log.add({ weight: 73 });
  assertEqual(canRedo(), false, 'redo after');
});

test('one action that changes several things undoes as one step', () => {
  sets.add({ exercise: 'Rows', variant: 'Wide', reps: 10, weight: 50 });
  addVariant('Rows', 'Close');
  saveNote('Rows', 'Brace');
  renameExercise('Rows', 'Barbell rows');
  undo();
  assertEqual(exercisesOf('Rows'), 1, 'sets');
  assertEqual(allVariants('Rows'), ['Close', 'Wide'], 'variants');
  assertEqual(noteOf('Rows'), 'Brace', 'note');
  assertEqual(allExercises().includes('Barbell rows'), false, 'new name');
});

test('typing a note undoes as one step', () => {
  sets.add({ exercise: 'Lunges', reps: 10, weight: 20 });
  ['S', 'Sl', 'Slow'].forEach((text) => saveNote('Lunges', text));
  undo();
  assertEqual(noteOf('Lunges'), '', 'note');
  assertEqual(exercisesOf('Lunges'), 1, 'set kept');
});

test('undoing a removed exercise brings it back', () => {
  saveExerciseList({ added: [...getExerciseList().added, 'Shrugs'], removed: [] });
  removeExercise('Shrugs');
  undo();
  assertEqual(allExercises().includes('Shrugs'), true);
});

test('changes made outside an action are not undone', () => {
  sets.add({ exercise: 'Curls', reps: 12, weight: 15 });
  const cleaned = { ...getExerciseList(), added: getExerciseList().added.filter((name) => name !== 'Shrugs') };
  saveExerciseList(cleaned);
  undo();
  assertEqual(exercisesOf('Curls'), 0, 'set undone');
  assertEqual(getExerciseList(), cleaned, 'list kept');
});

test('undo tells where the change was made and what comes and goes before applying it', async () => {
  const log = syncedLog([SYNCED]);
  let place = 'Sets';
  trackPlace(() => place);
  undoable(() => { log.remove(SYNCED.timestamp); place = 'Weight'; });
  await Promise.resolve();
  const undoing = nextUndo();
  assertEqual([undoing.place, arrivingEntries(undoing, log), log.getEntries()], ['Sets', [SYNCED], []], 'undo');
  undoing.apply();
  const redoing = nextRedo();
  assertEqual([redoing.place, leavingEntries(redoing, log)], ['Weight', [SYNCED]], 'redo');
  redoing.apply();
  assertEqual(log.getEntries(), [], 'after redo');
  trackPlace(() => null);
});

test('an edit undone is neither leaving nor only arriving twice', () => {
  const log = syncedLog([SYNCED]);
  log.update(SYNCED.timestamp, { weight: 71 });
  const undoing = nextUndo();
  assertEqual([leavingEntries(undoing, log), arrivingEntries(undoing, log)], [[], [SYNCED]]);
  undoing.apply();
});
