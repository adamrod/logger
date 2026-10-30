import { createEntryLog } from '../js/entry-log.js';
import { assertEqual, test } from './harness.js';

let logCount = 0;

function freshLog() {
  logCount += 1;
  return createEntryLog({
    file: 'test.csv',
    columns: ['timestamp', 'weight'],
    numbers: ['weight'],
    keys: { entries: `test.${logCount}.csv`, sync: `test.${logCount}.sync` },
  });
}

function syncedLog(entries) {
  const log = freshLog();
  log.beginSync();
  log.applySync({ entries, at: '2026-10-30T12:00:00.000Z' });
  return log;
}

const weights = (log) => log.getEntries().map((entry) => entry.weight);
const ids = (log) => log.getEntries().map((entry) => entry.timestamp);

test('adding an entry queues it as added', () => {
  const log = freshLog();
  log.add({ weight: 70 });
  assertEqual(log.getSyncMeta().addedIds, ids(log));
  assertEqual(log.hasChanges(), true);
});

test('a sync without local changes leaves nothing queued', () => {
  const log = syncedLog([{ timestamp: '2026-10-01T07:00:00.000Z', weight: 70 }]);
  assertEqual(log.getSyncMeta(), { lastSyncAt: '2026-10-30T12:00:00.000Z', addedIds: [], editedIds: [], deletedIds: [] });
  assertEqual(log.hasChanges(), false);
});

test('an edit made during a sync survives it and stays queued', () => {
  const log = syncedLog([{ timestamp: '2026-10-01T07:00:00.000Z', weight: 70 }]);
  const { entries } = log.beginSync();
  log.update('2026-10-01T07:00:00.000Z', { weight: 71 });
  log.applySync({ entries, at: '2026-10-30T13:00:00.000Z' });
  assertEqual(weights(log), [71]);
  assertEqual(log.getSyncMeta().editedIds, ['2026-10-01T07:00:00.000Z']);
});

test('a delete made during a sync survives it and stays queued', () => {
  const log = syncedLog([{ timestamp: '2026-10-01T07:00:00.000Z', weight: 70 }]);
  const { entries } = log.beginSync();
  log.remove('2026-10-01T07:00:00.000Z');
  log.applySync({ entries, at: '2026-10-30T13:00:00.000Z' });
  assertEqual(weights(log), []);
  assertEqual(log.getSyncMeta().deletedIds, ['2026-10-01T07:00:00.000Z']);
});

test('an entry added during a sync survives it and stays queued', () => {
  const log = syncedLog([]);
  const { entries } = log.beginSync();
  log.add({ weight: 72 });
  log.applySync({ entries, at: '2026-10-30T13:00:00.000Z' });
  assertEqual(weights(log), [72]);
  assertEqual(log.getSyncMeta().addedIds, ids(log));
});

test('changes made before a sync starts are cleared by it', () => {
  const log = syncedLog([{ timestamp: '2026-10-01T07:00:00.000Z', weight: 70 }]);
  log.update('2026-10-01T07:00:00.000Z', { weight: 71 });
  const { entries } = log.beginSync();
  log.applySync({ entries, at: '2026-10-30T13:00:00.000Z' });
  assertEqual(log.hasChanges(), false);
});

test('backdating a synced entry deletes the old id and adds the new one, in order', () => {
  const log = syncedLog([
    { timestamp: '2026-10-01T07:00:00.000Z', weight: 70 },
    { timestamp: '2026-10-03T07:00:00.000Z', weight: 72 },
  ]);
  log.update('2026-10-03T07:00:00.000Z', { weight: 72, timestamp: '2026-09-30T07:00:00.000Z' });
  assertEqual(ids(log), ['2026-09-30T07:00:00.000Z', '2026-10-01T07:00:00.000Z']);
  assertEqual(log.getSyncMeta().deletedIds, ['2026-10-03T07:00:00.000Z']);
  assertEqual(log.getSyncMeta().addedIds, ['2026-09-30T07:00:00.000Z']);
});

test('backdating an unsynced entry does not queue a delete', () => {
  const log = freshLog();
  log.add({ weight: 70 });
  log.update(ids(log)[0], { timestamp: '2026-09-30T07:00:00.000Z' });
  assertEqual(log.getSyncMeta().deletedIds, []);
  assertEqual(ids(log), ['2026-09-30T07:00:00.000Z']);
});

test('backdating onto a taken time moves the entry by a millisecond', () => {
  const log = syncedLog([
    { timestamp: '2026-10-01T07:00:00.000Z', weight: 70 },
    { timestamp: '2026-10-03T07:00:00.000Z', weight: 72 },
  ]);
  log.update('2026-10-03T07:00:00.000Z', { timestamp: '2026-10-01T07:00:00.000Z' });
  assertEqual(ids(log), ['2026-10-01T07:00:00.000Z', '2026-10-01T07:00:00.001Z']);
});

test('updating many entries queues each synced one as edited', () => {
  const log = syncedLog([
    { timestamp: '2026-10-01T07:00:00.000Z', weight: 70 },
    { timestamp: '2026-10-02T07:00:00.000Z', weight: 71 },
    { timestamp: '2026-10-03T07:00:00.000Z', weight: 72 },
  ]);
  log.updateWhere((entry) => entry.weight > 70, { weight: 80 });
  assertEqual(weights(log), [70, 80, 80]);
  assertEqual(log.getSyncMeta().editedIds, ['2026-10-02T07:00:00.000Z', '2026-10-03T07:00:00.000Z']);
});
