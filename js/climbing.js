import { entryDate } from './entry-log.js';
import { ordinal } from './format.js';

export const STYLES = { boulder: 'Boulder', lead: 'Lead', toprope: 'Top rope', auto: 'Auto-belay' };
export const FONT_GRADES = ['3', '4', '4+', '5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A', '8A+', '8B', '8B+', '8C', '8C+'];
const FRENCH_GRADES = ['4a', '4b', '4c', '5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+', '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a', '8a+', '8b', '8b+', '8c', '8c+', '9a'];
export const DEFAULT_TAGS = ['Slab', 'Vertical', 'Overhang', 'Roof', 'Crimps', 'Slopers', 'Pinches', 'Pockets', 'Dyno', 'Compression', 'Comp'];
export const UNGRADED = '?';

const SESSION_GAP_MS = 3 * 60 * 60 * 1000;
const BATCH_GAP_MS = 15 * 1000;
const REST_LIMIT_MS = 20 * 60 * 1000;
const SENDING_STYLES = ['boulder', 'lead'];

const timeOf = (attempt) => entryDate(attempt).getTime();

export const kindOf = (style) => (style === 'boulder' ? 'boulder' : 'rope');

export const isTop = (attempt) => attempt.result === 'top';

export const isSend = (attempt) => isTop(attempt) && SENDING_STYLES.includes(attempt.style);

export const tagsOf = (attempt) => (attempt.tags ? attempt.tags.split('|') : []);

export const joinTags = (tags) => tags.join('|');

export const numberGrades = (count) => Array.from({ length: count }, (_, i) => String(i + 1));

export const gradesFor = (boulderGrades, kind) => (kind === 'boulder' ? boulderGrades : FRENCH_GRADES);

const sameGrades = (a, b) => a.join('|') === b.join('|');

export function scaleTypeOf(grades) {
  if (sameGrades(grades, FONT_GRADES)) return 'font';
  return sameGrades(grades, numberGrades(grades.length)) ? 'numbers' : 'custom';
}

export function climbingSessions(attempts) {
  const sessions = [];
  for (const attempt of attempts) {
    const last = sessions.at(-1);
    const at = timeOf(attempt);
    if (last && last.gym === attempt.gym && at - last.endAt < SESSION_GAP_MS) {
      last.attempts.push(attempt);
      last.endAt = at;
    } else {
      sessions.push({ id: attempt.timestamp, gym: attempt.gym, attempts: [attempt], startAt: at, endAt: at });
    }
  }
  return sessions;
}

export const sessionCount = (attempts) => climbingSessions(attempts).length;

export const isLive = (session, now) => now - session.endAt < SESSION_GAP_MS;

export function sessionFocus({ attempts }) {
  const boulders = attempts.filter((attempt) => attempt.style === 'boulder');
  const kind = boulders.length * 2 >= attempts.length ? 'boulder' : 'rope';
  return { kind, attempts: kind === 'boulder' ? boulders : attempts.filter((attempt) => attempt.style !== 'boulder') };
}

export function climbOf(attempts) {
  const latest = attempts.at(-1);
  return {
    id: latest.climb,
    gym: latest.gym,
    kind: kindOf(latest.style),
    grade: latest.grade,
    name: latest.name ?? '',
    tags: tagsOf(latest),
    attempts,
  };
}

export const climbsIn = (attempts) => [...Map.groupBy(attempts, (attempt) => attempt.climb).values()].map(climbOf);

export const attemptsOfClimb = (attempts, id) => attempts.filter((attempt) => attempt.climb === id);

export function outcomeOf(climbAttempts, here) {
  const before = climbAttempts.filter((attempt) => attempt.timestamp < here[0].timestamp);
  if (before.some(isSend)) return here.some(isTop) ? 'Repeat' : 'No top';
  const sendIndex = here.findIndex(isSend);
  if (sendIndex !== -1) return sendLabel(before, sendIndex);
  const top = here.find(isTop);
  if (top) return `${STYLES[top.style]} top`;
  if (!climbAttempts.at(-1).name) return 'No top';
  return before.length ? `Project · ${ordinal(sessionCount(before) + 1)} session` : 'Project';
}

function sendLabel(before, sendIndex) {
  const attemptNumber = before.length + sendIndex + 1;
  if (attemptNumber === 1) return 'Flash';
  return before.length ? `Sent · ${ordinal(sessionCount(before) + 1)} session` : `Sent · ${ordinal(attemptNumber)} attempt`;
}

