import { entryDate } from './entry-log.js';

const DAY_MS = 86400000;
const RANGE_DAYS = { '1M': 30, '3M': 91, '1Y': 365, All: Infinity };

export function entriesInRange(entries, range) {
  const since = Date.now() - RANGE_DAYS[range] * DAY_MS;
  return entries.filter((entry) => entryDate(entry).getTime() >= since);
}

export function markPressed(group, key, value) {
  group.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', button.dataset[key] === value));
}
