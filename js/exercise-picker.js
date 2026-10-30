import { addExercise, allExercises, isOtherExercise, removeExercise, renameExercise } from './exercises.js';
import { escapeHtml } from './format.js';

const ICON_ACTIONS = {
  rename: { label: 'Rename', icon: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>' },
  remove: { label: 'Remove', icon: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>' },
};

const picker = document.getElementById('exercise-picker');
const select = document.getElementById('exercise-select');
const toggleButton = document.getElementById('exercise-button');
const menu = document.getElementById('exercise-menu');
const optionsEl = document.getElementById('exercise-options');
const nameForm = document.getElementById('exercise-form');
const nameInput = document.getElementById('exercise-name');
const submitButton = document.getElementById('exercise-submit');
const cancelButton = document.getElementById('exercise-cancel');

let current = null;
let isOpen = false;
let isNaming = false;
let renaming = null;
let removing = null;
let onPick = () => {};

const actions = {
  toggle: () => { isOpen = !isOpen; removing = null; render(); },
  pick: ({ name }) => { close(); onPick(name); },
  rename: ({ name }) => startNaming(name),
  remove: ({ name }) => { removing = name; render(); },
  'confirm-remove': ({ name }) => {
    removing = null;
    removeExercise(name);
    if (name === current) onPick(allExercises()[0]);
  },
  'start-add': () => startNaming(null),
  'cancel-name': () => { isNaming = false; renaming = null; render(); },
};

export function initExercisePicker(pickHandler) {
  onPick = pickHandler;
  picker.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (button) actions[button.dataset.action](button.dataset);
  });
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
  document.addEventListener('click', (event) => {
    if (isOpen && !event.composedPath().includes(picker)) { close(); render(); }
  });
}

export function renderExercisePicker(exercise) {
  current = exercise;
  render();
}

function startNaming(name) {
  close();
  isNaming = true;
  renaming = name;
  nameInput.value = name ?? '';
  render();
  nameInput.focus();
}

function finishRename(from, to) {
  const renamed = renameExercise(from, to);
  if (from === current) onPick(renamed);
  else render();
}

function close() {
  isOpen = false;
  removing = null;
}

function render() {
  const hasExercises = current !== undefined;
  select.hidden = isNaming || !hasExercises;
  nameForm.hidden = !isNaming && hasExercises;
  cancelButton.hidden = !hasExercises;
  toggleButton.textContent = current ?? '';
  toggleButton.setAttribute('aria-expanded', isOpen);
  menu.hidden = !isOpen;
  optionsEl.innerHTML = allExercises().map(optionHtml).join('');
  renderSubmitButton();
}

function renderSubmitButton() {
  submitButton.textContent = submitText();
}

function submitText() {
  if (renaming === null) return 'Add';
  return isOtherExercise(nameInput.value.trim(), renaming) ? 'Merge' : 'Save';
}

function optionHtml(exercise) {
  const name = escapeHtml(exercise);
  return `
    <li class="option">
      <button type="button" class="option-pick" data-action="pick" data-name="${name}"
        aria-current="${exercise === current}">${name}</button>
      ${exercise === removing ? confirmRemoveHtml(name) : iconButtonHtml('rename', name) + iconButtonHtml('remove', name)}
    </li>`;
}

const confirmRemoveHtml = (name) => `<button type="button" class="option-confirm" data-action="confirm-remove"
  data-name="${name}" aria-label="Confirm remove ${name}">Remove</button>`;

function iconButtonHtml(action, name) {
  const { label, icon } = ICON_ACTIONS[action];
  return `<button type="button" class="option-icon" data-action="${action}" data-name="${name}" aria-label="${label} ${name}">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icon}</svg></button>`;
}
