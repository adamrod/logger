import { initBodyWeight, renderBodyWeight } from '../js/body-weight-screen.js';
import { onChange } from '../js/events.js';
import { noteOf } from '../js/exercises.js';
import { roundValue } from '../js/format.js';
import { currentExercise, currentVariant, initLog, renderLog } from '../js/log-screen.js';
import { bodyWeights, sets } from '../js/store.js';
import { assertEqual, test } from './harness.js';
import { element } from './setup.js';

let isOpen = false;

function openScreens() {
  if (isOpen) return;
  isOpen = true;
  initLog();
  initBodyWeight();
  onChange(() => { renderLog(); renderBodyWeight(); });
}

const click = (containerId, dataset) => element(containerId).dispatch('click', { target: { closest: () => dataset && { dataset } } });

function submitExerciseName(name) {
  element('exercise-name').value = name;
  element('exercise-form').dispatch('submit', { preventDefault: () => {} });
}

function submitSearch(query) {
  element('exercise-query').value = query;
  element('exercise-search').dispatch('submit', { preventDefault: () => {} });
}

const shownSet = () => [element('reps').value, element('weight').value];

const lastSetOf = (exercise) => sets.getEntries().findLast((entry) => entry.exercise === exercise);

test('renaming the chosen exercise keeps it chosen', () => {
  openScreens();
  sets.add({ exercise: 'Zercher', reps: 5, weight: 60 });
  click('exercise-picker', { action: 'pick', name: 'Zercher' });
  click('exercise-picker', { action: 'rename', name: 'Zercher' });
  submitExerciseName('Zercher squat');
  assertEqual(currentExercise(), 'Zercher squat');
});

test('removing the chosen exercise picks the first one and shows its last set', () => {
  openScreens();
  sets.add({ exercise: 'Good mornings', reps: 8, weight: 40 });
  click('exercise-picker', { action: 'pick', name: 'Good mornings' });
  click('exercise-picker', { action: 'confirm-remove', name: 'Good mornings' });
  const last = lastSetOf(currentExercise());
  assertEqual(shownSet(), [String(last.reps), String(roundValue(last.weight))]);
});

test('opening the exercise menu puts the cursor in the search, closing it takes it out', () => {
  openScreens();
  click('exercise-picker', { action: 'toggle' });
  assertEqual(document.activeElement === element('exercise-query'), true, 'search focused when open');
  click('exercise-picker', { action: 'toggle' });
  assertEqual(document.activeElement === element('exercise-query'), false, 'search focused when closed');
});

test('adding an exercise from the search picks it', () => {
  openScreens();
  click('exercise-picker', { action: 'add', name: 'Hip thrust' });
  assertEqual(currentExercise(), 'Hip thrust');
});

test('submitting the search picks the first match, or adds the name when nothing matches', () => {
  openScreens();
  sets.add({ exercise: 'Deadlift', reps: 3, weight: 120 });
  submitSearch('dead');
  assertEqual(currentExercise(), 'Deadlift', 'matching search');
  submitSearch('Nordic curl');
  assertEqual(currentExercise(), 'Nordic curl', 'new name');
});

test('removing the chosen variant clears it and shows the last set without one', () => {
  openScreens();
  sets.add({ exercise: 'Lunges', variant: 'Left', reps: 10, weight: 20 });
  sets.add({ exercise: 'Lunges', reps: 12, weight: 0 });
  click('exercise-picker', { action: 'pick', name: 'Lunges' });
  click('variant-picker', { action: 'pick', name: 'Left' });
  assertEqual(shownSet(), ['10', '20'], 'with variant');
  click('variant-picker', { action: 'toggle-edit' });
  click('variant-picker', { action: 'remove', name: 'Left' });
  assertEqual(shownSet(), ['12', '0'], 'without variant');
});

test('coming back to an exercise brings back the variant chosen for it, or else the last logged one', () => {
  openScreens();
  sets.add({ exercise: 'Edge lift', variant: 'Left', reps: 5, weight: 30 });
  sets.add({ exercise: 'Edge lift', variant: 'Right', reps: 5, weight: 32 });
  sets.add({ exercise: 'Press', variant: 'Barbell', reps: 5, weight: 40 });
  sets.add({ exercise: 'Press', variant: 'Dumbbell', reps: 8, weight: 20 });
  click('exercise-picker', { action: 'pick', name: 'Edge lift' });
  assertEqual(currentVariant(), 'Right', 'nothing chosen yet');
  click('variant-picker', { action: 'pick', name: 'Left' });
  click('exercise-picker', { action: 'pick', name: 'Press' });
  assertEqual(currentVariant(), 'Dumbbell', 'other exercise');
  click('exercise-picker', { action: 'pick', name: 'Edge lift' });
  assertEqual([currentVariant(), ...shownSet()], ['Left', '5', '30'], 'back again');
});

test('editing variants scrolls the chips back to the start, where the add button is', () => {
  openScreens();
  sets.add({ exercise: 'Cable row', variant: 'Wide', reps: 10, weight: 50 });
  click('exercise-picker', { action: 'pick', name: 'Cable row' });
  element('variant-chips').scrollLeft = 120;
  click('variant-picker', { action: 'toggle-edit' });
  assertEqual(element('variant-chips').scrollLeft, 0);
});

test('step buttons move reps and weight by one without going below zero', () => {
  openScreens();
  element('reps').value = '1';
  element('weight').value = '42.5';
  click('log-controls', { action: 'step', field: 'weight', steps: '1' });
  click('log-controls', { action: 'step', field: 'reps', steps: '-1' });
  click('log-controls', { action: 'step', field: 'reps', steps: '-1' });
  assertEqual(shownSet(), ['0', '43.5']);
});

