import { calendarDays, parseMonthValue, monthValue } from '../js/calendar.js';
import {
  FONT_GRADES, attemptsByGrade, climbStats, climbingSessions, gradePyramid, hardestGrade, isLive, meanRest,
  numberGrades, openProjects, outcomeOf, recordSends, scaleTypeOf, sessionFocus, stylesText, tagCounts,
} from '../js/climbing.js';
import { formatDuration, formatLength, ordinal } from '../js/format.js';
import { assertEqual, test } from './harness.js';

const MINUTE = 60000;
const DAY_MINUTES = 24 * 60;
const START = Date.UTC(2026, 10, 2, 17);

const attempt = (minutes, fields) => ({
  timestamp: new Date(START + minutes * MINUTE).toISOString(),
  gym: 'Wall',
  style: 'boulder',
  grade: '5',
  result: 'attempt',
  ...fields,
});

const tries = (climb, results, fields = {}, startMinutes = 0) => [...results]
  .map((result, i) => attempt(startMinutes + i * 3, { climb, result: result === 'T' ? 'top' : 'attempt', ...fields }));

const grades = numberGrades(9);

test('a gym change or three quiet hours starts a new session', () => {
  const sessions = climbingSessions([
    attempt(0, { climb: 'a' }),
    attempt(179, { climb: 'b' }),
    attempt(360, { climb: 'c' }),
    attempt(365, { climb: 'd', gym: 'Cave' }),
    attempt(370, { climb: 'e' }),
  ]);
  assertEqual(sessions.map((session) => [session.gym, session.attempts.length]), [['Wall', 2], ['Wall', 1], ['Cave', 1], ['Wall', 1]]);
  assertEqual(sessions[0].id, attempt(0, {}).timestamp, 'id is the first attempt');
});

test('a session stays live for three hours after its last attempt', () => {
  const [session] = climbingSessions([attempt(0, { climb: 'a' })]);
  assertEqual([isLive(session, START + 179 * MINUTE), isLive(session, START + 180 * MINUTE)], [true, false]);
});

test('climbs read as flash, sent on an attempt, sent in a session, repeat, project or no top', () => {
  const flash = tries('f', 'T');
  assertEqual(outcomeOf(flash, flash), 'Flash', 'flash');
  const worked = tries('w', 'AAT');
  assertEqual(outcomeOf(worked, worked), 'Sent · 3rd attempt', 'sent in one session');
  const project = [...tries('p', 'AA', { name: 'Pink' }), ...tries('p', 'A', { name: 'Pink' }, DAY_MINUTES)];
  assertEqual(outcomeOf(project, project.slice(2)), 'Project · 2nd session', 'project');
  assertEqual(outcomeOf(project.slice(0, 2), project.slice(0, 2)), 'Project', 'project in its first session');
  const sentLater = [...project, ...tries('p', 'AT', { name: 'Pink' }, 2 * DAY_MINUTES)];
  assertEqual(outcomeOf(sentLater, sentLater.slice(3)), 'Sent · 3rd session', 'sent in a later session');
  const repeated = [...sentLater, ...tries('p', 'AT', {}, 3 * DAY_MINUTES)];
  assertEqual(outcomeOf(repeated, repeated.slice(5)), 'Repeat', 'repeat');
  const failedRepeat = [...sentLater, ...tries('p', 'A', {}, 3 * DAY_MINUTES)];
  assertEqual(outcomeOf(failedRepeat, failedRepeat.slice(5)), 'No top', 'failed repeat');
  const unnamed = tries('u', 'AA');
  assertEqual(outcomeOf(unnamed, unnamed), 'No top', 'unnamed');
});

test('a top rope top is no send, but a clean lead after it is', () => {
  const rope = tries('r', 'T', { style: 'toprope', grade: '6b' });
  assertEqual(outcomeOf(rope, rope), 'Top rope top', 'top rope');
  const autoBelay = tries('b', 'T', { style: 'auto', grade: '6b' });
  assertEqual(outcomeOf(autoBelay, autoBelay), 'Auto-belay top', 'auto-belay');
  const thenLead = [...rope, attempt(5, { climb: 'r', style: 'lead', grade: '6b', result: 'top' })];
  assertEqual(outcomeOf(thenLead, thenLead), 'Sent · 2nd attempt', 'lead after top rope');
  const stats = climbStats(rope, rope, ['6a', '6b']);
  assertEqual([stats.tops, stats.hardestSend, stats.hardestFlash, stats.flashRate], [1, null, null, null], 'stats');
});

test('the flash rate compares flashed climbs with climbs first sent in the range, so repeats do not count', () => {
  const earlier = tries('old', 'T', { grade: '7' }, -DAY_MINUTES);
  const range = [
    ...tries('a', 'T', { grade: '4' }),
    ...tries('b', 'AT', { grade: '6' }, 10),
    ...tries('old', 'T', { grade: '7' }, 20),
  ];
  const stats = climbStats(range, [...earlier, ...range], grades);
  assertEqual([stats.attempts, stats.tops, stats.hardestSend, stats.hardestFlash, stats.flashRate], [4, 3, '7', '4', 0.5]);
});

test('the hardest grade follows the scale and skips grades the scale no longer has', () => {
  const attempts = [attempt(0, { grade: '6A+' }), attempt(3, { grade: '7A' }), attempt(6, { grade: 'Purple' })];
  assertEqual(hardestGrade(attempts, FONT_GRADES), '7A');
  assertEqual(hardestGrade([], FONT_GRADES), null);
});

