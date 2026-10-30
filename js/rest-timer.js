import { entryDate } from './entry-log.js';
import { formatDuration } from './format.js';
import { sets } from './store.js';

const SHOWN_FOR_MS = 30 * 60000;
const TICK_MS = 1000;

const timerEl = document.getElementById('rest-timer');

export function restSince(lastSet, now) {
  const elapsed = lastSet ? now - entryDate(lastSet).getTime() : -1;
  return elapsed >= 0 && elapsed < SHOWN_FOR_MS ? elapsed : null;
}

export function initRestTimer() {
  setInterval(renderRestTimer, TICK_MS);
}

export function renderRestTimer() {
  const elapsed = restSince(sets.getEntries().at(-1), Date.now());
  timerEl.hidden = elapsed === null;
  timerEl.textContent = elapsed === null ? '' : `Rest ${formatDuration(elapsed)}`;
}
