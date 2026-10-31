import { initChart, renderChart } from './body-weight-chart.js';
import { createEntryEditor } from './entry-editor.js';
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
const historyEl = document.getElementById('body-weight-history');

const editor = createEntryEditor(bodyWeights, {
  logButton,
  editActions: document.getElementById('body-weight-edit-actions'),
  deleteActions: document.getElementById('body-weight-delete-actions'),
  whenField: document.getElementById('body-weight-when-field'),
  whenInput: document.getElementById('body-weight-when'),
}, { read: readEntry, fill: fillForm, render: renderBodyWeight });

const actions = {
  ...editor.actions,
  step: ({ dir }) => {
    stepInput(input, FIELD, Number(dir));
    updateSaveButtons();
  },
  log: () => {
    const entry = readEntry();
    if (!entry) return;
    bodyWeights.add(entry);
    revealNewest(historyEl, bodyWeights.getEntries().at(-1));
  },
};

export function initBodyWeight() {
  fillForm(bodyWeights.getEntries().at(-1));
  onAction([controls, historyEl], actions);
  bindNumberInput(input, FIELD, updateSaveButtons);
  initChart();
}

export function renderBodyWeight() {
  editor.render();
  updateSaveButtons();
  renderChart();
  const entries = bodyWeights.getEntries();
  const changes = changesByTimestamp(entries);
  historyEl.innerHTML = historyHtml(entries, {
    lead: [(entry) => formatDay(entryDate(entry)), (entry) => formatTime(entryDate(entry))],
    valueHtml: (entry) => weightHtml(entry, changes.get(entry.timestamp)),
    describe: describeWeight,
    isUnsynced: bodyWeights.isUnsynced,
    editingId: editor.editingId(),
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
  return `${weight}<span class="set-delta">${formatDelta(change.delta)}</span><span class="set-days">${change.days}d</span>`;
}

function fillForm(entry) {
  input.value = entry ? roundValue(entry.weight) : '';
}

function readEntry() {
  const weight = FIELD.parse(input.value);
  return weight > 0 ? { weight } : null;
}

function updateSaveButtons() {
  saveButton.disabled = !readEntry();
  logButton.disabled = !readEntry();
}
