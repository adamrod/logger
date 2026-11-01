import { enterAnalysis, initAnalysis } from '../js/analysis-screen.js';
import { initBodyWeight, renderBodyWeight } from '../js/body-weight-screen.js';
import { enterDay, initDay, renderDay } from '../js/day-screen.js';
import { onChange } from '../js/events.js';
import { noteOf } from '../js/exercises.js';
import { formatIsoDate, roundValue } from '../js/format.js';
import { currentExercise, currentVariant, initLog, renderLog, revealSets } from '../js/log-screen.js';
import { bodyWeights, sets } from '../js/store.js';
import { nextUndo, trackPlace } from '../js/undo.js';
import { assertEqual, test } from './harness.js';
import { element } from './setup.js';

let isOpen = false;

function openScreens() {
  if (isOpen) return;
  isOpen = true;
  initLog();
  initBodyWeight();
  initAnalysis();
  initDay();
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
  assertEqual(element('note-toggle').textContent, '+ Notes', 'label without a note');
  element('note-toggle').dispatch('click');
  assertEqual(element('note-field').hidden, false, 'open');
  assertEqual(document.activeElement === element('note'), true, 'empty note focused');
  element('note').value = 'Seat 4';
  element('note').dispatch('input');
  element('note-toggle').dispatch('click');
  assertEqual([element('note-field').hidden, noteOf('Leg press')], [true, 'Seat 4'], 'closed after typing');
  assertEqual(element('note-toggle').textContent, 'Notes', 'label with a note');
  element('note-toggle').dispatch('click');
  click('exercise-picker', { action: 'pick', name: 'Calf raise' });
  assertEqual([element('note-field').hidden, element('note').value], [true, ''], 'other exercise');
});

test('one button starts and stops the stopwatch, and logging restarts it while reset on log is ticked', () => {
  openScreens();
  const isRunning = () => element('stopwatch-toggle').getAttribute('aria-label') === 'Stop stopwatch';
  if (isRunning()) click('log-controls', { action: 'stopwatch-toggle' });
  assertEqual(isRunning(), false, 'stopped');
  click('log-controls', { action: 'stopwatch-toggle' });
  assertEqual([isRunning(), element('stopwatch-icon').getAttribute('d')], [true, 'M9 6v12M15 6v12'], 'started');
  click('log-controls', { action: 'stopwatch-toggle' });
  element('reps').value = '5';
  element('weight').value = '50';
  click('log-controls', { action: 'log' });
  assertEqual([isRunning(), element('stopwatch-time').textContent], [true, '0:00'], 'after logging');
  click('log-controls', { action: 'stopwatch-toggle' });
  element('stopwatch-reset-on-log').checked = false;
  element('stopwatch-reset-on-log').dispatch('change', {});
  click('log-controls', { action: 'log' });
  assertEqual(isRunning(), false, 'after logging unticked');
});

test('the %BW chart shows the top set as a percent of body weight, beside the set and the body weight', () => {
  openScreens();
  bodyWeights.add({ weight: 80 });
  const weighedAt = Date.parse(bodyWeights.getEntries().at(-1).timestamp);
  sets.add({ timestamp: new Date(weighedAt + 60000).toISOString(), exercise: 'Weighted dips', reps: 3, weight: 40 });
  click('exercise-picker', { action: 'pick', name: 'Weighted dips' });
  element('daily-plot').clientWidth = 350;
  enterAnalysis();
  click('daily-metrics', { action: 'metric', metric: 'relative' });
  const readout = ['daily-heading', 'daily-value', 'daily-detail'].map((id) => element(id).textContent);
  assertEqual(readout, ['Max %BW', '50%', '3 × 40 · BW 80']);
});

test('tapping Max moves the readout from the latest day to the best day in the range', () => {
  openScreens();
  const lastAt = Date.parse(sets.getEntries().at(-1).timestamp);
  const daysLater = (days) => new Date(lastAt + days * 86400000).toISOString();
  sets.add({ timestamp: daysLater(1), exercise: 'Muscle ups', reps: 2, weight: 10 });
  sets.add({ timestamp: daysLater(2), exercise: 'Muscle ups', reps: 3, weight: 5 });
  click('exercise-picker', { action: 'pick', name: 'Muscle ups' });
  element('daily-plot').clientWidth = 350;
  enterAnalysis();
  click('daily-metrics', { action: 'metric', metric: 'weight' });
  const shown = () => [element('daily-value').textContent, element('daily-max-value').textContent];
  assertEqual(shown(), ['3 × 5', '2 × 10'], 'latest day');
  click('daily-max', { action: 'max' });
  assertEqual(shown(), ['2 × 10', '2 × 10'], 'best day');
});

test('tapping Min and Max on the weight chart moves the readout to those weights', () => {
  openScreens();
  const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();
  [[2, 1], [1, 500]].forEach(([days, weight]) => bodyWeights.add({ timestamp: daysAgo(days), weight }));
  element('chart-plot').clientWidth = 350;
  click('chart-ranges', { action: 'range', range: 'All' });
  const shown = () => element('chart-value').textContent;
  click('chart-extremes', { action: 'min' });
  assertEqual(shown(), 1, 'min weight');
  click('chart-extremes', { action: 'max' });
  assertEqual(shown(), 500, 'max weight');
});

