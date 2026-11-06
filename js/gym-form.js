import { markPressed } from './chart-controls.js';
import { FONT_GRADES, numberGrades, scaleTypeOf } from './climbing.js';
import { onAction } from './events.js';
import { allGyms, isOtherGym, saveGym } from './gyms.js';

const DEFAULT_COUNT = 9;
const MIN_COUNT = 3;
const MAX_COUNT = 30;
const GRADE_SEPARATORS = /[,\n]/;

const form = document.getElementById('gym-form');
const nameInput = document.getElementById('gym-name');
const scaleGroup = document.getElementById('gym-scale');
const countField = document.getElementById('gym-count-field');
const countEl = document.getElementById('gym-count');
const customInput = document.getElementById('gym-custom');
const errorEl = document.getElementById('gym-error');
const cancelButton = document.getElementById('gym-cancel');

let original = null;
let scale = 'font';
let count = DEFAULT_COUNT;
let onClose = () => {};

export function initGymForm(closeHandler) {
  onClose = closeHandler;
  onAction([form], {
    scale: ({ scale: chosen }) => { scale = chosen; render(); },
    count: ({ steps }) => { count = Math.min(MAX_COUNT, Math.max(MIN_COUNT, count + Number(steps))); render(); },
    cancel: () => close(null),
  });
  form.addEventListener('submit', submit);
}

export function openGymForm({ name, grades = null, isNew }) {
  original = isNew ? null : name;
  scale = grades ? scaleTypeOf(grades) : 'font';
  count = scale === 'numbers' ? grades.length : DEFAULT_COUNT;
  nameInput.value = name;
  customInput.value = scale === 'custom' ? grades.join(', ') : '';
  errorEl.hidden = true;
  cancelButton.hidden = allGyms().length === 0;
  form.hidden = false;
  render();
  nameInput.focus();
}

export const isGymFormOpen = () => !form.hidden;

export function showFirstGymForm() {
  if (form.hidden) openGymForm({ name: '', isNew: true });
}

function formGrades() {
  if (scale === 'font') return FONT_GRADES;
  if (scale === 'numbers') return numberGrades(count);
  const typed = customInput.value.split(GRADE_SEPARATORS).map((grade) => grade.replaceAll('|', '').trim());
  return [...new Set(typed.filter(Boolean))];
}

function problemWith(name, grades) {
  if (!name) return 'Give the gym a name.';
  if (isOtherGym(name, original)) return 'You already have a gym with this name.';
  return grades.length < 2 ? 'Add at least two grades, easiest first.' : '';
}

function submit(event) {
  event.preventDefault();
  const name = nameInput.value.trim();
  const grades = formGrades();
  const problem = problemWith(name, grades);
  errorEl.textContent = problem;
  errorEl.hidden = !problem;
  if (problem) return;
  form.hidden = true;
  saveGym(original, name, grades);
  onClose(name);
}

function close(name) {
  form.hidden = true;
  nameInput.blur();
  onClose(name);
}

function render() {
  markPressed(scaleGroup, 'scale', scale);
  countField.hidden = scale !== 'numbers';
  customInput.hidden = scale !== 'custom';
  countEl.textContent = `1 to ${count}`;
}
