import { historyHtml } from '../js/history.js';
import { assertEqual, test } from './harness.js';

const view = {
  lead: [(entry) => entry.timestamp],
  valueHtml: (entry) => String(entry.weight),
  describe: (entry) => String(entry.weight),
  isUnsynced: () => false,
  editingId: null,
  empty: 'No weights logged yet.',
};

test('the history marks entries from today as the current date', () => {
  const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();
  const isMarked = (timestamp) => historyHtml([{ timestamp, weight: 80 }], view).includes('aria-current="date"');
  assertEqual([isMarked(daysAgo(0)), isMarked(daysAgo(1))], [true, false]);
});
