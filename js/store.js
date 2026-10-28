import { parseCsv, toCsv } from './csv.js';
import { notifyChange } from './events.js';

export const ENTRY_COLUMNS = ['timestamp', 'exercise', 'variant', 'reps', 'weight'];
export const ENTRY_NUMBERS = ['reps', 'weight'];

const KEYS = { entries: 'logger.v2.entries.csv', exercises: 'logger.v2.exercise-list', variants: 'logger.v2.variant-lists', sync: 'logger.v2.sync' };
const EMPTY_SYNC = { lastSyncAt: null, deletedIds: [], editedIds: [] };
const EMPTY_LIST = { added: [], removed: [] };

let entries = parseCsv(localStorage.getItem(KEYS.entries) ?? '', ENTRY_NUMBERS);
let exerciseList = JSON.parse(localStorage.getItem(KEYS.exercises) ?? 'null') ?? EMPTY_LIST;
let variantLists = JSON.parse(localStorage.getItem(KEYS.variants) ?? '{}');
let syncMeta = { ...EMPTY_SYNC, ...JSON.parse(localStorage.getItem(KEYS.sync) ?? '{}') };

export const getEntries = () => entries;

export const entryDate = (entry) => new Date(entry.timestamp);

export const getExerciseList = () => exerciseList;

export const getVariantList = (exercise) => variantLists[exercise] ?? EMPTY_LIST;

export const getSyncMeta = () => syncMeta;

export function addEntry(entry) {
  entries = [...entries, { timestamp: nextUniqueTimestamp(), ...entry }];
  save();
}

export function updateEntry(timestamp, changes) {
  const entry = entries.find((e) => e.timestamp === timestamp);
  entries = entries.map((e) => (e === entry ? { ...e, ...changes } : e));
  if (entry && !isPending(entry)) track('editedIds', timestamp);
  save();
}

export function deleteEntry(timestamp) {
  const entry = entries.find((e) => e.timestamp === timestamp);
  entries = entries.filter((e) => e !== entry);
  if (entry && !isPending(entry)) track('deletedIds', timestamp);
  save();
}

export function saveExerciseList(list) {
  exerciseList = list;
  save();
}

export function saveVariantList(exercise, list) {
  variantLists = { ...variantLists, [exercise]: list };
  save();
}

export function applySync({ entries: synced, at }) {
  const syncedIds = new Set(synced.map((entry) => entry.timestamp));
  const loggedMeanwhile = entries.filter((entry) => entry.timestamp > at && !syncedIds.has(entry.timestamp));
  entries = [...synced, ...loggedMeanwhile];
  syncMeta = { ...EMPTY_SYNC, lastSyncAt: at };
  save();
}

const isPending = (entry) => !syncMeta.lastSyncAt || entry.timestamp > syncMeta.lastSyncAt;

function track(key, id) {
  syncMeta = { ...syncMeta, [key]: [...new Set([...syncMeta[key], id])] };
}

function nextUniqueTimestamp() {
  const last = entries.at(-1);
  const now = Date.now();
  return new Date(last ? Math.max(now, Date.parse(last.timestamp) + 1) : now).toISOString();
}

function save() {
  localStorage.setItem(KEYS.entries, toCsv(entries, ENTRY_COLUMNS));
  localStorage.setItem(KEYS.exercises, JSON.stringify(exerciseList));
  localStorage.setItem(KEYS.variants, JSON.stringify(variantLists));
  localStorage.setItem(KEYS.sync, JSON.stringify(syncMeta));
  notifyChange();
}
