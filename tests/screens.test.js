import { initBodyWeight, renderBodyWeight } from '../js/body-weight-screen.js';
import { onChange } from '../js/events.js';
import { roundValue } from '../js/format.js';
import { currentExercise, initLog, renderLog } from '../js/log-screen.js';
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