test('a custom range starts from the first shown set and narrows to the chosen days', () => {
  openScreens();
  const daysAgo = (days) => new Date(Date.now() - days * 86400000);
  [40, 20, 5].forEach((days) => sets.add({ timestamp: daysAgo(days).toISOString(), exercise: 'Front levers', reps: 5, weight: 0 }));
  click('exercise-picker', { action: 'pick', name: 'Front levers' });
  enterAnalysis();
  click('analysis-ranges', { action: 'range', range: 'All' });
  click('analysis-ranges', { action: 'range', range: 'Custom' });
  const summary = () => element('analysis-summary').textContent;
  assertEqual([element('analysis-from').value, summary()], [formatIsoDate(daysAgo(40)), '3 days · 3 sets'], 'starts with all shown');
  element('analysis-from').value = formatIsoDate(daysAgo(25));
  element('analysis-from').dispatch('change');
  assertEqual(summary(), '2 days · 2 sets', 'from moved');
  element('analysis-to').value = formatIsoDate(daysAgo(10));
  element('analysis-to').dispatch('change');
  assertEqual(summary(), '1 day · 1 set', 'to moved');
});

test('undoing a deleted set goes back to its exercise', async () => {
  openScreens();
  trackPlace(() => ({ screen: 'log', exercise: currentExercise() }));
  sets.add({ exercise: 'Hip thrusts', reps: 8, weight: 100 });
  sets.add({ exercise: 'Calf raises', reps: 15, weight: 40 });
  click('exercise-picker', { action: 'pick', name: 'Hip thrusts' });
  const set = lastSetOf('Hip thrusts');
  click('history-list', { action: 'edit', id: set.timestamp });
  click('log-controls', { action: 'delete' });
  click('log-controls', { action: 'confirm-delete' });
  click('exercise-picker', { action: 'pick', name: 'Calf raises' });
  await revealSets(nextUndo());
  assertEqual(currentExercise(), 'Hip thrusts');
  assertEqual(lastSetOf('Hip thrusts'), set);
  trackPlace(() => null);
});

test('undoing a note opens the notes', async () => {
  openScreens();
  trackPlace(() => ({ screen: 'log', exercise: currentExercise() }));
  sets.add({ exercise: 'Face pulls', reps: 15, weight: 20 });
  click('exercise-picker', { action: 'pick', name: 'Face pulls' });
  element('note').value = 'Pause';
  element('note').dispatch('input', {});
  await revealSets(nextUndo());
  assertEqual([noteOf('Face pulls'), element('note-field').hidden], ['', false]);
  trackPlace(() => null);
});

test('tapping a date in the history opens that day, and tapping a set there edits it on Sets', () => {
  openScreens();
  sets.add({ exercise: 'Chin ups', reps: 7, weight: 10 });
  sets.add({ exercise: 'Dips', reps: 12, weight: 0 });
  const chinUp = lastSetOf('Chin ups');
  const day = formatIsoDate(new Date(chinUp.timestamp));
  click('exercise-picker', { action: 'pick', name: 'Dips' });
  click('history-list', { action: 'day', day });
  assertEqual(location.hash, `#day/${day}`, 'opened day');
  enterDay(day);
  renderDay();
  assertEqual(element('day-exercises').innerHTML.includes(chinUp.timestamp), true, 'set shown on the day');
  click('day-exercises', { action: 'edit', id: chinUp.timestamp });
  assertEqual([location.hash, currentExercise(), element('log-button').hidden, ...shownSet()], ['#log', 'Chin ups', true, '7', '10']);
  click('log-controls', { action: 'cancel-edit' });
});

test('the day arrows step to the previous and next days with something logged', () => {
  openScreens();
  const at = (year, month, date) => new Date(year, month, date, 9).toISOString();
  [at(1990, 0, 6), at(1990, 0, 9)].forEach((timestamp) => sets.add({ timestamp, exercise: 'Old lift', reps: 5, weight: 50 }));
  bodyWeights.add({ timestamp: at(1990, 0, 8), weight: 81 });
  enterDay('1990-01-06');
  renderDay();
  assertEqual([element('day-summary').textContent, element('day-previous').disabled], ['1 exercise · 1 set', true], 'first day');
  click('day-steps', { action: 'step', step: 'next' });
  assertEqual([location.hash, element('day-summary').textContent], ['#day/1990-01-08', 'BW 81'], 'weight only');
  click('day-steps', { action: 'step', step: 'next' });
  assertEqual(location.hash, '#day/1990-01-09', 'next set day');
  click('day-steps', { action: 'latest' });
  assertEqual([location.hash, element('day-latest').disabled], [`#day/${formatIsoDate(new Date(sets.getEntries().at(-1).timestamp))}`, true], 'latest day');
});
