import { historyDays, setChipText } from '../js/set-history.js';
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

test('a set without weight shows only its reps', () => {
  assertEqual(setChipText({ reps: 8, weight: 0 }), '8');
  assertEqual(setChipText({ reps: 5, weight: 77.504 }), '5<span class="set-times">×</span>77.5');
});
