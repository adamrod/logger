import { entryDate } from './entry-log.js';
import { ordinal } from './format.js';

export const STYLES = { boulder: 'Boulder', lead: 'Lead', toprope: 'Top rope', auto: 'Auto-belay' };
export const FONT_GRADES = ['3', '4', '4+', '5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A', '8A+', '8B', '8B+', '8C', '8C+'];
export const FRENCH_GRADES = ['4a', '4b', '4c', '5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+', '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a', '8a+', '8b', '8b+', '8c', '8c+', '9a'];
export const DEFAULT_TAGS = ['Slab', 'Vertical', 'Overhang', 'Roof', 'Crimps', 'Slopers', 'Pinches', 'Pockets', 'Dyno', 'Compression'];

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

export function scaleTypeOf(grades) {
  if (grades.join('|') === FONT_GRADES.join('|')) return 'font';
  return grades.join('|') === numberGrades(grades.length).join('|') ? 'numbers' : 'custom';
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

export const isLive = (session, now) => now - session.endAt < SESSION_GAP_MS;

export function sessionKind(session) {
  const boulders = session.attempts.filter((attempt) => attempt.style === 'boulder').length;
  return boulders * 2 >= session.attempts.length ? 'boulder' : 'rope';
}

export const climbOf = (attempts) => {
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
};

export const climbsIn = (attempts) => [...Map.groupBy(attempts, (attempt) => attempt.climb).values()].map(climbOf);

export const attemptsOfClimb = (attempts, id) => attempts.filter((attempt) => attempt.climb === id);

const sessionCount = (attempts) => climbingSessions(attempts).length;

export function outcomeOf(allAttempts, here) {
  const before = allAttempts.filter((attempt) => attempt.timestamp < here[0].timestamp);
  const firstTop = here.findIndex(isTop);
  if (before.some(isSend)) return firstTop === -1 ? 'No top' : 'Repeat';
  if (firstTop === -1) return here.at(-1).name ? projectLabel(before) : 'No top';
  const top = here[firstTop];
  if (!isSend(top)) return `${STYLES[top.style]} top`;
  const attemptNumber = before.length + firstTop + 1;
  if (attemptNumber === 1) return 'Flash';
  return before.length ? `Sent · ${ordinal(sessionCount(before) + 1)} session` : `Sent · ${ordinal(attemptNumber)} attempt`;
}

const projectLabel = (before) => (before.length ? `Project · ${ordinal(sessionCount(before) + 1)} session` : 'Project');

export function flashesAmong(attempts, allAttempts) {
  const firstIds = new Set(climbsIn(allAttempts).map((climb) => climb.attempts[0].timestamp));
  return attempts.filter((attempt) => isSend(attempt) && firstIds.has(attempt.timestamp));
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

function firstSendsAmong(attempts, allAttempts) {
  const firstIds = new Set(climbsIn(allAttempts.filter(isSend)).map((climb) => climb.attempts[0].timestamp));
  return attempts.filter((attempt) => firstIds.has(attempt.timestamp));
}

export function climbStats(attempts, allAttempts, grades) {
  const flashes = flashesAmong(attempts, allAttempts);
  const firstSends = firstSendsAmong(attempts, allAttempts);
  return {
    attempts: attempts.length,
    tops: attempts.filter(isTop).length,
    hardestSend: hardestGrade(attempts.filter(isSend), grades),
    hardestFlash: hardestGrade(flashes, grades),
    flashRate: firstSends.length ? flashes.length / firstSends.length : null,
  };
}

const byRankDescending = (grades) => (a, b) => grades.indexOf(b.grade) - grades.indexOf(a.grade);

export function attemptsByGrade(attempts, grades) {
  return [...Map.groupBy(attempts, (attempt) => attempt.grade)]
    .map(([grade, list]) => ({ grade, attempts: list }))
    .sort(byRankDescending(grades));
}

export function gradePyramid(attempts, allAttempts, grades) {
  const climbs = climbsIn(attempts).map((climb) => ({
    grade: climb.grade,
    isSent: attemptsOfClimb(allAttempts, climb.id).some(isSend),
  }));
  return [...Map.groupBy(climbs, (climb) => climb.grade)]
    .map(([grade, list]) => ({ grade, sent: list.filter((climb) => climb.isSent).length, total: list.length }))
    .sort(byRankDescending(grades));
}

export function tagCounts(attempts) {
  const counts = new Map();
  for (const climb of climbsIn(attempts)) {
    const isSent = climb.attempts.some(isSend);
    for (const tag of climb.tags) {
      const count = counts.get(tag) ?? { tag, sent: 0, total: 0 };
      counts.set(tag, { tag, sent: count.sent + (isSent ? 1 : 0), total: count.total + 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag));
}

export function openProjects(attempts, gym, kind) {
  return climbsIn(attempts.filter((attempt) => attempt.gym === gym && kindOf(attempt.style) === kind))
    .filter((climb) => climb.name && !climb.attempts.some(isSend))
    .sort((a, b) => b.attempts.at(-1).timestamp.localeCompare(a.attempts.at(-1).timestamp));
}

export const projectSessions = (climb) => sessionCount(climb.attempts);

export function lastGradeAt(attempts, gym, kind) {
  return attempts.findLast((attempt) => attempt.gym === gym && kindOf(attempt.style) === kind)?.grade ?? null;
}

export function lastStyleAt(attempts, gym) {
  return attempts.findLast((attempt) => attempt.gym === gym)?.style ?? null;
}

export function sessionHighs(sessions, allAttempts, grades) {
  return sessions.map((session) => ({
    date: new Date(session.startAt),
    send: hardestGrade(session.attempts.filter(isSend), grades),
    flash: hardestGrade(flashesAmong(session.attempts, allAttempts), grades),
  }));
}
