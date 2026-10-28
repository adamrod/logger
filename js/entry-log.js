import { parseCsv, toCsv } from './csv.js';
import { notifyChange } from './events.js';

const EMPTY_SYNC = { lastSyncAt: null, deletedIds: [], editedIds: [] };

export const entryDate = (entry) => new Date(entry.timestamp);

export function createEntryLog({ file, columns, numbers, keys }) {
  let entries = parseCsv(localStorage.getItem(keys.entries) ?? '', numbers);
  let syncMeta = { ...EMPTY_SYNC, ...JSON.parse(localStorage.getItem(keys.sync) ?? '{}') };

  const isPending = (entry) => !syncMeta.lastSyncAt || entry.timestamp > syncMeta.lastSyncAt;

  const isUnsynced = (entry) => isPending(entry) || syncMeta.editedIds.includes(entry.timestamp);

  const asCsv = () => toCsv(entries, columns);

  function track(key, id) {
    syncMeta = { ...syncMeta, [key]: [...new Set([...syncMeta[key], id])] };
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
      entries = [...entries, { timestamp: nextUniqueTimestamp(), ...entry }];
      save();
    },

    update(timestamp, changes) {
      const entry = entries.find((e) => e.timestamp === timestamp);
      entries = entries.map((e) => (e === entry ? { ...e, ...changes } : e));
      if (entry && !isPending(entry)) track('editedIds', timestamp);
      save();
    },

    remove(timestamp) {
      const entry = entries.find((e) => e.timestamp === timestamp);
      entries = entries.filter((e) => e !== entry);
      if (entry && !isPending(entry)) track('deletedIds', timestamp);
      save();
    },

    applySync({ entries: synced, at }) {
      const syncedIds = new Set(synced.map((entry) => entry.timestamp));
      const loggedMeanwhile = entries.filter((entry) => entry.timestamp > at && !syncedIds.has(entry.timestamp));
      entries = [...synced, ...loggedMeanwhile];
      syncMeta = { ...EMPTY_SYNC, lastSyncAt: at };
      save();
    },
  };
}
