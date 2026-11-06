import { daySummary, daySummaryText, loggedDays, nearbyDays } from '../js/day-summary.js';
import { formatIsoDate } from '../js/format.js';
import { assertEqual, test } from './harness.js';

const at = (day, hour) => new Date(2026, 9, day, hour).toISOString();

const set = (timestamp, exercise, variant, reps) => ({ timestamp, exercise, variant, reps, weight: 0 });

const shownDays = (days) => days.map(formatIsoDate);

test('a day lists its exercises in the order first done, each with its variants', () => {
  const sets = [
    set(at(29, 18), 'Squat', '', 5),
    set(at(30, 7), 'Pull up', 'Wide', 6), set(at(30, 8), 'Squat', '', 5),
    set(at(30, 9), 'Pull up', 'Close', 8), set(at(30, 10), 'Pull up', 'Wide', 5),
  ];
  const { exercises, setCount } = daySummary(new Date(2026, 9, 30), sets, []);
  const shown = exercises.map(({ exercise, rows }) => [exercise, rows.map(({ variant, sets: done }) => [variant, done.map(({ reps }) => reps)])]);
  assertEqual(shown, [['Pull up', [['Wide', [6, 5]], ['Close', [8]]]], ['Squat', [['', [5]]]]]);
  assertEqual(setCount, 4, 'set count');
});

test('a day shows its last body weight, or none when not weighed', () => {
  const weighIns = [{ timestamp: at(30, 7), weight: 80 }, { timestamp: at(30, 21), weight: 81.2 }];
  assertEqual(daySummary(new Date(2026, 9, 30), [], weighIns).bodyWeight, 81.2, 'weighed');
  assertEqual(daySummary(new Date(2026, 9, 31), [], weighIns).bodyWeight, null, 'not weighed');
});

test('logged days come from sets and body weights, once each, oldest first', () => {
  const days = loggedDays([set(at(30, 7), 'Squat', '', 5), set(at(28, 7), 'Squat', '', 5)], [{ timestamp: at(30, 20), weight: 80 }, { timestamp: at(29, 8), weight: 80 }]);
  assertEqual(shownDays(days), ['2026-10-28', '2026-10-29', '2026-10-30']);
});

test('the days next to a day are the closest logged days before and after it', () => {
  const days = loggedDays([set(at(20, 7), 'Squat', '', 5), set(at(25, 7), 'Squat', '', 5), set(at(28, 7), 'Squat', '', 5)]);
  const nearby = (day) => Object.values(nearbyDays(days, new Date(2026, 9, day, 12))).map((found) => found && formatIsoDate(found));
  assertEqual(nearby(25), ['2026-10-20', '2026-10-28'], 'logged day');
  assertEqual(nearby(22), ['2026-10-20', '2026-10-25'], 'empty day');
  assertEqual(nearby(20), [null, '2026-10-25'], 'first day');
});

test('a day sums up its sets, climbing attempts and body weight', () => {
  const attempt = (day, hour, gym) => ({ timestamp: at(day, hour), gym, style: 'boulder', grade: '5', climb: `${gym}${hour}`, result: 'attempt' });
  const attempts = [attempt(29, 9, 'Cave'), attempt(30, 17, 'Wall'), attempt(30, 18, 'Wall'), attempt(30, 22, 'Cave')];
  const summary = daySummary(new Date(2026, 9, 30), [set(at(30, 7), 'Squat', '', 5)], [{ timestamp: at(30, 7), weight: 80 }], attempts);
  assertEqual(summary.climbing.map((session) => [session.gym, session.attempts.length]), [['Wall', 2], ['Cave', 1]], 'sessions');
  assertEqual(daySummaryText(summary), '1 exercise · 1 set · 3 attempts · BW 80', 'text');
  assertEqual(daySummaryText(daySummary(new Date(2026, 9, 29), [], [], attempts)), '1 attempt', 'climbing only');
});
