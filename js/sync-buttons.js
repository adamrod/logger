import { isSyncConfigured } from './settings.js';
import { entryLogs } from './store.js';
import { sync, syncState } from './sync.js';

const buttons = document.querySelectorAll('.sync-button');

export function initSyncButtons() {
  buttons.forEach((button) => button.addEventListener('click', sync));
}

export function renderSyncButtons() {
  const hasChanges = entryLogs.some((log) => log.hasChanges());
  buttons.forEach((button) => {
    button.hidden = !isSyncConfigured();
    button.disabled = syncState.running;
    button.textContent = buttonText();
    button.classList.toggle('is-quiet', !hasChanges && !syncState.error);
  });
}

function buttonText() {
  if (syncState.running) return 'Syncing…';
  if (syncState.error) return 'Sync failed';
  return 'Sync';
}
