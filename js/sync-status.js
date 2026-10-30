import { formatShortWhen } from './format.js';
import { isSyncConfigured } from './settings.js';
import { hasUnsyncedChanges, lastSyncAt, sync, syncState } from './sync.js';

const statuses = document.querySelectorAll('.history-sync');

export function initSyncStatus() {
  statuses.forEach((status) => status.querySelector('.sync-button').addEventListener('click', sync));
}

export function renderSyncStatus() {
  const { text, isSynced = false, isFailed = false, canSync = false } = currentStatus();
  statuses.forEach((status) => {
    status.hidden = !isSyncConfigured();
    status.classList.toggle('is-synced', isSynced);
    status.classList.toggle('is-failed', isFailed);
    status.querySelector('.sync-text').textContent = text;
    status.querySelector('.sync-button').hidden = !canSync;
  });
}

function currentStatus() {
  if (syncState.running || syncState.scheduled) return { text: 'Syncing…' };
  if (!hasUnsyncedChanges() && !syncState.error) return { text: 'Synced', isSynced: true };
  const text = [problem(), lastSyncedText()].filter(Boolean).join(' · ');
  return { text, isFailed: navigator.onLine && Boolean(syncState.error), canSync: true };
}

function problem() {
  if (!navigator.onLine) return 'Offline';
  return syncState.error ? 'Sync failed' : 'Not synced';
}

function lastSyncedText() {
  const at = lastSyncAt();
  return at && `synced ${formatShortWhen(new Date(at))}`;
}
