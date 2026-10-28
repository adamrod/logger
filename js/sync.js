import { parseCsv, toCsv } from './csv.js';
import { notifyChange } from './events.js';
import { readFile, writeFile } from './github.js';
import { getSettings, isSyncConfigured } from './settings.js';
import { ENTRY_COLUMNS, ENTRY_NUMBERS, applySync, getEntries, getSyncMeta } from './store.js';

const DATA_PATH = 'data.csv';

export const syncState = { running: false, error: null };

export async function sync() {
  if (syncState.running || !isSyncConfigured()) return;
  setSyncState({ running: true, error: null });
  try {
    await syncWithRepo();
    setSyncState({ running: false });
  } catch (error) {
    setSyncState({ running: false, error: error.message });
  }
}

export function mergeEntries(local, remote, { lastSyncAt, deletedIds, editedIds }) {
  const remoteIds = new Set(remote.map((entry) => entry.timestamp));
  const deletedHere = new Set(deletedIds);
  const editedHere = new Map(local.filter((entry) => editedIds.includes(entry.timestamp)).map((entry) => [entry.timestamp, entry]));
  const isNewHere = (entry) => !remoteIds.has(entry.timestamp) && (!lastSyncAt || entry.timestamp > lastSyncAt);
  const remoteKept = remote
    .filter((entry) => !deletedHere.has(entry.timestamp))
    .map((entry) => editedHere.get(entry.timestamp) ?? entry);
  return [...remoteKept, ...local.filter(isNewHere)].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

async function syncWithRepo() {
  const at = new Date().toISOString();
  const repo = getSettings();
  const remote = await readFile(repo, DATA_PATH);
  const remoteEntries = parseCsv(remote?.text ?? '', ENTRY_NUMBERS).filter((entry) => entry.timestamp);
  const entries = mergeEntries(getEntries(), remoteEntries, getSyncMeta());
  const text = toCsv(entries, ENTRY_COLUMNS);
  if (text !== remote?.text) await writeFile(repo, DATA_PATH, text, remote?.sha);
  applySync({ entries, at });
}

function setSyncState(changes) {
  Object.assign(syncState, changes);
  notifyChange();
}
