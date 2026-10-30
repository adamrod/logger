import { allExercises, allVariants } from './exercises.js';
import { initExercisePicker, renderExercisePicker } from './exercise-picker.js';
import { initVariantPicker, renderVariantPicker } from './variant-picker.js';
import { onAction } from './events.js';
import { describeSet, roundValue } from './format.js';
import { historyHtml, revealNewest } from './history.js';
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
const deleteActions = document.getElementById('delete-actions');
const historyEl = document.getElementById('history-list');
const analysisLink = document.getElementById('analysis-link');

let selected = sets.getEntries().at(-1)?.exercise;
let selectedVariant = variantOf(sets.getEntries().at(-1));
let editingId = null;
let confirmingDelete = false;

const actions = {
  step: ({ field, dir }) => {
    stepInput(inputs[field], FIELDS[field], Number(dir));
    updateSaveButtons();
  },
  log: () => {
    const set = readSet();
    if (!set) return;
    sets.add({ exercise: currentExercise(), variant: currentVariant(), ...set });
    revealNewest(historyEl);
  },
  save: () => {
    const set = readSet();
    if (!set) return;
    const id = editingId;
    editingId = null;
    confirmingDelete = false;
    sets.update(id, { variant: selectedVariant, ...set });
  },
  'cancel-edit': () => { editingId = null; confirmingDelete = false; renderLog(); },
  edit: ({ id }) => {
    const entry = sets.getEntries().find((e) => e.timestamp === id);
    editingId = id;
    confirmingDelete = false;
    selectedVariant = variantOf(entry);
    fillForm(entry);
    renderLog();
  },
  delete: () => { confirmingDelete = true; renderLog(); },
  'cancel-delete': () => { confirmingDelete = false; renderLog(); },
  'confirm-delete': () => {
    const id = editingId;
    editingId = null;
    confirmingDelete = false;
    sets.remove(id);
  },
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
  editActions.hidden = editingId === null || confirmingDelete;
  deleteActions.hidden = !confirmingDelete;
  updateSaveButtons();
  const exerciseSets = sets.getEntries().filter((entry) => entry.exercise === exercise);
  analysisLink.hidden = exerciseSets.length === 0;
  historyEl.innerHTML = historyHtml(exerciseSets, {
    lead: [variantOf],
    valueHtml: ({ reps, weight }) => `<span class="set-reps">${reps}</span> × ${roundValue(weight)}`,
    describe: describeSet,
    isUnsynced: sets.isUnsynced,
    editingId,
    empty: 'No sets logged yet.',
  });
}

export function currentExercise() {
  return allExercises().includes(selected) ? selected : allExercises()[0];
}

export function currentVariant() {
  return allVariants(currentExercise()).includes(selectedVariant) ? selectedVariant : '';
}

function selectExercise(exercise) {
  selected = exercise;
  selectedVariant = variantOf(lastSetOf(exercise));
  editingId = null;
  confirmingDelete = false;
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
