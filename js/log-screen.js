import { allExercises } from './exercises.js';
import { initExercisePicker, renderExercisePicker } from './exercise-picker.js';
import { describeSet, escapeHtml, formatWhen, roundValue } from './format.js';
import { addEntry, deleteEntry, entryDate, getEntries, updateEntry } from './store.js';

const FIELDS = {
  reps: { step: 1, min: 0, invalidChars: /[^0-9]/g, parse: (text) => parseInt(text, 10) },
  weight: { step: 1, min: 0, invalidChars: /[^0-9.,]/g, parse: (text) => parseFloat(text.replace(',', '.')) },
};
const EMPTY_SET = { reps: 0, weight: 0 };

const controls = document.getElementById('log-controls');
const inputs = { reps: document.getElementById('reps'), weight: document.getElementById('weight') };
const logButton = document.getElementById('log-button');
const saveButton = document.getElementById('save-button');
const editActions = document.getElementById('edit-actions');
const historyEl = document.getElementById('history-list');

let selected = getEntries().at(-1)?.exercise;
let editingId = null;
let confirmingId = null;

const actions = {
  step: ({ field, dir }) => stepField(field, Number(dir)),
  log: () => {
    const set = readSet();
    confirmingId = null;
    if (set) addEntry({ exercise: currentExercise(), ...set });
  },
  save: () => {
    const set = readSet();
    if (!set) return;
    const id = editingId;
    editingId = null;
    updateEntry(id, set);
  },
  'cancel-edit': () => { editingId = null; renderLog(); },
  edit: ({ id }) => {
    editingId = id;
    confirmingId = null;
    fillForm(getEntries().find((entry) => entry.timestamp === id));
    renderLog();
  },
  delete: ({ id }) => { confirmingId = id; renderLog(); },
  'cancel-delete': () => { confirmingId = null; renderLog(); },
  'confirm-delete': ({ id }) => { confirmingId = null; deleteEntry(id); },
};

export function initLog() {
  initExercisePicker(selectExercise);
  fillForm(lastSetOf(currentExercise()) ?? EMPTY_SET);
  [controls, historyEl].forEach((container) => container.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (button) actions[button.dataset.action](button.dataset);
  }));
  Object.entries(inputs).forEach(([key, input]) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(FIELDS[key].invalidChars, '');
      updateSaveButtons();
    });
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') input.blur(); });
  });
}

export function renderLog() {
  const exercise = currentExercise();
  const sets = getEntries().filter((entry) => entry.exercise === exercise).toReversed();
  renderExercisePicker(exercise);
  logButton.hidden = editingId !== null;
  editActions.hidden = editingId === null;
  updateSaveButtons();
  historyEl.innerHTML = sets.length
    ? `<ul>${sets.map(setHtml).join('')}</ul>`
    : '<p class="empty">No sets logged yet.</p>';
}

function currentExercise() {
  return allExercises().includes(selected) ? selected : allExercises()[0];
}

function selectExercise(exercise) {
  selected = exercise;
  editingId = null;
  confirmingId = null;
  fillForm(lastSetOf(exercise) ?? EMPTY_SET);
  renderLog();
}

function lastSetOf(exercise) {
  return getEntries().findLast((entry) => entry.exercise === exercise);
}

function fillForm({ reps, weight }) {
  inputs.reps.value = reps;
  inputs.weight.value = roundValue(weight);
}

function readSet() {
  const reps = FIELDS.reps.parse(inputs.reps.value);
  const weight = FIELDS.weight.parse(inputs.weight.value);
  return reps > 0 && weight >= 0 ? { reps, weight } : null;
}

function updateSaveButtons() {
  saveButton.disabled = !readSet();
  logButton.disabled = !readSet() || !currentExercise();
}

function stepField(key, direction) {
  const field = FIELDS[key];
  const value = field.parse(inputs[key].value);
  const next = Number.isNaN(value) ? field.min : roundValue(value + direction * field.step);
  inputs[key].value = Math.max(field.min, next);
  updateSaveButtons();
}

function setHtml(entry) {
  const text = describeSet(entry);
  const when = formatWhen(entryDate(entry));
  return `
    <li class="set">
      <span class="set-info"><span class="set-text">${text}</span><span class="set-when">${when}</span></span>
      <span class="set-actions">${setActionsHtml(entry.timestamp, `${text}, ${when}`)}</span>
    </li>`;
}

function setActionsHtml(id, label) {
  if (id === editingId) return '<span class="set-editing">Editing</span>';
  if (id === confirmingId) {
    return actionButton('cancel-delete', id, 'Cancel', 'Cancel delete')
      + actionButton('confirm-delete', id, 'Confirm', `Confirm delete ${label}`, 'is-strong');
  }
  return actionButton('edit', id, 'Edit', `Edit ${label}`) + actionButton('delete', id, 'Delete', `Delete ${label}`);
}

function actionButton(action, id, text, label, modifier = '') {
  return `<button type="button" class="btn-text ${modifier}" data-action="${action}" data-id="${escapeHtml(id)}"
    aria-label="${label}">${text}</button>`;
}
