import { formatWhen } from './format.js';
import { keepAwake } from './keep-awake.js';
import { getSettings, isSyncConfigured, updateSettings } from './settings.js';
import { bodyWeights, sets } from './store.js';
import { lastSyncAt, sync, syncState } from './sync.js';

const settingInputs = document.querySelectorAll('[data-setting]');
const screenTimeoutSelect = document.getElementById('setting-screen-timeout');
const statusEl = document.getElementById('sync-status');
const syncButton = document.getElementById('sync-now');
const exportSetsButton = document.getElementById('export-sets');
const exportBodyWeightButton = document.getElementById('export-body-weight');

export function initSettings() {
  settingInputs.forEach((input) => input.addEventListener('change', () => {
    updateSettings({ [input.dataset.setting]: input.value.trim() });
  }));
  screenTimeoutSelect.addEventListener('change', () => {
    updateSettings({ screenTimeout: Number(screenTimeoutSelect.value) });
    keepAwake();
  });
  syncButton.addEventListener('click', sync);
  exportSetsButton.addEventListener('click', () => exportCsv(sets));
  exportBodyWeightButton.addEventListener('click', () => exportCsv(bodyWeights));
}

export function renderSettings() {
  const settings = getSettings();
  settingInputs.forEach((input) => {
    if (input !== document.activeElement) input.value = settings[input.dataset.setting];
  });
  screenTimeoutSelect.value = settings.screenTimeout;
  statusEl.textContent = syncStatusText();
  syncButton.disabled = syncState.running || !isSyncConfigured();
}

function syncStatusText() {
  if (syncState.running) return 'Syncing…';
  if (syncState.error) return syncState.error;
  if (!isSyncConfigured()) return 'Add a token to sync';
  const at = lastSyncAt();
  return at ? `Last synced ${formatWhen(new Date(at))}` : 'Not synced yet';
}

function exportCsv(log) {
  const blob = new Blob([log.asCsv()], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: log.file });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
