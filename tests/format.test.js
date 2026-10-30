import { formatDateTimeValue, formatDuration, parseDateTimeValue } from '../js/format.js';
import { restSince } from '../js/rest-timer.js';
import { readWhen, showWhen } from '../js/when-field.js';
import { assertEqual, test } from './harness.js';

const MINUTE = 60000;

test('durations show minutes and padded seconds', () => {
  assertEqual(formatDuration(0), '0:00');
  assertEqual(formatDuration(161999), '2:41');
  assertEqual(formatDuration(29 * MINUTE + 59000), '29:59');
});

test('date-time values round-trip in local time', () => {
  const date = new Date(2026, 9, 30, 7, 4);
  assertEqual(formatDateTimeValue(date), '2026-10-30T07:04');
  assertEqual(parseDateTimeValue('2026-10-30T07:04').getTime(), date.getTime());
});

test('an untouched date field keeps the exact timestamp', () => {
  const input = {};
  showWhen(input, '2026-10-30T06:04:31.123Z');
  assertEqual(readWhen(input, '2026-10-30T06:04:31.123Z'), '2026-10-30T06:04:31.123Z');
  input.value = '';
  assertEqual(readWhen(input, '2026-10-30T06:04:31.123Z'), '2026-10-30T06:04:31.123Z');
});

test('a changed date field gives the chosen local time, never the future', () => {
  const input = { value: '2026-10-29T07:00' };
  assertEqual(readWhen(input, '2026-10-30T06:04:31.123Z'), new Date(2026, 9, 29, 7, 0).toISOString());
  input.value = '2999-01-01T00:00';
  const read = Date.parse(readWhen(input, '2026-10-30T06:04:31.123Z'));
  assertEqual(Math.abs(read - Date.now()) < MINUTE, true);
});

test('rest time shows for half an hour after the last set', () => {
  const now = Date.parse('2026-10-30T12:00:00.000Z');
  const setAgo = (ms) => ({ timestamp: new Date(now - ms).toISOString() });
  assertEqual(restSince(undefined, now), null);
  assertEqual(restSince(setAgo(2 * MINUTE), now), 2 * MINUTE);
  assertEqual(restSince(setAgo(30 * MINUTE), now), null);
  assertEqual(restSince(setAgo(-MINUTE), now), null);
});