const firstOfEachClimb = (attempts) => new Set(climbsIn(attempts).map((climb) => climb.attempts[0].timestamp));

function flashesAmong(attempts, allAttempts) {
  const firstAttempts = firstOfEachClimb(allAttempts);
  return attempts.filter((attempt) => isSend(attempt) && firstAttempts.has(attempt.timestamp));
}

export function hardestGrade(attempts, grades) {
  const ranks = attempts.map((attempt) => grades.indexOf(attempt.grade)).filter((rank) => rank >= 0);
  return ranks.length ? grades[Math.max(...ranks)] : null;
}

export function meanRest(attempts) {
  const gaps = attempts.slice(1)
    .map((attempt, i) => timeOf(attempt) - timeOf(attempts[i]))
    .filter((gap) => gap >= BATCH_GAP_MS && gap <= REST_LIMIT_MS);
  return gaps.length ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : null;
}

export function climbStats(attempts, allAttempts, grades) {
  const flashes = flashesAmong(attempts, allAttempts);
  const firstSends = firstOfEachClimb(allAttempts.filter(isSend));
  const sentHere = attempts.filter((attempt) => firstSends.has(attempt.timestamp)).length;
  return {
    attempts: attempts.length,
    tops: attempts.filter(isTop).length,
    hardestSend: hardestGrade(attempts.filter(isSend), grades),
    hardestFlash: hardestGrade(flashes, grades),
    flashRate: sentHere ? flashes.length / sentHere : null,
  };
}

function isSentBy(climb, allAttempts) {
  const lastTry = climb.attempts.at(-1).timestamp;
  return attemptsOfClimb(allAttempts, climb.id).some((attempt) => isSend(attempt) && attempt.timestamp <= lastTry);
}

const sentCounts = (list) => ({ sent: list.filter((item) => item.isSent).length, total: list.length });

const byRankDescending = (grades) => (a, b) => grades.indexOf(b.grade) - grades.indexOf(a.grade);

export function attemptsByGrade(attempts, grades) {
  return [...Map.groupBy(attempts, (attempt) => attempt.grade)]
    .map(([grade, list]) => ({ grade, attempts: list }))
    .sort(byRankDescending(grades));
}

export function gradePyramid(attempts, allAttempts, grades) {
  const climbs = climbsIn(attempts).map((climb) => ({ grade: climb.grade, isSent: isSentBy(climb, allAttempts) }));
  return [...Map.groupBy(climbs, (climb) => climb.grade)]
    .map(([grade, list]) => ({ grade, ...sentCounts(list) }))
    .sort(byRankDescending(grades));
}

export function tagCounts(attempts, allAttempts) {
  const tagged = climbsIn(attempts).flatMap((climb) => climb.tags.map((tag) => ({ tag, isSent: isSentBy(climb, allAttempts) })));
  return [...Map.groupBy(tagged, (item) => item.tag)]
    .map(([tag, list]) => ({ tag, ...sentCounts(list) }))
    .sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag));
}

export const lastGradeAt = (attempts, gym, kind) => attempts
  .findLast((attempt) => attempt.gym === gym && kindOf(attempt.style) === kind)?.grade ?? null;

export const lastStyleAt = (attempts, gym) => attempts.findLast((attempt) => attempt.gym === gym)?.style ?? null;

export function sessionHighs(sessions, allAttempts, grades) {
  return sessions.map((session) => ({
    date: new Date(session.startAt),
    send: hardestGrade(session.attempts.filter(isSend), grades),
    flash: hardestGrade(flashesAmong(session.attempts, allAttempts), grades),
  }));
}

export function recordSends(attempts, gradesAt) {
  const placesSent = Map.groupBy(attempts.filter(isSend), (attempt) => `${attempt.gym}|${kindOf(attempt.style)}`);
  return new Set([...placesSent.values()].flatMap((sends) => {
    const grades = gradesAt(sends[0].gym, kindOf(sends[0].style));
    const rank = (attempt) => grades.indexOf(attempt.grade);
    let best = -1;
    return climbingSessions(sends).flatMap(({ attempts: sessionSends }, i) => {
      const top = sessionSends.reduce((hardest, attempt) => (rank(attempt) > rank(hardest) ? attempt : hardest));
      const isRecord = i > 0 && rank(top) > best;
      best = Math.max(best, rank(top));
      return isRecord ? [top.timestamp] : [];
    });
  }));
}

export const stylesText =(attempts) => [...new Set(attempts.map((attempt) => STYLES[attempt.style]))].join(', ');
