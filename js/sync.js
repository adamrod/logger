import { parseCsv, toCsv } from './csv.js';
import { notifyChange } from './events.js';
import { readFile, writeFile } from './github.js';
import { getSettings, isSyncConfigured } from './settings.js';
import { entryLogs } from './store.js';

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
  const repo = getSettings();
  for (const log of entryLogs) await syncLog(repo, log);
}

async function syncLog(repo, log) {
  const at = new Date().toISOString();
  const remote = await readFile(repo, log.file);
  const remoteEntries = parseCsv(remote?.text ?? '', log.numbers).filter((entry) => entry.timestamp);
  const entries = mergeEntries(log.getEntries(), remoteEntries, log.getSyncMeta());
  const text = toCsv(entries, log.columns);
  if (text !== remote?.text) await writeFile(repo, log.file, text, remote?.sha);
  log.applySync({ entries, at });
}

function setSyncState(changes) {
  Object.assign(syncState, changes);
  notifyChange();
}
