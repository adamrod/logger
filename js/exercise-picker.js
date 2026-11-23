import { addExercise, allExercises, isOtherExercise, removeExercise, renameExercise } from './exercises.js';
import { escapeHtml } from './format.js';
import { highlight } from './highlight.js';
import { EDIT_ICON, TRASH_ICON } from './icons.js';
import { createPickerMenu } from './picker-menu.js';

const ICON_ACTIONS = {
  rename: { label: 'Rename', icon: EDIT_ICON },
  remove: { label: 'Remove', icon: TRASH_ICON },
};

const select = document.getElementById('exercise-select');
const exerciseButton = document.getElementById('exercise-button');
const nameForm = document.getElementById('exercise-form');
const nameInput = document.getElementById('exercise-name');
const submitButton = document.getElementById('exercise-submit');
const cancelButton = document.getElementById('exercise-cancel');

let current = null;
let isNaming = false;
let renaming = null;
let removing = null;
let onPick = () => {};

const menu = createPickerMenu('exercise', {
  names: allExercises,
  onPick: (name) => onPick(name),
  onAdd: (name) => onPick(addExercise(name)),
  actions: {
    rename: ({ name }) => startNaming(name),
    remove: ({ name }) => { removing = name; render(); },
    'confirm-remove': ({ name }) => {
      const wasCurrent = name === current;
      removing = null;
      removeExercise(name);
      if (wasCurrent) onPick(allExercises()[0]);
    },
    'cancel-name': () => { isNaming = false; renaming = null; render(); },
  },
  extrasHtml: (exercise) => {
    const name = escapeHtml(exercise);
    return exercise === removing ? confirmRemoveHtml(name) : iconButtonHtml('rename', name) + iconButtonHtml('remove', name);
  },
  onClose: () => { removing = null; },
});

export function initExercisePicker(pickHandler) {
  onPick = pickHandler;
  nameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    const from = renaming;
    isNaming = false;
    renaming = null;
    if (from === null) onPick(addExercise(name));
    else finishRename(from, name);
  });
  nameInput.addEventListener('input', renderSubmitButton);
}

export function renderExercisePicker(exercise) {
  current = exercise;
  render();
}

export const highlightExercise = () => highlight(exerciseButton);

function startNaming(name) {
  menu.close();
  isNaming = true;
  renaming = name;
  nameInput.value = name;
  render();
  nameInput.focus();
}

function finishRename(from, to) {
  const wasCurrent = from === current;
  const renamed = renameExercise(from, to);
  if (wasCurrent) onPick(renamed);
  else render();
}

function render() {
  const hasExercises = current !== undefined;
  select.hidden = isNaming || !hasExercises;
  nameForm.hidden = !isNaming && hasExercises;
  cancelButton.hidden = !hasExercises;
  menu.render(current);
  renderSubmitButton();
}

function renderSubmitButton() {
  submitButton.textContent = submitText();
}

function submitText() {
  if (renaming === null) return 'Add';
  return isOtherExercise(nameInput.value.trim(), renaming) ? 'Merge' : 'Save';
}

const confirmRemoveHtml = (name) => `<button type="button" class="option-confirm" data-action="confirm-remove"
  data-name="${name}" aria-label="Confirm remove ${name}">Remove</button>`;

function iconButtonHtml(action, name) {
  const { label, icon } = ICON_ACTIONS[action];
  return `<button type="button" class="option-icon" data-action="${action}" data-name="${name}" aria-label="${label} ${name}">${icon}</button>`;
}
