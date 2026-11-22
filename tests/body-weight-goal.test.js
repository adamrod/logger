import { currentGoal, goalGapText, goalText, goalType, readGoal } from '../js/body-weight-goal.js';
import { assertEqual, test } from './harness.js';

const goal = { low: 62, high: 64 };

test('the latest goal entry is the goal, and an entry without bounds removes it', () => {
  const set = { timestamp: '2026-11-01T07:00:00.000Z', low: 62, high: 64 };
  const removed = { timestamp: '2026-11-02T07:00:00.000Z' };
  assertEqual(currentGoal([set]), goal, 'set');
  assertEqual(currentGoal([set, removed]), null, 'removed');
  assertEqual(currentGoal([]), null, 'never set');
});

test('a range goal reads from either order and needs both bounds, an exact goal reads from one number', () => {
  assertEqual(readGoal(['64', '62']), goal, 'swapped');
  assertEqual(readGoal(['63,5', '']), null, 'range missing a bound');
  assertEqual(readGoal(['63,5']), { low: 63.5, high: 63.5 }, 'exact');
  assertEqual(readGoal(['0']), null, 'nothing');
});

test('a goal with matching bounds is exact, any other goal is a range', () => {
  assertEqual([goalType(goal), goalType({ low: 63, high: 63 }), goalType(null)], ['range', 'exact', 'range']);
});

test('a goal shows as a range, or as one number when both bounds match', () => {
  assertEqual(goalText(goal), '62–64', 'range');
  assertEqual(goalText({ low: 63, high: 63 }), '63', 'single');
});

test('a weight is over, under or on the goal by its distance to the nearer bound', () => {
  assertEqual([65.3, 61.2, 64, 62, 63.1].map((weight) => goalGapText(weight, goal)),
    ['1.3 over', '0.8 under', 'on goal', 'on goal', 'on goal']);
});
