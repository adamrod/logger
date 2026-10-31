import { onAction } from './events.js';
import { addVariant, allVariants, removeVariant } from './exercises.js';
import { escapeHtml } from './format.js';

const NEW_CHIP = '<button type="button" class="chip chip-new" data-action="start-add" aria-label="New variant">+</button>';

const picker = document.getElementById('variant-picker');
const chipsEl = document.getElementById('variant-chips');
const addForm = document.getElementById('variant-add');
const nameInput = document.getElementById('variant-name');
const newButton = document.getElementById('variant-new');

let exercise;
let current = '';
let isEditing = false;
let isAdding = false;
let onPick = () => {};

const actions = {
  pick: ({ name }) => onPick(name === current ? '' : name),
  remove: ({ name }) => {
    const wasCurrent = name === current;
    removeVariant(exercise, name);
    if (wasCurrent) onPick('');
  },
  'toggle-edit': () => { isEditing = !isEditing; render(); },
  'start-add': () => { isEditing = false; isAdding = true; nameInput.value = ''; render(); nameInput.focus(); },
  'cancel-add': () => { isAdding = false; render(); },
};

export function initVariantPicker(pickHandler) {
  onPick = pickHandler;
  onAction([picker, newButton], actions);
  addForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    isAdding = false;
    onPick(addVariant(exercise, name));
  });
}

export function renderVariantPicker(selectedExercise, variant) {
  if (selectedExercise !== exercise) {
    isEditing = false;
    isAdding = false;
  }
  exercise = selectedExercise;
  current = variant;
  render();
}

function render() {
  const variants = allVariants(exercise);
  const hasChips = !isAdding && variants.length > 0;
  isEditing &&= hasChips;
  picker.hidden = exercise === undefined || (!isAdding && !hasChips);
  newButton.hidden = exercise === undefined || isAdding || hasChips;
  chipsEl.hidden = !hasChips;
  chipsEl.innerHTML = variants.map(chipHtml).join('') + (isEditing ? '' : NEW_CHIP) + editButtonHtml();
  addForm.hidden = !isAdding;
}

function editButtonHtml() {
  const [text, label] = isEditing ? ['Done', 'Done editing variants'] : ['Edit', 'Edit variants'];
  return `<button type="button" class="btn-text chips-edit" data-action="toggle-edit" aria-label="${label}">${text}</button>`;
}

function chipHtml(variant) {
  const name = escapeHtml(variant);
  return isEditing
    ? `<button type="button" class="chip" data-action="remove" data-name="${name}" aria-label="Remove ${name}">${name} ×</button>`
    : `<button type="button" class="chip" data-action="pick" data-name="${name}" aria-pressed="${variant === current}">${name}</button>`;
}
