import { parseCsv, toCsv } from './csv.js';
import { notifyChange, notifyEdit } from './events.js';

const EMPTY_SYNC = { lastSyncAt: null, addedIds: [], deletedIds: [], editedIds: [] };

export const entryDate = (entry) => new Date(entry.timestamp);

export const byTimestamp = (a, b) => a.timestamp.localeCompare(b.timestamp);

const idsOf = (entries) => entries.map((entry) => entry.timestamp);

export function createEntryLog({ file, columns, numbers, keys }) {
  let entries = parseCsv(localStorage.getItem(keys.entries) ?? '', numbers);
  let syncMeta = { ...EMPTY_SYNC, ...JSON.parse(localStorage.getItem(keys.sync) ?? '{}') };
  let changedDuringSync = new Set();

  const isPending = (entry) => !syncMeta.lastSyncAt
    || entry.timestamp > syncMeta.lastSyncAt
    || syncMeta.addedIds.includes(entry.timestamp);

  const isSynced = (entry) => !isPending(entry);

  const isUnsynced = (entry) => isPending(entry) || syncMeta.editedIds.includes(entry.timestamp);

  const asCsv = () => toCsv(entries, columns);

  const touch = (changed) => idsOf(changed).forEach((id) => changedDuringSync.add(id));

  function remember(key, changed) {
    syncMeta = { ...syncMeta, [key]: [...new Set([...syncMeta[key], ...idsOf(changed)])] };
  }

  function markAdded(added) {
    touch(added);
    remember('addedIds', added);
  }

  function markChanged(key, changed) {
    touch(changed);
    remember(key, changed.filter(isSynced));
  }

  function freeTimestamp(wanted) {
    const taken = new Set(idsOf(entries));
    let time = Date.parse(wanted);
    while (taken.has(new Date(time).toISOString())) time += 1;
    return new Date(time).toISOString();
  }

  function nextUniqueTimestamp() {
    const last = entries.at(-1);
    const now = Date.now();
    return new Date(last ? Math.max(now, Date.parse(last.timestamp) + 1) : now).toISOString();
  }

  function save() {
    localStorage.setItem(keys.entries, asCsv());
    localStorage.setItem(keys.sync, JSON.stringify(syncMeta));
    notifyChange();
  }

  function saveEdit() {
    save();
    notifyEdit();
  }

  return {
    file,
    columns,
    numbers,
    asCsv,
    getEntries: () => entries,
    getSyncMeta: () => syncMeta,
    isUnsynced,
    hasChanges: () => syncMeta.deletedIds.length > 0 || entries.some(isUnsynced),

    add(entry) {
      const added = { timestamp: nextUniqueTimestamp(), ...entry };
      entries = [...entries, added];
      markAdded([added]);
      saveEdit();
    },

    update(timestamp, changes) {
      const entry = entries.find((e) => e.timestamp === timestamp);
      if (!entry) return;
      const isMoved = (changes.timestamp ?? timestamp) !== timestamp;
      const updated = { ...entry, ...changes, timestamp: isMoved ? freeTimestamp(changes.timestamp) : timestamp };
      entries = entries.map((e) => (e === entry ? updated : e)).sort(byTimestamp);
      if (isMoved) {
        markChanged('deletedIds', [entry]);
        markAdded([updated]);
      } else markChanged('editedIds', [entry]);
      saveEdit();
    },

    updateWhere(matches, changes) {
      const matched = new Set(entries.filter(matches));
      entries = entries.map((e) => (matched.has(e) ? { ...e, ...changes } : e));
      markChanged('editedIds', [...matched]);
      saveEdit();
    },

    remove(timestamp) {
      const entry = entries.find((e) => e.timestamp === timestamp);
      if (!entry) return;
      entries = entries.filter((e) => e !== entry);
      markChanged('deletedIds', [entry]);
      saveEdit();
    },

    beginSync() {
      changedDuringSync = new Set();
      return { entries, syncMeta };
    },

    applySync({ entries: synced, at }) {
      const syncedIds = new Set(idsOf(synced));
      const changed = entries.filter((entry) => changedDuringSync.has(entry.timestamp));
      const changedIds = new Set(idsOf(changed));
      const unchanged = synced.filter((entry) => !changedDuringSync.has(entry.timestamp));
      entries = [...unchanged, ...changed].sort(byTimestamp);
      syncMeta = {
        lastSyncAt: at,
        addedIds: idsOf(changed.filter((entry) => !syncedIds.has(entry.timestamp))),
        editedIds: idsOf(changed.filter((entry) => syncedIds.has(entry.timestamp))),
        deletedIds: [...changedDuringSync].filter((id) => syncedIds.has(id) && !changedIds.has(id)),
      };
      changedDuringSync = new Set();
      save();
    },
  };
}
