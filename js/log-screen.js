import { createEntryEditor } from './entry-editor.js';
import { allExercises, allVariants } from './exercises.js';
import { initExerciseNote, renderExerciseNote } from './exercise-note.js';
import { initExercisePicker, renderExercisePicker } from './exercise-picker.js';
import { initVariantPicker, renderVariantPicker } from './variant-picker.js';
import { onAction } from './events.js';
import { roundValue } from './format.js';
import { revealNewest } from './history.js';
import { onHoldStep } from './hold-step.js';
import { DECIMAL, INTEGER, bindNumberInput, stepInput } from './number-field.js';
import { initRestTimer, renderRestTimer } from './rest-timer.js';
import { setHistoryHtml } from './set-history.js';
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
const historyEl = document.getElementById('history-list');
const analysisLink = document.getElementById('analysis-link');

let selected = sets.getEntries().at(-1)?.exercise;
let selectedVariant = variantOf(sets.getEntries().at(-1));
let editedVariant = '';

const isEditing = () => editor.editingId() !== null;

const editor = createEntryEditor(sets, {
  logButton,
  editActions: document.getElementById('edit-actions'),
  deleteActions: document.getElementById('delete-actions'),
  whenField: document.getElementById('set-when-field'),
  whenInput: document.getElementById('set-when'),
}, { read: readEditedSet, fill: fillEditedSet, render: renderLog });

const actions = {
  ...editor.actions,
  step: ({ field, steps }, size = 1) => {
    stepInput(inputs[field], FIELDS[field], Number(steps) * size);
    updateSaveButtons();
  },
  log: () => {
    const set = readSet();
    if (!set) return;
    sets.add({ exercise: currentExercise(), variant: currentVariant(), ...set });
    revealNewest(historyEl, sets.getEntries().at(-1));
  },
};

export function initLog() {
  initExercisePicker(selectExercise);
  initVariantPicker(selectVariant);
  initExerciseNote();
  fillForm(lastSetOf(currentExercise()) ?? EMPTY_SET);
  onAction([controls, historyEl], actions);
  onHoldStep(controls, actions.step);
  Object.entries(inputs).forEach(([key, input]) => bindNumberInput(input, FIELDS[key], updateSaveButtons));
  initRestTimer();
}

export function renderLog() {
  const exercise = currentExercise();
  renderExercisePicker(exercise);
  renderExerciseNote(exercise);
  renderVariantPicker(exercise, isEditing() ? editedVariant : currentVariant());
  editor.render();
  updateSaveButtons();
  renderRestTimer();
  const exerciseSets = sets.getEntries().filter((entry) => entry.exercise === exercise);
  analysisLink.hidden = exerciseSets.length === 0;
  historyEl.innerHTML = setHistoryHtml(exerciseSets, {
    variant: currentVariant(),
    isUnsynced: sets.isUnsynced,
    editingId: editor.editingId(),
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
  selectedVariant = allVariants(exercise).includes(selectedVariant) ? selectedVariant : variantOf(lastSetOf(exercise));
  editor.stopEditing();
  fillForm(lastSetOfVariant(exercise, selectedVariant) ?? lastSetOf(exercise) ?? EMPTY_SET);
  renderLog();
}

function selectVariant(variant) {
  if (isEditing()) editedVariant = variant;
  else {
    selectedVariant = variant;
    const last = lastSetOfVariant(currentExercise(), variant);
    if (last) fillForm(last);
  }
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

function fillEditedSet(entry) {
  editedVariant = variantOf(entry);
  fillForm(entry);
}

function readSet() {
  const reps = FIELDS.reps.parse(inputs.reps.value);
  const weight = FIELDS.weight.parse(inputs.weight.value);
  return reps > 0 && weight >= 0 ? { reps, weight } : null;
}

function readEditedSet() {
  const set = readSet();
  return set && { variant: editedVariant, ...set };
}

function updateSaveButtons() {
  saveButton.disabled = !readSet();
  logButton.disabled = !readSet() || !currentExercise();
}
