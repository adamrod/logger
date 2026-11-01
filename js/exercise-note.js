import { noteOf, saveNote } from './exercises.js';

const toggleButton = document.getElementById('note-toggle');
const field = document.getElementById('note-field');
const input = document.getElementById('note');

let exercise;
let isOpen = false;

export function initExerciseNote() {
  toggleButton.addEventListener('click', toggle);
  input.addEventListener('input', () => {
    fitToText();
    saveNote(exercise, input.value);
  });
}

export function renderExerciseNote(selectedExercise) {
  if (selectedExercise !== exercise) isOpen = false;
  exercise = selectedExercise;
  toggleButton.hidden = exercise === undefined;
  toggleButton.setAttribute('aria-expanded', isOpen);
  field.hidden = !isOpen;
  if (input !== document.activeElement) input.value = noteOf(exercise);
  fitToText();
}

function toggle() {
  isOpen = !isOpen;
  if (!isOpen) input.blur();
  renderExerciseNote(exercise);
  if (isOpen && !input.value) input.focus();
}

function fitToText() {
  input.style.height = 'auto';
  input.style.height = `${input.scrollHeight}px`;
}
