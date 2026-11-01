import { canRedo, canUndo, nextRedo, nextUndo } from './undo.js';

const undoButton = document.getElementById('undo');
const redoButton = document.getElementById('redo');

let isReplaying = false;

export function initUndoButtons(reveal) {
  undoButton.addEventListener('click', () => replay(nextUndo, reveal));
  redoButton.addEventListener('click', () => replay(nextRedo, reveal));
}

export function renderUndoButtons() {
  undoButton.disabled = !canUndo();
  redoButton.disabled = !canRedo();
}

async function replay(next, reveal) {
  const step = next();
  if (isReplaying || !step) return;
  isReplaying = true;
  document.activeElement?.blur();
  try {
    await reveal(step);
  } finally {
    isReplaying = false;
  }
}