function withFakeTimers(run) {
  const realSetTimeout = globalThis.setTimeout;
  const timers = [];
  globalThis.setTimeout = (callback, delay) => timers.push({ callback, delay });
  try {
    run(timers);
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
}

function stepButtonEvent(field, steps) {
  const button = { dataset: { action: 'step', field, steps } };
  return { target: { closest: () => button } };
}

test('holding a step button repeats faster, then in fives, and letting go adds nothing', () => withFakeTimers((timers) => {
  openScreens();
  const hold = stepButtonEvent('weight', '1');
  element('weight').value = '60';
  element('log-controls').dispatch('pointerdown', hold);
  const delays = Array.from({ length: 22 }, () => {
    const { callback, delay } = timers.shift();
    callback();
    return delay;
  });
  element('log-controls').dispatch('pointerup', hold);
  element('log-controls').dispatch('click', hold);
  assertEqual(element('weight').value, '90', 'weight');
  assertEqual(delays.slice(0, 3).map(Math.round), [400, 200, 170], 'first delays');
  assertEqual(delays.at(-1), 100, 'fastest delay');
}));

test('saving an edited set updates it and leaves edit mode', () => {
  openScreens();
  sets.add({ exercise: 'Lunges', reps: 12, weight: 0 });
  const { timestamp } = sets.getEntries().at(-1);
  click('history-list', { action: 'edit', id: timestamp });
  assertEqual(element('log-button').hidden, true, 'log button while editing');
  element('reps').value = '15';
  click('log-controls', { action: 'save' });
  assertEqual(sets.getEntries().at(-1).reps, 15);
  assertEqual(element('log-button').hidden, false, 'log button after saving');
});

test('moving an edited set to another variant keeps the history on the variant being logged', () => {
  openScreens();
  sets.add({ exercise: 'Split squat', variant: 'Left', reps: 8, weight: 20 });
  sets.add({ exercise: 'Split squat', variant: 'Left', reps: 9, weight: 20 });
  sets.add({ exercise: 'Split squat', variant: 'Right', reps: 7, weight: 20 });
  const { timestamp } = sets.getEntries().at(-3);
  const isShown = () => element('history-list').innerHTML.includes(timestamp);
  click('exercise-picker', { action: 'pick', name: 'Split squat' });
  click('variant-picker', { action: 'pick', name: 'Left' });
  click('history-list', { action: 'edit', id: timestamp });
  click('variant-picker', { action: 'pick', name: 'Right' });
  assertEqual([currentVariant(), isShown()], ['Left', true], 'while editing');
  click('log-controls', { action: 'save' });
  const edited = sets.getEntries().find((entry) => entry.timestamp === timestamp);
  assertEqual([edited.variant, currentVariant(), isShown()], ['Right', 'Left', false], 'after saving');
});

test('a set deleted from edit mode is gone', () => {
  openScreens();
  sets.add({ exercise: 'Lunges', reps: 9, weight: 0 });
  const { timestamp } = sets.getEntries().at(-1);
  click('history-list', { action: 'edit', id: timestamp });
  click('log-controls', { action: 'delete' });
  assertEqual(element('delete-actions').hidden, false, 'delete confirmation');
  click('log-controls', { action: 'confirm-delete' });
  assertEqual(sets.getEntries().some((entry) => entry.timestamp === timestamp), false);
  assertEqual(element('delete-actions').hidden, true, 'delete confirmation after deleting');
});

test('saving an edited body weight updates it', () => {
  openScreens();
  bodyWeights.add({ weight: 80 });
  const { timestamp } = bodyWeights.getEntries().at(-1);
  click('body-weight-history', { action: 'edit', id: timestamp });
  assertEqual(element('body-weight').value, '80', 'filled in weight');
  element('body-weight').value = '79,5';
  click('body-weight-controls', { action: 'save' });
  assertEqual(bodyWeights.getEntries().at(-1).weight, 79.5);
  assertEqual(element('body-weight-log').hidden, false, 'log button after saving');
});

test('the note stays closed until asked for and closes when another exercise is picked', () => {
  openScreens();
  sets.add({ exercise: 'Leg press', reps: 10, weight: 100 });
  sets.add({ exercise: 'Calf raise', reps: 15, weight: 60 });
  click('exercise-picker', { action: 'pick', name: 'Leg press' });
  assertEqual(element('note-field').hidden, true, 'before opening');
  element('note-toggle').dispatch('click');
  assertEqual(element('note-field').hidden, false, 'open');
  assertEqual(document.activeElement === element('note'), true, 'empty note focused');
  element('note').value = 'Seat 4';
  element('note').dispatch('input');
  element('note-toggle').dispatch('click');
  assertEqual([element('note-field').hidden, noteOf('Leg press')], [true, 'Seat 4'], 'closed after typing');
  element('note-toggle').dispatch('click');
  click('exercise-picker', { action: 'pick', name: 'Calf raise' });
  assertEqual([element('note-field').hidden, element('note').value], [true, ''], 'other exercise');
});

test('the stopwatch buttons start and stop it, and logging restarts it while reset on log is ticked', () => {
  openScreens();
  click('log-controls', { action: 'stopwatch-stop' });
  assertEqual([element('stopwatch-start').disabled, element('stopwatch-stop').disabled], [false, true], 'stopped');
  element('reps').value = '5';
  element('weight').value = '50';
  click('log-controls', { action: 'log' });
  assertEqual([element('stopwatch-start').disabled, element('stopwatch-time').textContent], [true, '0:00'], 'after logging');
  click('log-controls', { action: 'stopwatch-stop' });
  element('stopwatch-reset-on-log').checked = false;
  element('stopwatch-reset-on-log').dispatch('change', {});
  click('log-controls', { action: 'log' });
  assertEqual(element('stopwatch-start').disabled, false, 'after logging unticked');
});
