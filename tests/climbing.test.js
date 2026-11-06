import { calendarWeeks } from '../js/calendar.js';
import {
  FONT_GRADES, climbStats, climbingSessions, gradePyramid, meanRest, numberGrades, openProjects, outcomeOf,
  scaleTypeOf, tagCounts,
} from '../js/climbing.js';
import { formatDuration, formatLength, ordinal } from '../js/format.js';
import { assertEqual, test } from './harness.js';

const MINUTE = 60000;
const DAY = 24 * 60 * MINUTE;
const START = Date.UTC(2026, 10, 2, 17);

const attempt = (minutes, fields) => ({
  timestamp: new Date(START + minutes * MINUTE).toISOString(),
  gym: 'Wall',
  style: 'boulder',
  grade: '5',
  result: 'attempt',
  ...fields,
});

const grades = numberGrades(9);

test('a gym change or three quiet hours starts a new session', () => {
  const sessions = climbingSessions([
    attempt(0, { climb: 'a' }),
    attempt(170, { climb: 'b' }),
    attempt(360, { climb: 'c' }),
    attempt(365, { climb: 'd', gym: 'Cave' }),
  ]);
  assertEqual(sessions.map((session) => session.attempts.length), [2, 1, 1]);
});

test('each climb in a session reads as a flash, a send, a repeat, a project or no top', () => {
  const first = [attempt(0, { climb: 'f', result: 'top' })];
  assertEqual(outcomeOf(first, first), 'Flash', 'flash');
  const worked = [attempt(0, { climb: 'w' }), attempt(3, { climb: 'w' }), attempt(6, { climb: 'w', result: 'top' })];
  assertEqual(outcomeOf(worked, worked), 'Sent · 3rd attempt', 'sent in one session');
  const project = [attempt(0, { climb: 'p', name: 'Pink' }), attempt(DAY / MINUTE, { climb: 'p', name: 'Pink' })];
  assertEqual(outcomeOf(project, project.slice(1)), 'Project · 2nd session', 'project');
  const sentLater = [...project, attempt(2 * DAY / MINUTE, { climb: 'p', name: 'Pink', result: 'top' })];
  assertEqual(outcomeOf(sentLater, sentLater.slice(2)), 'Sent · 3rd session', 'sent in a later session');
  assertEqual(outcomeOf(sentLater, [attempt(3 * DAY / MINUTE, { climb: 'p', result: 'top' })]), 'Repeat', 'repeat');
  assertEqual(outcomeOf([attempt(0, { climb: 'u' })], [attempt(0, { climb: 'u' })]), 'No top', 'unnamed');
});

test('a top rope top is no send, so it neither flashes nor counts as the hardest send', () => {
  const rope = [attempt(0, { climb: 'r', style: 'toprope', grade: '6b', result: 'top' })];
  assertEqual(outcomeOf(rope, rope), 'Top rope top', 'outcome');
  const stats = climbStats(rope, rope, ['6a', '6b']);
  assertEqual([stats.tops, stats.hardestSend, stats.hardestFlash, stats.flashRate], [1, null, null, null], 'stats');
});

test('the flash rate compares flashed climbs with every climb first sent in the range', () => {
  const attempts = [
    attempt(0, { climb: 'a', grade: '4', result: 'top' }),
    attempt(3, { climb: 'b', grade: '6' }),
    attempt(6, { climb: 'b', grade: '6', result: 'top' }),
    attempt(9, { climb: 'a', grade: '4', result: 'top' }),
  ];
  const stats = climbStats(attempts, attempts, grades);
  assertEqual([stats.hardestSend, stats.hardestFlash, stats.flashRate], ['6', '4', 0.5]);
});

test('rest between attempts skips attempts logged in one go and long breaks', () => {
  const times = [0, 2, 2.1, 5.1, 40].map((minutes, i) => attempt(minutes, { climb: String(i) }));
  assertEqual(meanRest(times), 2.5 * MINUTE);
  assertEqual(meanRest(times.slice(0, 1)), null);
});

test('projects are named climbs at the gym that have not been sent yet', () => {
  const attempts = [
    attempt(0, { climb: 'p', name: 'Pink' }),
    attempt(3, { climb: 's', name: 'Sent', result: 'top' }),
    attempt(6, { climb: 'u' }),
    attempt(9, { climb: 'r', name: 'Rope', style: 'lead', grade: '6a' }),
    attempt(12, { climb: 'o', name: 'Other gym', gym: 'Cave' }),
  ];
  assertEqual(openProjects(attempts, 'Wall', 'boulder').map((project) => project.name), ['Pink']);
});

test('the pyramid counts climbs per grade and the tags count sends per climb', () => {
  const attempts = [
    attempt(0, { climb: 'a', grade: '6', tags: 'Slab' }),
    attempt(3, { climb: 'b', grade: '6', tags: 'Slab|Crimps', result: 'top' }),
    attempt(6, { climb: 'c', grade: '7', tags: 'Crimps' }),
  ];
  assertEqual(gradePyramid(attempts, attempts, grades), [{ grade: '7', sent: 0, total: 1 }, { grade: '6', sent: 1, total: 2 }]);
  assertEqual(tagCounts(attempts), [{ tag: 'Crimps', sent: 1, total: 2 }, { tag: 'Slab', sent: 1, total: 2 }]);
});

test('a gym scale reads back as Font, numbers or a custom list', () => {
  assertEqual(scaleTypeOf(FONT_GRADES), 'font');
  assertEqual(scaleTypeOf(numberGrades(13)), 'numbers');
  assertEqual(scaleTypeOf(['Yellow', 'Green']), 'custom');
});

test('calendar weeks start on Monday and pad the month with blanks', () => {
  const weeks = calendarWeeks(new Date(2026, 10, 1));
  assertEqual(weeks[0].map((day) => day?.getDate() ?? null), [null, null, null, null, null, null, 1]);
  assertEqual([weeks.length, weeks.at(-1).filter(Boolean).at(-1).getDate()], [6, 30]);
});

test('durations grow to hours, lengths read as hours and minutes, and ordinals get their suffix', () => {
  assertEqual(formatDuration(65 * MINUTE + 3000), '1:05:03');
  assertEqual([formatLength(48 * MINUTE), formatLength(102 * MINUTE)], ['48m', '1h 42m']);
  assertEqual([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
});
