import { parseCsv, toCsv } from './csv.js';
import { notifyChange, notifyEdit } from './events.js';
import { recordChange, undoable } from './undo.js';

const EMPTY_SYNC = { lastSyncAt: null, addedIds: [], deletedIds: [], editedIds: [] };

export const entryDate = (entry) => new Date(entry.timestamp);

export const byTimestamp = (a, b) => a.timestamp.localeCompare(b.timestamp);

export const isAddedHere = ({ lastSyncAt, addedIds }, entry) => !lastSyncAt
  || entry.timestamp > lastSyncAt
  || addedIds.includes(entry.timestamp);

const idsOf = (entries) => entries.map((entry) => entry.timestamp);

const differsFrom = (changes) => (entry) => Object.entries(changes).some(([key, value]) => (entry[key] ?? '') !== value);

function combineChanges(first, second) {
  const laterRemoved = new Set(idsOf(second.before));
  const earlierAdded = new Set(idsOf(first.after));
  return {
    before: [...first.before, ...second.before.filter((entry) => !earlierAdded.has(entry.timestamp))],
    after: [...first.after.filter((entry) => !laterRemoved.has(entry.timestamp)), ...second.after],
  };
}

export function createEntryLog({ file, columns, numbers, keys }) {
  let entries = parseCsv(localStorage.getItem(keys.entries) ?? '', numbers);
  let syncMeta = { ...EMPTY_SYNC, ...JSON.parse(localStorage.getItem(keys.sync) ?? '{}') };
  let changedDuringSync = new Set();

  const isPending = (entry) => isAddedHere(syncMeta, entry);

  const isSynced = (entry) => !isPending(entry);

  const isUnsynced = (entry) => isPending(entry) || syncMeta.editedIds.includes(entry.timestamp);

  const asCsv = () => toCsv(entries, columns);

  const touch = (changed) => idsOf(changed).forEach((id) => changedDuringSync.add(id));

  function remember(key, changed) {
    syncMeta = { ...syncMeta, [key]: [...new Set([...syncMeta[key], ...idsOf(changed)])] };
  }

  function markAdded(added) {
    touch(added);
    const deletedIds = new Set(syncMeta.deletedIds);
    const restored = added.filter((entry) => deletedIds.has(entry.timestamp));
    const restoredIds = new Set(idsOf(restored));
    syncMeta = { ...syncMeta, deletedIds: syncMeta.deletedIds.filter((id) => !restoredIds.has(id)) };
    remember('editedIds', restored);
    remember('addedIds', added.filter((entry) => !restoredIds.has(entry.timestamp)));
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

  function replace(removed, added) {
    const removedIds = new Set(idsOf(removed));
    const addedIds = new Set(idsOf(added));
    entries = [...entries.filter((entry) => !removedIds.has(entry.timestamp)), ...added].sort(byTimestamp);
    markChanged('editedIds', added.filter((entry) => removedIds.has(entry.timestamp)));
    markChanged('deletedIds', removed.filter((entry) => !addedIds.has(entry.timestamp)));
    markAdded(added.filter((entry) => !removedIds.has(entry.timestamp)));
    saveEdit();
  }

  function commit(removed, added) {
    if (!removed.length && !added.length) return;
    undoable(() => {
      replace(removed, added);
      recordChange(log, removed, added);
    });
  }

  const log = {
    file,
    columns,
    numbers,
    asCsv,
    getEntries: () => entries,
    getSyncMeta: () => syncMeta,
    isUnsynced,
    hasChanges: () => syncMeta.deletedIds.length > 0 || entries.some(isUnsynced),

    replace,
    combine: combineChanges,

    add(entry) {
      commit([], [{ timestamp: nextUniqueTimestamp(), ...entry }]);
    },

    update(timestamp, changes) {
      const entry = entries.find((e) => e.timestamp === timestamp);
      if (!entry || !differsFrom(changes)(entry)) return;
      const isMoved = (changes.timestamp ?? timestamp) !== timestamp;
      commit([entry], [{ ...entry, ...changes, timestamp: isMoved ? freeTimestamp(changes.timestamp) : timestamp }]);
    },

    updateWhere(matches, changes) {
      const changed = entries.filter(matches).filter(differsFrom(changes));
      commit(changed, changed.map((entry) => ({ ...entry, ...changes })));
    },

    remove(timestamp) {
      const entry = entries.find((e) => e.timestamp === timestamp);
      if (entry) commit([entry], []);
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
  return log;
}
