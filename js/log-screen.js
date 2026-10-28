import { allExercises, allVariants } from './exercises.js';
import { initExercisePicker, renderExercisePicker } from './exercise-picker.js';
import { initVariantPicker, renderVariantPicker } from './variant-picker.js';
import { onAction } from './events.js';
import { describeSet, roundValue } from './format.js';
import { historyHtml } from './history.js';
import { DECIMAL, INTEGER, bindNumberInput, stepInput } from './number-field.js';
import { sets } from './store.js';

const FIELDS = {
  reps: { ...INTEGER, step: 1, min: 0 },
  weight: { ...DECIMAL, step: 1, min: 0 },
};
const EMPTY_SET = { reps: 0, weight: 0 };

const variantOf = (entry) => entry?.variant ?? '';

const controls = document.getElementById('log-controls');
const inputs = { reps: document.getElementById('reps'), weight: document.getElementById('weight') };
const logButton = document.getElementById('log-button');
const saveButton = document.getElementById('save-button');
const editActions = document.getElementById('edit-actions');
const historyEl = document.getElementById('history-list');

let selected = sets.getEntries().at(-1)?.exercise;
let selectedVariant = variantOf(sets.getEntries().at(-1));
let editingId = null;
let confirmingId = null;

const actions = {
  step: ({ field, dir }) => {
    stepInput(inputs[field], FIELDS[field], Number(dir));
    updateSaveButtons();
  },
  log: () => {
    const set = readSet();
    confirmingId = null;
    if (set) sets.add({ exercise: currentExercise(), variant: currentVariant(), ...set });
  },
  save: () => {
    const set = readSet();
    if (!set) return;
    const id = editingId;
    editingId = null;
    sets.update(id, { variant: selectedVariant, ...set });
  },
  'cancel-edit': () => { editingId = null; renderLog(); },
  edit: ({ id }) => {
    const entry = sets.getEntries().find((e) => e.timestamp === id);
    editingId = id;
    confirmingId = null;
    selectedVariant = variantOf(entry);
    fillForm(entry);
    renderLog();
  },
  delete: ({ id }) => { confirmingId = id; renderLog(); },
  'cancel-delete': () => { confirmingId = null; renderLog(); },
  'confirm-delete': ({ id }) => { confirmingId = null; sets.remove(id); },
};

export function initLog() {
  initExercisePicker(selectExercise);
  initVariantPicker(selectVariant);
  fillForm(lastSetOf(currentExercise()) ?? EMPTY_SET);
  onAction([controls, historyEl], actions);
  Object.entries(inputs).forEach(([key, input]) => bindNumberInput(input, FIELDS[key], updateSaveButtons));
}

export function renderLog() {
  const exercise = currentExercise();
  renderExercisePicker(exercise);
  renderVariantPicker(exercise, currentVariant());
  logButton.hidden = editingId !== null;
  editActions.hidden = editingId === null;
  updateSaveButtons();
  historyEl.innerHTML = historyHtml(sets.getEntries().filter((entry) => entry.exercise === exercise), {
    describe: describeSet,
    isUnsynced: sets.isUnsynced,
    editingId,
    confirmingId,
    empty: 'No sets logged yet.',
  });
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
  return sets.getEntries().findLast((entry) => entry.exercise === exercise);
}

function lastSetOfVariant(exercise, variant) {
  return sets.getEntries().findLast((entry) => entry.exercise === exercise && variantOf(entry) === variant);
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
