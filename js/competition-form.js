import { allCompetitions, deleteCompetition, isOtherCompetition, saveCompetition } from './competitions.js';
import { onAction } from './events.js';
import { formatDateTimeValue, formatLength, parseDateTimeValue } from './format.js';
import { INTEGER, bindNumberInput } from './number-field.js';

const MINUTE_MS = 60000;
const MINUTES_STEP = 15;
const MAX_MINUTES = 12 * 60;
const MAX_BOULDERS = 100;
const DEFAULTS = { minutes: 120, first: 1, last: 30, topPoints: 10, zonePoints: 1 };

const form = document.getElementById('competition-form');
const nameInput = document.getElementById('competition-name');
const startInput = document.getElementById('competition-start');
const minutesEl = document.getElementById('competition-minutes');
const firstInput = document.getElementById('competition-first');
const lastInput = document.getElementById('competition-last');
const topPointsInput = document.getElementById('competition-top-points');
const zonePointsInput = document.getElementById('competition-zone-points');
const errorEl = document.getElementById('competition-error');
const formActions = document.getElementById('competition-form-actions');
const deleteActions = document.getElementById('competition-delete-actions');
const cancelButton = document.getElementById('competition-cancel');
const deleteButton = document.getElementById('competition-delete');

let original = null;
let minutes = DEFAULTS.minutes;
let isConfirmingDelete = false;
let onClose = () => {};

export function initCompetitionForm(closeHandler) {
  onClose = closeHandler;
  onAction([form], {
    minutes: ({ steps }) => {
      minutes = Math.min(MAX_MINUTES, Math.max(MINUTES_STEP, minutes + Number(steps) * MINUTES_STEP));
      render();
    },
    cancel: () => close(null),
    delete: () => confirmDelete(true),
    'cancel-delete': () => confirmDelete(false),
    'confirm-delete': () => {
      deleteCompetition(original);
      close(null);
    },
  });
  [firstInput, lastInput, topPointsInput, zonePointsInput].forEach((input) => bindNumberInput(input, INTEGER, () => {}));
  form.addEventListener('submit', submit);
}

export function openCompetitionForm({ competition = null, name = '' }) {
  const shown = competition ?? { ...DEFAULTS, name, start: nextQuarterHour(new Date()).toISOString() };
  original = competition;
  minutes = shown.minutes;
  isConfirmingDelete = false;
  nameInput.value = shown.name;
  startInput.value = formatDateTimeValue(new Date(shown.start));
  firstInput.value = shown.first;
  lastInput.value = shown.last;
  topPointsInput.value = shown.topPoints;
  zonePointsInput.value = shown.zonePoints;
  errorEl.hidden = true;
  form.hidden = false;
  render();
  if (!competition) nameInput.focus();
}

export const isCompetitionFormOpen = () => !form.hidden;

function nextQuarterHour(date) {
  const step = MINUTES_STEP * MINUTE_MS;
  return new Date(Math.ceil(date.getTime() / step) * step);
}

function formFields() {
  return {
    name: nameInput.value.trim(),
    start: startInput.value ? parseDateTimeValue(startInput.value).toISOString() : '',
    minutes,
    first: INTEGER.parse(firstInput.value),
    last: INTEGER.parse(lastInput.value),
    topPoints: INTEGER.parse(topPointsInput.value),
    zonePoints: INTEGER.parse(zonePointsInput.value),
  };
}

function problemWith({ name, start, first, last, topPoints, zonePoints }) {
  if (!name) return 'Give the competition a name.';
  if (isOtherCompetition(name, original)) return 'You already have a competition with this name.';
  if (!start) return 'Set when the competition starts.';
  if (Number.isNaN(first) || Number.isNaN(last) || last < first) return 'Set the first and the last boulder number.';
  if (last - first >= MAX_BOULDERS) return `A competition can have up to ${MAX_BOULDERS} boulders.`;
  return Number.isNaN(topPoints) || Number.isNaN(zonePoints) ? 'Set the points for a top and for a zone.' : '';
}

function submit(event) {
  event.preventDefault();
  const fields = formFields();
  const problem = problemWith(fields);
  errorEl.textContent = problem;
  errorEl.hidden = !problem;
  if (problem) return;
  saveCompetition(original, fields);
  close(fields.name);
}

function confirmDelete(isConfirming) {
  isConfirmingDelete = isConfirming;
  render();
}

function close(savedName) {
  form.hidden = true;
  document.activeElement?.blur();
  onClose(savedName);
}

function render() {
  minutesEl.textContent = formatLength(minutes * MINUTE_MS);
  formActions.hidden = isConfirmingDelete;
  deleteActions.hidden = !isConfirmingDelete;
  cancelButton.hidden = allCompetitions().length === 0;
  deleteButton.hidden = !original;
}
