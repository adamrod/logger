import { toCsv } from './csv.js';
import { formatWhen } from './format.js';
import { getSettings, isSyncConfigured, updateSettings } from './settings.js';
import { ENTRY_COLUMNS, getEntries, getSyncMeta } from './store.js';
import { sync, syncState } from './sync.js';

const settingInputs = document.querySelectorAll('[data-setting]');
const statusEl = document.getElementById('sync-status');
const syncButton = document.getElementById('sync-now');
const exportButton = document.getElementById('export-csv');

export function initSettings() {
  settingInputs.forEach((input) => input.addEventListener('change', () => {
    updateSettings({ [input.dataset.setting]: input.value.trim() });
  }));
  syncButton.addEventListener('click', sync);
  exportButton.addEventListener('click', exportCsv);
}

export function renderSettings() {
  const settings = getSettings();
  settingInputs.forEach((input) => {
    if (input !== document.activeElement) input.value = settings[input.dataset.setting];
  });
  statusEl.textContent = syncStatusText();
  syncButton.disabled = syncState.running || !isSyncConfigured();
}

function syncStatusText() {
  const { lastSyncAt } = getSyncMeta();
  if (syncState.running) return 'Syncing…';
  if (syncState.error) return syncState.error;
  if (!isSyncConfigured()) return 'Add a token to sync';
  return lastSyncAt ? `Last synced ${formatWhen(new Date(lastSyncAt))}` : 'Not synced yet';
}

function exportCsv() {
  const blob = new Blob([toCsv(getEntries(), ENTRY_COLUMNS)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: 'data.csv' });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
