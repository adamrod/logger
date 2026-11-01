import { bodyWeightAt, dailySeries } from '../js/analysis.js';
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
