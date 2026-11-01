import { revealPressedChip } from './chip-row.js';
import { onAction } from './events.js';
import { addVariant, allVariants, removeVariant } from './exercises.js';
import { escapeHtml } from './format.js';
import { highlight } from './highlight.js';

const NEW_CHIP = '<button type="button" class="chip chip-new" data-action="start-add" aria-label="New variant">+</button>';

const picker = document.getElementById('variant-picker');
const bar = document.getElementById('variant-bar');
const chipsEl = document.getElementById('variant-chips');
const editButton = document.getElementById('variant-edit');
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
  'toggle-edit': () => {
    isEditing = !isEditing;
    render();
    if (isEditing) chipsEl.scrollLeft = 0;
    else revealPressedChip(chipsEl);
  },
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
  const isOtherExercise = selectedExercise !== exercise;
  const isPicked = isOtherExercise || variant !== current;
  if (isOtherExercise) {
    isEditing = false;
    isAdding = false;
  }
  exercise = selectedExercise;
  current = variant;
  render();
  if (isPicked) revealPressedChip(chipsEl);
}

export function highlightVariants(names) {
  const chips = [...chipsEl.querySelectorAll('.chip')].filter((chip) => names.includes(chip.dataset.name));
  chips.forEach(highlight);
  chips[0]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function render() {
  const variants = allVariants(exercise);
  const hasChips = !isAdding && variants.length > 0;
  isEditing &&= hasChips;
  picker.hidden = exercise === undefined || (!isAdding && !hasChips);
  newButton.hidden = exercise === undefined || isAdding || hasChips;
  bar.hidden = !hasChips;
  chipsEl.innerHTML = (isEditing ? NEW_CHIP : '') + variants.map(chipHtml).join('');
  renderEditButton();
  addForm.hidden = !isAdding;
}

function renderEditButton() {
  const [text, label] = isEditing ? ['Done', 'Done editing variants'] : ['Edit', 'Edit variants'];
  editButton.textContent = text;
  editButton.setAttribute('aria-label', label);
}

function chipHtml(variant) {
  const name = escapeHtml(variant);
  return isEditing
    ? `<button type="button" class="chip" data-action="remove" data-name="${name}" aria-label="Remove ${name}">${name} ×</button>`
    : `<button type="button" class="chip" data-action="pick" data-name="${name}" aria-pressed="${variant === current}">${name}</button>`;
}
