import { currentGoal, goalType, isSameGoal, readGoal } from './body-weight-goal.js';
import { markPressed } from './chart-controls.js';
import { onAction } from './events.js';
import { roundValue } from './format.js';
import { DECIMAL, bindNumberInput } from './number-field.js';
import { bodyWeightGoals } from './store.js';

const FIRST_INPUT = {
  range: { placeholder: 'from', label: 'Goal from' },
  exact: { placeholder: 'weight', label: 'Goal weight' },
};

const form = document.getElementById('body-weight-goal');
const typeGroup = document.getElementById('body-weight-goal-types');
const [lowInput, highInput] = ['low', 'high'].map((bound) => document.getElementById(`body-weight-goal-${bound}`));
const rangeOnly = [document.getElementById('body-weight-goal-dash'), highInput];
const saveButton = document.getElementById('body-weight-goal-save');
const removeButton = document.getElementById('body-weight-goal-remove');

let isOpen = false;
let type = 'range';
let render = () => {};

const goal = () => currentGoal(bodyWeightGoals.getEntries());

const shownInputs = () => (type === 'exact' ? [lowInput] : [lowInput, highInput]);

const readInputs = () => readGoal(shownInputs().map((input) => input.value));

const actions = {
  'goal-type': ({ type: picked }) => {
    type = picked;
    render();
  },
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
  [lowInput, highInput].forEach((input) => bindNumberInput(input, DECIMAL, renderGoalForm));
}

export function openGoalForm() {
  isOpen = true;
  const current = goal();
  type = goalType(current);
  lowInput.value = current ? roundValue(current.low) : '';
  highInput.value = current && type === 'range' ? roundValue(current.high) : '';
  if (!current) lowInput.focus();
}

export function closeGoalForm() {
  isOpen = false;
}

export function renderGoalForm() {
  form.hidden = !isOpen;
  markPressed(typeGroup, 'type', type);
  rangeOnly.forEach((element) => { element.hidden = type === 'exact'; });
  lowInput.placeholder = FIRST_INPUT[type].placeholder;
  lowInput.setAttribute('aria-label', FIRST_INPUT[type].label);
  removeButton.hidden = !goal();
  saveButton.disabled = !readInputs();
}
