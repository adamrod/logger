import { allExercises, allVariants } from './exercises.js';
import { initExercisePicker, renderExercisePicker } from './exercise-picker.js';
import { initVariantPicker, renderVariantPicker } from './variant-picker.js';
import { dayKey, describeSet, escapeHtml, formatDay, formatTime, roundValue } from './format.js';
import { addEntry, deleteEntry, entryDate, getEntries, isUnsynced, updateEntry } from './store.js';

const FIELDS = {
  reps: { step: 1, min: 0, invalidChars: /[^0-9]/g, parse: (text) => parseInt(text, 10) },
  weight: { step: 1, min: 0, invalidChars: /[^0-9.,]/g, parse: (text) => parseFloat(text.replace(',', '.')) },
};
const EMPTY_SET = { reps: 0, weight: 0 };

const variantOf = (entry) => entry?.variant ?? '';

const controls = document.getElementById('log-controls');
const inputs = { reps: document.getElementById('reps'), weight: document.getElementById('weight') };
const logButton = document.getElementById('log-button');
const saveButton = document.getElementById('save-button');
const editActions = document.getElementById('edit-actions');
const historyEl = document.getElementById('history-list');

let selected = getEntries().at(-1)?.exercise;
let selectedVariant = variantOf(getEntries().at(-1));
let editingId = null;
let confirmingId = null;

const actions = {
  step: ({ field, dir }) => stepField(field, Number(dir)),
  log: () => {
    const set = readSet();
    confirmingId = null;
    if (set) addEntry({ exercise: currentExercise(), variant: currentVariant(), ...set });
  },
  save: () => {
    const set = readSet();
    if (!set) return;
    const id = editingId;
    editingId = null;
    updateEntry(id, { variant: selectedVariant, ...set });
  },
  'cancel-edit': () => { editingId = null; renderLog(); },
  edit: ({ id }) => {
    const entry = getEntries().find((e) => e.timestamp === id);
    editingId = id;
    confirmingId = null;
    selectedVariant = variantOf(entry);
    fillForm(entry);
    renderLog();
  },
  delete: ({ id }) => { confirmingId = id; renderLog(); },
  'cancel-delete': () => { confirmingId = null; renderLog(); },
  'confirm-delete': ({ id }) => { confirmingId = null; deleteEntry(id); },
};

export function initLog() {
  initExercisePicker(selectExercise);
  initVariantPicker(selectVariant);
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
  renderVariantPicker(exercise, currentVariant());
  logButton.hidden = editingId !== null;
  editActions.hidden = editingId === null;
  updateSaveButtons();
  historyEl.innerHTML = sets.length
    ? groupByDay(sets).map(dayHtml).join('')
    : '<p class="empty">No sets logged yet.</p>';
}

function currentExercise() {
  return allExercises().includes(selected) ? selected : allExercises()[0];
}

function currentVariant() {
  return allVariants(currentExercise()).includes(selectedVariant) ? selectedVariant : '';
}

function selectExercise(exercise) {
  selected = exercise;
  selectedVariant = variantOf(lastSetOf(exercise));
  editingId = null;
  confirmingId = null;
  fillForm(lastSetOf(exercise) ?? EMPTY_SET);
  renderLog();
}

function selectVariant(variant) {
  const last = lastSetOfVariant(currentExercise(), variant);
  selectedVariant = variant;
  if (last && editingId === null) fillForm(last);
  renderLog();
}

function lastSetOf(exercise) {
  return getEntries().findLast((entry) => entry.exercise === exercise);
}

function lastSetOfVariant(exercise, variant) {
  return getEntries().findLast((entry) => entry.exercise === exercise && variantOf(entry) === variant);
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

function groupByDay(sets) {
  return [...Map.groupBy(sets, (entry) => dayKey(entryDate(entry))).values()];
}

function dayHtml(sets) {
  const day = formatDay(entryDate(sets[0]));
  return `
    <section class="day" aria-label="${day}">
      <h3 class="day-label">${day}</h3>
      <ul>${sets.map(setHtml).join('')}</ul>
    </section>`;
}

function setHtml(entry) {
  const text = escapeHtml(describeSet(entry));
  const date = entryDate(entry);
  const time = formatTime(date);
  const unsynced = isUnsynced(entry) ? '<span class="set-unsynced">Not synced</span>' : '';
  return `
    <li class="set">
      <span class="set-info"><span class="set-text">${text}</span>${unsynced}</span>
      <span class="set-actions">${setActionsHtml(entry.timestamp, `${text}, ${formatDay(date)} ${time}`)}</span>
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
