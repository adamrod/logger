import { currentGoal, isSameGoal, readGoal } from './body-weight-goal.js';
import { onAction } from './events.js';
import { roundValue } from './format.js';
import { DECIMAL, bindNumberInput } from './number-field.js';
import { bodyWeightGoals } from './store.js';

const form = document.getElementById('body-weight-goal');
const inputs = ['low', 'high'].map((bound) => document.getElementById(`body-weight-goal-${bound}`));
const saveButton = document.getElementById('body-weight-goal-save');
const removeButton = document.getElementById('body-weight-goal-remove');

let isOpen = false;
let render = () => {};

const goal = () => currentGoal(bodyWeightGoals.getEntries());

const readInputs = () => readGoal(inputs.map((input) => input.value));

const actions = {
  'goal-cancel': () => {
    closeGoalForm();
    render();
  },
  'goal-save': () => {
    const next = readInputs();
    if (!next) return;
    closeGoalForm();
    if (isSameGoal(next, goal())) render();
    else bodyWeightGoals.add(next);
  },
  'goal-remove': () => {
    closeGoalForm();
    bodyWeightGoals.add({});
  },
};

export const isGoalFormOpen = () => isOpen;

export function initGoalForm(onToggle) {
  render = onToggle;
  onAction([form], actions);
  inputs.forEach((input) => bindNumberInput(input, DECIMAL, renderGoalForm));
}

export function openGoalForm() {
  isOpen = true;
  const current = goal();
  inputs[0].value = current ? roundValue(current.low) : '';
  inputs[1].value = current ? roundValue(current.high) : '';
  if (!current) inputs[0].focus();
}

export function closeGoalForm() {
  isOpen = false;
}

export function renderGoalForm() {
  form.hidden = !isOpen;
  removeButton.hidden = !goal();
  saveButton.disabled = !readInputs();
}
