import { dayPlan, weekPath } from '../js/plan.js';
import { assertEqual, test } from './harness.js';

const WEEK = `## 2026-11-23 Monday
Run, elbow rehab, mobility
- Run 30 min easy

## 2026-11-24 Tuesday

## Review
Done 5 of 6.
`;

test('a week plan is named by its Monday', () => {
  assertEqual(weekPath(new Date(2026, 10, 23)), 'plans/2026-11-23.md');
  assertEqual(weekPath(new Date(2026, 10, 29)), 'plans/2026-11-23.md');
  assertEqual(weekPath(new Date(2026, 10, 30)), 'plans/2026-11-30.md');
  assertEqual(weekPath(new Date(2027, 0, 1)), 'plans/2026-12-28.md');
});

test('the day plan is the section under that date heading', () => {
  assertEqual(dayPlan(WEEK, new Date(2026, 10, 23)), 'Run, elbow rehab, mobility\n- Run 30 min easy');
  assertEqual(dayPlan(WEEK, new Date(2026, 10, 24)), '');
});

test('a day without a heading has no plan', () => {
  assertEqual(dayPlan(WEEK, new Date(2026, 10, 25)), null);
  assertEqual(dayPlan('', new Date(2026, 10, 25)), null);
});
