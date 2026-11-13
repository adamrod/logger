import { allCompetitions, deleteCompetition, isOtherCompetition, saveCompetition } from './competitions.js';
import { onAction } from './events.js';
import { formatDateTimeValue, parseDateTimeValue } from './format.js';
import { INTEGER, bindNumberInput } from './number-field.js';

const QUARTER_HOUR_MS = 15 * 60000;
const DEFAULT_LENGTH_MS = 2 * 60 * 60000;
const MAX_BOULDERS = 100;
const DEFAULTS = { first: 1, last: 30, topPoints: 10, zonePoints: 1 };

const form = document.getElementById('competition-form');
const nameInput = document.getElementById('competition-name');
const startInput = document.getElementById('competition-start');
const endInput = document.getElementById('competition-end');
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
let shownStart = null;
let isConfirmingDelete = false;
let onClose = () => {};

export function initCompetitionForm(closeHandler) {
  onClose = closeHandler;
  onAction([form], {
    cancel: () => close(null),
    delete: () => confirmDelete(true),
    'cancel-delete': () => confirmDelete(false),
    'confirm-delete': () => {
      deleteCompetition(original);
      close(null);
    },
  });
  [firstInput, lastInput, topPointsInput, zonePointsInput].forEach((input) => bindNumberInput(input, INTEGER, () => {}));
  startInput.addEventListener('change', moveEndWithStart);
  form.addEventListener('submit', submit);
}

export function openCompetitionForm({ competition = null, name = '' }) {
  const shown = competition ?? newCompetition(name);
  original = competition;
  shownStart = new Date(shown.start);
  isConfirmingDelete = false;
  nameInput.value = shown.name;
  startInput.value = formatDateTimeValue(shownStart);
  endInput.value = formatDateTimeValue(new Date(shown.end));
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

function newCompetition(name) {
  const startAt = Math.ceil(Date.now() / QUARTER_HOUR_MS) * QUARTER_HOUR_MS;
  return { ...DEFAULTS, name, start: new Date(startAt).toISOString(), end: new Date(startAt + DEFAULT_LENGTH_MS).toISOString() };
}

const readWhen = (input) => (input.value ? parseDateTimeValue(input.value) : null);

function moveEndWithStart() {
  const start = readWhen(startInput);
  const end = readWhen(endInput);
  if (!start) return;
  if (end) endInput.value = formatDateTimeValue(new Date(end.getTime() + start.getTime() - shownStart.getTime()));
  shownStart = start;
}

function formFields() {
  return {
    name: nameInput.value.trim(),
    start: readWhen(startInput)?.toISOString() ?? '',
    end: readWhen(endInput)?.toISOString() ?? '',
    first: INTEGER.parse(firstInput.value),
    last: INTEGER.parse(lastInput.value),
    topPoints: INTEGER.parse(topPointsInput.value),
    zonePoints: INTEGER.parse(zonePointsInput.value),
  };
}

function problemWith({ name, start, end, first, last, topPoints, zonePoints }) {
  if (!name) return 'Give the competition a name.';
  if (isOtherCompetition(name, original)) return 'You already have a competition with this name.';
  if (!start || !end) return 'Set when the competition starts and ends.';
  if (end <= start) return 'The end has to be after the start.';
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
  formActions.hidden = isConfirmingDelete;
  deleteActions.hidden = !isConfirmingDelete;
  cancelButton.hidden = allCompetitions().length === 0;
  deleteButton.hidden = !original;
}
