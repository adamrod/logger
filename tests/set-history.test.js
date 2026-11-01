import { daysSinceLast, historyDays, setChipText, setHistoryHtml } from '../js/set-history.js';
import { assertEqual, test } from './harness.js';

const at = (day, hour) => new Date(2026, 9, day, hour).toISOString();

const set = (timestamp, variant, reps) => ({ timestamp, exercise: 'Pull up', variant, reps, weight: 0 });

const shown = (days) => days.map(({ rows }) => rows.map(({ variant, sets }) => [variant, sets.map(({ reps }) => reps)]));

test('set history shows newest days first with sets in the order they were done', () => {
  const days = historyDays([set(at(29, 18), '', 5), set(at(30, 7), '', 6), set(at(30, 8), '', 7)]);
  assertEqual(shown(days), [[['', [6, 7]]], [['', [5]]]]);
});

test('set history gives each variant of a day its own row, in the order first done', () => {
  const days = historyDays([
    set(at(30, 7), 'Left', 4), set(at(30, 8), 'Right', 3), set(at(30, 9), 'Left', 5), set(at(30, 10), 'Right', 2),
  ]);
  assertEqual(shown(days), [[['Left', [4, 5]], ['Right', [3, 2]]]]);
});

test('each day shows how many days passed since the previous day with sets', () => {
  const days = historyDays([set(at(25, 18), '', 5), set(at(29, 18), 'Left', 5), set(at(30, 7), 'Right', 6)]);
  assertEqual(days.map(({ gap }) => gap), [1, 4, null]);
});

test('the newest day shows how many days passed until today', () => {
  const days = historyDays([set(at(25, 18), '', 5), set(at(28, 18), '', 5)]);
  assertEqual(daysSinceLast(days, new Date(2026, 9, 31, 7)), 3);
  assertEqual(daysSinceLast(days, new Date(2026, 9, 28, 23)), 0);
  assertEqual(daysSinceLast(days, new Date(2026, 9, 27, 9)), 0);
});

const historyOf = (entries, variant) => setHistoryHtml(entries, { variant, isUnsynced: () => false, editingId: null });

const variantShown = (html, variant) => html.includes(`class="set-lead">${variant}<`);

test('a chosen variant shows only its sets, without naming the variant on each day', () => {
  const left = set(at(30, 7), 'Left', 4);
  const right = set(at(30, 8), 'Right', 3);
  const html = historyOf([left, right], 'Left');
  assertEqual([html.includes(left.timestamp), html.includes(right.timestamp), variantShown(html, 'Left')], [true, false, false]);
});

test('without a chosen variant every set shows under its variant', () => {
  const left = set(at(30, 7), 'Left', 4);
  const right = set(at(30, 8), 'Right', 3);
  const html = historyOf([left, right], '');
  assertEqual([html.includes(left.timestamp), html.includes(right.timestamp)], [true, true], 'sets');
  assertEqual([variantShown(html, 'Left'), variantShown(html, 'Right')], [true, true], 'variants');
});

test('the set history marks today as the current date', () => {
  const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();
  const isMarked = (timestamp) => historyOf([set(timestamp, '', 5)], '').includes('aria-current="date"');
  assertEqual([isMarked(daysAgo(0)), isMarked(daysAgo(1))], [true, false]);
});

test('a set without weight shows only its reps', () => {
  assertEqual(setChipText({ reps: 8, weight: 0 }), '8');
  assertEqual(setChipText({ reps: 5, weight: 77.504 }), '5<span class="set-times">×</span>77.5');
});
