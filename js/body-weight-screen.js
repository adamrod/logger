import { onAction } from './events.js';
import { roundValue } from './format.js';
import { historyHtml } from './history.js';
import { DECIMAL, bindNumberInput, stepInput } from './number-field.js';
import { bodyWeights } from './store.js';

const FIELD = { ...DECIMAL, step: 0.1, min: 0 };

const controls = document.getElementById('body-weight-controls');
const input = document.getElementById('body-weight');
const logButton = document.getElementById('body-weight-log');
const saveButton = document.getElementById('body-weight-save');
const editActions = document.getElementById('body-weight-edit-actions');
const historyEl = document.getElementById('body-weight-history');

let editingId = null;
let confirmingId = null;

const actions = {
  step: ({ dir }) => {
    stepInput(input, FIELD, Number(dir));
    updateSaveButtons();
  },
  log: () => {
    const weight = readWeight();
    confirmingId = null;
    if (weight) bodyWeights.add({ weight });
  },
  save: () => {
    const weight = readWeight();
    if (!weight) return;
    const id = editingId;
    editingId = null;
    bodyWeights.update(id, { weight });
  },
  'cancel-edit': () => { editingId = null; renderBodyWeight(); },
  edit: ({ id }) => {
    editingId = id;
    confirmingId = null;
    fillForm(bodyWeights.getEntries().find((e) => e.timestamp === id));
    renderBodyWeight();
  },
  delete: ({ id }) => { confirmingId = id; renderBodyWeight(); },
  'cancel-delete': () => { confirmingId = null; renderBodyWeight(); },
  'confirm-delete': ({ id }) => { confirmingId = null; bodyWeights.remove(id); },
};

export function initBodyWeight() {
  fillForm(bodyWeights.getEntries().at(-1));
  onAction([controls, historyEl], actions);
  bindNumberInput(input, FIELD, updateSaveButtons);
}

export function renderBodyWeight() {
  logButton.hidden = editingId !== null;
  editActions.hidden = editingId === null;
  updateSaveButtons();
  historyEl.innerHTML = historyHtml(bodyWeights.getEntries(), {
    describe: ({ weight }) => String(roundValue(weight)),
    isUnsynced: bodyWeights.isUnsynced,
    showTime: true,
    editingId,
    confirmingId,
    empty: 'No weights logged yet.',
  });
}

function fillForm(entry) {
  input.value = entry ? roundValue(entry.weight) : '';
}

function readWeight() {
  const weight = FIELD.parse(input.value);
  return weight > 0 ? weight : null;
}

function updateSaveButtons() {
  saveButton.disabled = !readWeight();
  logButton.disabled = !readWeight();
}
