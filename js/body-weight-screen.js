import { initChart, renderChart } from './body-weight-chart.js';
import { entryDate } from './entry-log.js';
import { onAction } from './events.js';
import { daysBetween, formatDay, formatDelta, formatTime, roundValue } from './format.js';
import { historyHtml, revealNewest } from './history.js';
import { DECIMAL, bindNumberInput, stepInput } from './number-field.js';
import { bodyWeights } from './store.js';

const FIELD = { ...DECIMAL, step: 0.1, min: 0 };

const describeWeight = ({ weight }) => String(roundValue(weight));

const controls = document.getElementById('body-weight-controls');
const input = document.getElementById('body-weight');
const logButton = document.getElementById('body-weight-log');
const saveButton = document.getElementById('body-weight-save');
const editActions = document.getElementById('body-weight-edit-actions');
const deleteActions = document.getElementById('body-weight-delete-actions');
const historyEl = document.getElementById('body-weight-history');

let editingId = null;
let confirmingDelete = false;

const actions = {
  step: ({ dir }) => {
    stepInput(input, FIELD, Number(dir));
    updateSaveButtons();
  },
  log: () => {
    const weight = readWeight();
    if (!weight) return;
    bodyWeights.add({ weight });
    revealNewest(historyEl);
  },
  save: () => {
    const weight = readWeight();
    if (!weight) return;
    const id = editingId;
    editingId = null;
    confirmingDelete = false;
    bodyWeights.update(id, { weight });
  },
  'cancel-edit': () => { editingId = null; confirmingDelete = false; renderBodyWeight(); },
  edit: ({ id }) => {
    editingId = id;
    confirmingDelete = false;
    fillForm(bodyWeights.getEntries().find((e) => e.timestamp === id));
    renderBodyWeight();
  },
  delete: () => { confirmingDelete = true; renderBodyWeight(); },
  'cancel-delete': () => { confirmingDelete = false; renderBodyWeight(); },
  'confirm-delete': () => {
    const id = editingId;
    editingId = null;
    confirmingDelete = false;
    bodyWeights.remove(id);
  },
};

export function initBodyWeight() {
  fillForm(bodyWeights.getEntries().at(-1));
  onAction([controls, historyEl], actions);
  bindNumberInput(input, FIELD, updateSaveButtons);
  initChart();
}

export function renderBodyWeight() {
  logButton.hidden = editingId !== null;
  editActions.hidden = editingId === null || confirmingDelete;
  deleteActions.hidden = !confirmingDelete;
  updateSaveButtons();
  renderChart();
  const entries = bodyWeights.getEntries();
  const changes = changesByTimestamp(entries);
  historyEl.innerHTML = historyHtml(entries, {
    lead: [(entry) => formatDay(entryDate(entry)), (entry) => formatTime(entryDate(entry))],
    valueHtml: (entry) => weightHtml(entry, changes.get(entry.timestamp)),
    describe: describeWeight,
    isUnsynced: bodyWeights.isUnsynced,
    flat: true,
    editingId,
    empty: 'No weights logged yet.',
  });
}

function changesByTimestamp(entries) {
  return new Map(entries.slice(1).map((entry, i) => [entry.timestamp, changeFrom(entries[i], entry)]));
}

const changeFrom = (previous, entry) => ({
  delta: entry.weight - previous.weight,
  days: daysBetween(entryDate(previous), entryDate(entry)),
});

function weightHtml(entry, change) {
  const weight = `<span class="set-weight">${describeWeight(entry)}</span>`;
  if (!change) return weight;
  const gap = change.days > 1 ? ` · ${change.days}d` : '';
  return `${weight}<span class="set-change">${formatDelta(change.delta)}${gap}</span>`;
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
