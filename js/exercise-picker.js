import { addExercise, allExercises, removeExercise } from './exercises.js';
import { escapeHtml } from './format.js';

const picker = document.getElementById('exercise-picker');
const select = document.getElementById('exercise-select');
const toggleButton = document.getElementById('exercise-button');
const menu = document.getElementById('exercise-menu');
const optionsEl = document.getElementById('exercise-options');
const addForm = document.getElementById('exercise-add');
const nameInput = document.getElementById('exercise-name');
const cancelButton = document.getElementById('exercise-cancel');

let current = null;
let isOpen = false;
let isAdding = false;
let removing = null;
let onPick = () => {};

const actions = {
  toggle: () => { isOpen = !isOpen; removing = null; render(); },
  pick: ({ name }) => { close(); onPick(name); },
  remove: ({ name }) => { removing = name; render(); },
  'confirm-remove': ({ name }) => {
    removing = null;
    removeExercise(name);
    if (name === current) onPick(allExercises()[0]);
  },
  'start-add': () => { close(); isAdding = true; nameInput.value = ''; render(); nameInput.focus(); },
  'cancel-add': () => { isAdding = false; render(); },
};

export function initExercisePicker(pickHandler) {
  onPick = pickHandler;
  picker.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (button) actions[button.dataset.action](button.dataset);
  });
  addForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    close();
    isAdding = false;
    onPick(addExercise(name));
  });
  document.addEventListener('click', (event) => {
    if (isOpen && !event.composedPath().includes(picker)) { close(); render(); }
  });
}

export function renderExercisePicker(exercise) {
  current = exercise;
  render();
}

function close() {
  isOpen = false;
  removing = null;
}

function render() {
  const hasExercises = current !== undefined;
  select.hidden = isAdding || !hasExercises;
  addForm.hidden = !isAdding && hasExercises;
  cancelButton.hidden = !hasExercises;
  toggleButton.textContent = current ?? '';
  toggleButton.setAttribute('aria-expanded', isOpen);
  menu.hidden = !isOpen;
  optionsEl.innerHTML = allExercises().map(optionHtml).join('');
}

function optionHtml(exercise) {
  const name = escapeHtml(exercise);
  const removeButton = exercise === removing
    ? `<button type="button" class="option-remove is-confirm" data-action="confirm-remove" data-name="${name}"
        aria-label="Confirm remove ${name}">Confirm</button>`
    : `<button type="button" class="option-remove" data-action="remove" data-name="${name}"
        aria-label="Remove ${name}">Remove</button>`;
  return `
    <li class="option">
      <button type="button" class="option-pick" data-action="pick" data-name="${name}"
        aria-current="${exercise === current}">${name}</button>
      ${removeButton}
    </li>`;
}
