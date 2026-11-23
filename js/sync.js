import { parseCsv, toCsv } from './csv.js';
import { byTimestamp, isAddedHere } from './entry-log.js';
import { notifyChange, onEdit } from './events.js';
import { isConflict, readFile, writeFile } from './github.js';
import { getSettings, isSyncConfigured } from './settings.js';
import { entryLogs } from './store.js';

const EDIT_DELAY = 1000;
const RETRY_INTERVAL = 60000;
const CONFLICT_RETRIES = 2;
const DATA_DIR = 'data';

export const syncState = { running: false, scheduled: false, error: null };

let rerunRequested = false;
let editTimer;

export const hasUnsyncedChanges = () => entryLogs.some((log) => log.hasChanges());

export function lastSyncAt() {
  const times = entryLogs.map((log) => log.getSyncMeta().lastSyncAt);
  return times.includes(null) ? null : times.toSorted()[0];
}

export function initAutoSync() {
  sync();
  onEdit(syncSoon);
  window.addEventListener('online', sync);
  window.addEventListener('offline', notifyChange);
  document.addEventListener('visibilitychange', syncOnVisibilityChange);
  setInterval(retryUnsynced, RETRY_INTERVAL);
}

export async function sync() {
  if (!isSyncConfigured()) return;
  if (syncState.running) {
    rerunRequested = true;
    return;
  }
  clearTimeout(editTimer);
  setSyncState({ running: true, scheduled: false, error: null });
  try {
    await syncWithRepo();
    setSyncState({ running: false });
  } catch (error) {
    setSyncState({ running: false, error: error.message });
  }
  if (rerunRequested) {
    rerunRequested = false;
    sync();
  }
}

export function mergeEntries(local, remote, syncMeta) {
  const remoteIds = new Set(remote.map((entry) => entry.timestamp));
  const deletedHere = new Set(syncMeta.deletedIds);
  const editedHere = new Map(local.filter((entry) => syncMeta.editedIds.includes(entry.timestamp)).map((entry) => [entry.timestamp, entry]));
  const isNewHere = (entry) => !remoteIds.has(entry.timestamp) && isAddedHere(syncMeta, entry);
  const remoteKept = remote
    .filter((entry) => !deletedHere.has(entry.timestamp))
    .map((entry) => editedHere.get(entry.timestamp) ?? entry);
  return [...remoteKept, ...local.filter(isNewHere)].sort(byTimestamp);
}

function syncSoon() {
  if (!isSyncConfigured() || !navigator.onLine) return;
  clearTimeout(editTimer);
  editTimer = setTimeout(sync, EDIT_DELAY);
  setSyncState({ scheduled: true });
}

function syncOnVisibilityChange() {
  if (document.visibilityState === 'visible' || hasUnsyncedChanges()) sync();
}

function retryUnsynced() {
  if (navigator.onLine && document.visibilityState === 'visible' && hasUnsyncedChanges()) sync();
}

async function syncWithRepo() {
  const repo = getSettings();
  const remotes = await Promise.all(entryLogs.map((log) => readFile(repo, pathOf(log))));
  for (const [index, log] of entryLogs.entries()) await syncLog(repo, log, remotes[index]);
}

async function syncLog(repo, log, remote, retriesLeft = CONFLICT_RETRIES) {
  try {
    await mergeWithRepo(repo, log, remote);
  } catch (error) {
    if (retriesLeft === 0 || !isConflict(error)) throw error;
    await syncLog(repo, log, await readFile(repo, pathOf(log)), retriesLeft - 1);
  }
}

const pathOf = (log) => `${DATA_DIR}/${log.file}`;

async function mergeWithRepo(repo, log, remote) {
  const path = pathOf(log);
  const remoteEntries = parseCsv(remote?.text ?? '', log.numbers).filter((entry) => entry.timestamp);
  const local = log.beginSync();
  const entries = mergeEntries(local.entries, remoteEntries, local.syncMeta);
  const at = syncedAt(entries);
  const text = toCsv(entries, log.columns);
  if (text !== remote?.text) await writeFile(repo, path, text, remote?.sha);
  log.applySync({ entries, at });
}

function syncedAt(entries) {
  const now = new Date().toISOString();
  const newest = entries.at(-1)?.timestamp ?? now;
  return newest > now ? newest : now;
}

function setSyncState(changes) {
  Object.assign(syncState, changes);
  notifyChange();
}