test('rest between attempts skips attempts logged in one go and long breaks', () => {
  const times = [0, 2, 2.1, 5.1, 40].map((minutes, i) => attempt(minutes, { climb: String(i) }));
  assertEqual(meanRest(times), 2.5 * MINUTE);
  assertEqual(meanRest(times.slice(0, 1)), null);
});

test('a session is read by its main discipline', () => {
  const session = { attempts: [attempt(0, { style: 'lead' }), attempt(3, {}), attempt(6, { style: 'toprope' })] };
  const { kind, attempts } = sessionFocus(session);
  assertEqual([kind, attempts.map((each) => each.style)], ['rope', ['lead', 'toprope']]);
  assertEqual(sessionFocus({ attempts: [attempt(0, {}), attempt(3, { style: 'lead' })] }).kind, 'boulder', 'a tie goes to boulders');
  assertEqual(stylesText(session.attempts), 'Lead, Boulder, Top rope');
});

test('projects are named climbs at the gym not sent yet, latest first', () => {
  const attempts = [
    attempt(0, { climb: 'p', name: 'Pink' }),
    attempt(3, { climb: 's', name: 'Sent', result: 'top' }),
    attempt(6, { climb: 'u' }),
    attempt(9, { climb: 'r', name: 'Rope', style: 'lead', grade: '6a' }),
    attempt(12, { climb: 'o', name: 'Other gym', gym: 'Cave' }),
    attempt(15, { climb: 't', name: 'Topped on rope', style: 'toprope', result: 'top' }),
    attempt(18, { climb: 'b', name: 'Blue' }),
  ];
  assertEqual(openProjects(attempts, 'Wall', 'boulder').map((project) => project.name), ['Blue', 'Pink']);
  assertEqual(openProjects(attempts, 'Wall', 'rope').map((project) => project.name), ['Topped on rope', 'Rope']);
});

test('the pyramid and the tags count a climb as sent once it was sent by its last attempt in the range', () => {
  const sentBefore = tries('before', 'T', { grade: '6', tags: 'Slab' }, -DAY_MINUTES);
  const range = [
    ...tries('before', 'A', { grade: '6', tags: 'Slab' }),
    ...tries('now', 'AT', { grade: '6', tags: 'Slab|Crimps' }, 10),
    ...tries('later', 'A', { grade: '7', tags: 'Crimps' }, 20),
  ];
  const sentAfter = tries('later', 'T', { grade: '7', tags: 'Crimps' }, DAY_MINUTES);
  const all = [...sentBefore, ...range, ...sentAfter];
  assertEqual(gradePyramid(range, all, grades), [{ grade: '7', sent: 0, total: 1 }, { grade: '6', sent: 2, total: 2 }]);
  assertEqual(tagCounts(range, all), [{ tag: 'Crimps', sent: 1, total: 2 }, { tag: 'Slab', sent: 2, total: 2 }]);
});

test('a record is the hardest send of a session that beats every earlier session at that gym and discipline', () => {
  const send = (day, grade, fields = {}, minutes = 0) => attempt(day * DAY_MINUTES + minutes, { climb: `${day}${grade}`, grade, result: 'top', ...fields });
  const attempts = [
    send(0, '5'),
    send(1, '5'),
    send(2, '6'),
    attempt(2 * DAY_MINUTES + 3, { climb: 'tried', grade: '8' }),
    send(2, '6', { climb: 'again' }, 6),
    send(3, '7', { style: 'toprope' }),
    send(4, '7', { gym: 'Cave' }),
    send(5, '6a', { style: 'lead' }),
    send(6, '6b', { style: 'lead' }),
  ];
  const records = recordSends(attempts, () => [...grades, '6a', '6b']);
  assertEqual(attempts.filter((each) => records.has(each.timestamp)).map((each) => [each.grade, each.style]), [['6', 'boulder'], ['6b', 'lead']]);
});

test('attempts group by grade, hardest first', () => {
  const byGrade = attemptsByGrade([attempt(0, { grade: '4' }), attempt(3, { grade: '6' }), attempt(6, { grade: '4' })], grades);
  assertEqual(byGrade.map(({ grade, attempts }) => [grade, attempts.length]), [['6', 1], ['4', 2]]);
});

test('a gym scale reads back as Font, numbers or a custom list', () => {
  assertEqual(scaleTypeOf(FONT_GRADES), 'font');
  assertEqual(scaleTypeOf(numberGrades(13)), 'numbers');
  assertEqual(scaleTypeOf(['Yellow', 'Green']), 'custom');
  assertEqual(scaleTypeOf(['2', '3', '4']), 'custom', 'numbers not from one');
});

test('calendar days start on Monday and fill whole weeks', () => {
  const days = calendarDays(new Date(2026, 10, 1));
  assertEqual(days.slice(0, 7).map((day) => day?.getDate() ?? null), [null, null, null, null, null, null, 1]);
  assertEqual([days.length, days.filter(Boolean).at(-1).getDate()], [42, 30]);
  assertEqual(calendarDays(new Date(2027, 1, 1)).length, 28, 'February 2027 starts on a Monday');
  assertEqual(monthValue(parseMonthValue('2026-03')), '2026-03');
});

test('durations grow to hours, lengths read as hours and minutes, and ordinals get their suffix', () => {
  assertEqual([formatDuration(59 * MINUTE + 59000), formatDuration(65 * MINUTE + 3000)], ['59:59', '1:05:03']);
  assertEqual([formatLength(48 * MINUTE), formatLength(102 * MINUTE)], ['48m', '1h 42m']);
  assertEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 111].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '111th']);
});
