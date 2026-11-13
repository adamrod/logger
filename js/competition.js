const MINUTE_MS = 60000;
const SCORING_RESULTS = ['top', 'zone'];

export const RESULTS = { attempt: 'Attempt', zone: 'Zone', top: 'Top' };

const startOf = (competition) => Date.parse(competition.start);

const lengthOf = (competition) => competition.minutes * MINUTE_MS;

export const endOf = (competition) => startOf(competition) + lengthOf(competition);

export const boulderNumbers = ({ first, last }) => Array.from({ length: last - first + 1 }, (_, i) => first + i);

export const attemptsIn = (attempts, competition) => attempts.filter((attempt) => attempt.competition === competition.timestamp);

export function stateOf(attempts) {
  const results = new Set(attempts.map((attempt) => attempt.result));
  return SCORING_RESULTS.find((result) => results.has(result)) ?? (attempts.length ? 'tried' : 'untouched');
}

export function boardOf(competition, attempts) {
  const byBoulder = Map.groupBy(attemptsIn(attempts, competition), (attempt) => attempt.boulder);
  return boulderNumbers(competition).map((number) => {
    const tries = byBoulder.get(number) ?? [];
    return { number, attempts: tries, state: stateOf(tries) };
  });
}

export function scoreOf(competition, board) {
  const count = (state) => board.filter((boulder) => boulder.state === state).length;
  const tops = count('top');
  const zones = count('zone');
  return {
    tops,
    zones,
    tried: board.length - count('untouched'),
    total: board.length,
    points: tops * competition.topPoints + zones * competition.zonePoints,
  };
}

export function clockOf(competition, now) {
  const startAt = startOf(competition);
  const length = lengthOf(competition);
  if (now < startAt) return { phase: 'before', startsIn: startAt - now, length };
  if (now >= startAt + length) return { phase: 'after', length };
  return { phase: 'live', elapsed: now - startAt, left: startAt + length - now, length };
}

export const liveCompetition = (competitions, now) => competitions
  .find((competition) => clockOf(competition, now).phase === 'live') ?? null;

export function nextResult(result) {
  const results = Object.keys(RESULTS);
  return results[(results.indexOf(result) + 1) % results.length];
}
