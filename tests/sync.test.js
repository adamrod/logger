import { parseCsv } from '../js/csv.js';
import { bodyWeights, climbs, gyms, notes, sets } from '../js/store.js';
import { mergeEntries, sync, syncState } from '../js/sync.js';
import { assertEqual, test } from './harness.js';
import { handleFetch } from './setup.js';

const files = {};
let onWrite = () => {};
let rejectWrite = () => false;
const signals = [];

const response = (status, body) => ({ status, ok: status < 300, json: async () => body });

const toBase64 = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));
const fromBase64 = (base64) => new TextDecoder().decode(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));

handleFetch(async (url, { method = 'GET', body, signal } = {}) => {
  const path = url.split('/contents/')[1];
  signals.push(signal);
  if (method === 'PUT' && rejectWrite(path)) return response(409, {});
  if (method === 'PUT') {
    files[path] = fromBase64(JSON.parse(body).content);
    onWrite(path);
    return response(200, {});
  }
  return path in files ? response(200, { content: toBase64(files[path]), sha: 'sha' }) : response(404, {});
});

const remoteWeights = () => parseCsv(files['bodyweight.csv'], ['weight']).map((entry) => entry.weight);

const NO_CHANGES = { lastSyncAt: '2026-10-30T12:00:00.000Z', addedIds: [], deletedIds: [], editedIds: [] };

test('merge keeps remote entries and adds entries new here', () => {
  const remote = [{ timestamp: '2026-10-01T07:00:00.000Z' }];
  const local = [{ timestamp: '2026-10-31T07:00:00.000Z' }];
  assertEqual(mergeEntries(local, remote, NO_CHANGES), [...remote, ...local]);
});

test('merge drops local entries removed elsewhere', () => {
  const local = [{ timestamp: '2026-10-01T07:00:00.000Z' }];
  assertEqual(mergeEntries(local, [], NO_CHANGES), []);
});

test('merge adds backdated entries older than the last sync', () => {
  const local = [{ timestamp: '2026-09-01T07:00:00.000Z' }];
  const meta = { ...NO_CHANGES, addedIds: ['2026-09-01T07:00:00.000Z'] };
  assertEqual(mergeEntries(local, [], meta), local);
});

test('merge applies local edits and deletes to remote entries', () => {
  const remote = [{ timestamp: '2026-10-01T07:00:00.000Z', weight: 70 }, { timestamp: '2026-10-02T07:00:00.000Z', weight: 71 }];
  const local = [{ timestamp: '2026-10-01T07:00:00.000Z', weight: 75 }];
  const meta = { ...NO_CHANGES, editedIds: ['2026-10-01T07:00:00.000Z'], deletedIds: ['2026-10-02T07:00:00.000Z'] };
  assertEqual(mergeEntries(local, remote, meta), local);
});

test('sync pushes new entries and marks them synced', async () => {
  bodyWeights.add({ weight: 70 });
  sets.add({ exercise: 'Bench press', reps: 5, weight: 100 });
  await sync();
  assertEqual(remoteWeights(), [70]);
  assertEqual(bodyWeights.hasChanges() || sets.hasChanges(), false);
});

test('an edit made while sync writes to GitHub is kept and pushed next sync', async () => {
  const [entry] = bodyWeights.getEntries();
  bodyWeights.add({ weight: 71 });
  onWrite = (path) => { if (path === 'bodyweight.csv') bodyWeights.update(entry.timestamp, { weight: 69 }); };
  await sync();
  onWrite = () => {};
  assertEqual(bodyWeights.getEntries().map((e) => e.weight), [69, 71], 'local');
  assertEqual(remoteWeights(), [70, 71], 'remote after first sync');
  await sync();
  assertEqual(remoteWeights(), [69, 71], 'remote after second sync');
  assertEqual(bodyWeights.hasChanges(), false);
});

test('a delete made while sync writes to GitHub is kept and pushed next sync', async () => {
  const [entry] = bodyWeights.getEntries();
  bodyWeights.add({ weight: 72 });
  onWrite = (path) => { if (path === 'bodyweight.csv') bodyWeights.remove(entry.timestamp); };
  await sync();
  onWrite = () => {};
  assertEqual(bodyWeights.getEntries().map((e) => e.weight), [71, 72], 'local');
  await sync();
  assertEqual(remoteWeights(), [71, 72], 'remote');
});

test('a backdated entry is pushed in date order', async () => {
  bodyWeights.add({ weight: 65 });
  const added = bodyWeights.getEntries().at(-1);
  bodyWeights.update(added.timestamp, { timestamp: '2020-01-01T07:00:00.000Z' });
  await sync();
  assertEqual(remoteWeights(), [65, 71, 72]);
  assertEqual(bodyWeights.hasChanges(), false);
});

test('every GitHub request gives up after a timeout, so a stalled one cannot block syncing', async () => {
  signals.length = 0;
  bodyWeights.add({ weight: 73 });
  await sync();
  assertEqual(signals.length > 0 && signals.every((signal) => signal?.timeoutMs > 0), true);
});

test('a write rejected because another device synced first is merged and retried', async () => {
  let conflicts = 1;
  rejectWrite = (path) => path === 'bodyweight.csv' && conflicts-- > 0;
  bodyWeights.add({ weight: 74 });
  await sync();
  rejectWrite = () => false;
  assertEqual(syncState.error, null, 'error');
  assertEqual(remoteWeights().at(-1), 74, 'pushed weight');
  assertEqual(bodyWeights.hasChanges(), false, 'unsynced changes');
});

test('a set from a device whose clock runs ahead counts as synced after sync', async () => {
  const ahead = new Date(Date.now() + 5000).toISOString();
  files['bodyweight.csv'] += `${ahead},75\n`;
  await sync();
  assertEqual(bodyWeights.getEntries().at(-1).timestamp, ahead, 'pulled');
  assertEqual(bodyWeights.hasChanges(), false, 'unsynced changes');
});

test('a note spanning several lines reaches notes.csv intact', async () => {
  notes.add({ exercise: 'Bench press', note: 'Eleiko: bar 10, safety 7\nRack: "bar 15", safety 9' });
  await sync();
  assertEqual(parseCsv(files['notes.csv']).map((entry) => entry.note), ['Eleiko: bar 10, safety 7\nRack: "bar 15", safety 9']);
  assertEqual(notes.hasChanges(), false);
});

test('climbs reach climbs.csv and gym scales reach gyms.csv, names with commas and quotes intact', async () => {
  gyms.add({ gym: 'The "Cave", Wola', grades: '1|2|3' });
  climbs.add({ gym: 'The "Cave", Wola', style: 'boulder', grade: '2', climb: 'c1', name: 'Pink, arete', tags: 'Slab|Dyno', result: 'top' });
  await sync();
  const [remoteClimb] = parseCsv(files['climbs.csv']);
  assertEqual([remoteClimb.gym, remoteClimb.name, remoteClimb.tags], ['The "Cave", Wola', 'Pink, arete', 'Slab|Dyno']);
  assertEqual(parseCsv(files['gyms.csv'])[0].grades, '1|2|3');
  assertEqual(climbs.hasChanges() || gyms.hasChanges(), false);
});
