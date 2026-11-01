import { bestDayIndex, bodyWeightAt, dailySeries, personalRecords } from '../js/analysis.js';
import { assertEqual, test } from './harness.js';

const weighIns = [
  { timestamp: '2026-01-01T07:00:00.000Z', weight: 60 },
  { timestamp: '2026-01-11T07:00:00.000Z', weight: 70 },
];

const weightOn = (timestamp) => bodyWeightAt(weighIns, new Date(timestamp));

test('body weight follows a straight line between weigh-ins', () => {
  assertEqual(weightOn('2026-01-06T07:00:00.000Z'), 65);
});

test('body weight stays at the first weigh-in before it and at the last one after it', () => {
  assertEqual([weightOn('2025-06-01T07:00:00.000Z'), weightOn('2026-08-01T07:00:00.000Z')], [60, 70]);
});

test('body weight on a weigh-in is that weigh-in', () => {
  assertEqual([weightOn('2026-01-01T07:00:00.000Z'), weightOn('2026-01-11T07:00:00.000Z')], [60, 70]);
});

test('the relative series shows each day\'s heaviest set as a whole percent of body weight', () => {
  const sets = [
    { timestamp: '2026-01-06T07:00:00.000Z', reps: 1, weight: 52 },
    { timestamp: '2026-01-06T07:10:00.000Z', reps: 5, weight: 40 },
    { timestamp: '2026-03-01T17:00:00.000Z', reps: 3, weight: 49 },
  ];
  const series = dailySeries(sets, 'relative', weighIns);
  assertEqual(series.map(({ value, bodyWeight, set }) => [value, bodyWeight, set.weight]), [[80, 65, 52], [70, 70, 49]]);
});

test('the relative series rounds body weight to a tenth and takes the percent from that', () => {
  const [point] = dailySeries([{ timestamp: '2026-01-06T17:00:00.000Z', reps: 1, weight: 30 }], 'relative', weighIns);
  assertEqual([point.bodyWeight, point.value], [65.4, 46]);
});

test('the best day is the heaviest set, more reps breaking a tie, or the first of equal values', () => {
  const sets = [
    { timestamp: '2026-01-02T17:00:00.000Z', reps: 1, weight: 55 },
    { timestamp: '2026-01-03T17:00:00.000Z', reps: 3, weight: 55 },
    { timestamp: '2026-01-04T17:00:00.000Z', reps: 3, weight: 55 },
    { timestamp: '2026-01-05T17:00:00.000Z', reps: 8, weight: 40 },
  ];
  const best = (metric) => bestDayIndex(dailySeries(sets, metric, weighIns), metric);
  assertEqual([best('weight'), best('reps'), best('relative'), best('volume')], [1, 3, 0, 3]);
});

const lifts = (...rows) => rows.map(([day, reps, weight, variant = ''], index) => ({
  timestamp: new Date(2026, 9, day, 18, index).toISOString(), variant, reps, weight,
}));

const recordIndexes = (sets) => {
  const records = personalRecords(sets);
  return sets.flatMap((set, index) => (records.has(set) ? [index] : []));
};

test('a variant\'s first day has nothing to beat, so it has no personal records', () => {
  assertEqual(recordIndexes(lifts([1, 5, 100], [1, 3, 110])), []);
});

test('a set is a personal record when no earlier set was as heavy with as many reps', () => {
  const sets = lifts([1, 5, 100], [2, 1, 105], [3, 6, 95], [4, 4, 100], [5, 5, 100], [6, 9, 0]);
  assertEqual(recordIndexes(sets), [1, 2, 5]);
});

test('sets without weight are personal records by reps alone', () => {
  assertEqual(recordIndexes(lifts([1, 8, 0], [2, 7, 0], [3, 9, 0])), [2]);
});

test('of a day\'s sets only the best are personal records, the first of equal ones', () => {
  const sets = lifts([1, 5, 120], [2, 5, 125], [2, 6, 125], [2, 3, 130], [2, 6, 125]);
  assertEqual(recordIndexes(sets), [2, 3]);
});

test('each variant is compared only with its own sets', () => {
  const sets = lifts([1, 7, 35, 'Left'], [1, 6, 35, 'Right'], [2, 7, 35, 'Left'], [2, 7, 35, 'Right']);
  assertEqual(recordIndexes(sets), [3]);
});
