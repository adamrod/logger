import { boardOf, boulderNumbers, clockOf, liveCompetition, nextResult, scoreOf, stateOf } from '../js/competition.js';
import { assertEqual, test } from './harness.js';

const MINUTE = 60000;
const START = '2026-11-14T13:00:00.000Z';
const STARTED_AT = Date.parse(START);
const OPEN = { timestamp: 'open', start: START, minutes: 150, first: 11, last: 40, topPoints: 10, zonePoints: 1 };
const OTHER = { ...OPEN, timestamp: 'other', start: '2026-11-21T13:00:00.000Z' };

const tries = (competition, boulder, results) => [...results].map((letter) => ({
  competition: competition.timestamp,
  boulder,
  result: { A: 'attempt', Z: 'zone', T: 'top' }[letter],
}));

const statesOf = (board) => Object.fromEntries(board.filter(({ state }) => state !== 'untouched').map(({ number, state }) => [number, state]));

test('a competition has every boulder from its first number to its last', () => {
  const numbers = boulderNumbers(OPEN);
  assertEqual([numbers.length, numbers[0], numbers.at(-1)], [30, 11, 40]);
});

test('a boulder is as good as its best try: top, then zone, then tried', () => {
  assertEqual(['', 'AA', 'AZA', 'ZAT', 'T'].map((results) => stateOf(tries(OPEN, 11, results))), ['untouched', 'tried', 'zone', 'top', 'top']);
});

test('the board holds only the tries of its own competition', () => {
  const attempts = [...tries(OPEN, 12, 'AZ'), ...tries(OTHER, 12, 'T'), ...tries(OPEN, 40, 'AT'), ...tries(OPEN, 13, 'A')];
  const board = boardOf(OPEN, attempts);
  assertEqual(statesOf(board), { 12: 'zone', 13: 'tried', 40: 'top' }, 'states');
  assertEqual(board.find(({ number }) => number === 12).attempts.length, 2, 'tries on 12');
});

test('a topped boulder scores its top only, a zone scores when the top is missing', () => {
  const attempts = [...tries(OPEN, 11, 'ZT'), ...tries(OPEN, 12, 'T'), ...tries(OPEN, 13, 'AZ'), ...tries(OPEN, 14, 'AA')];
  assertEqual(scoreOf(OPEN, boardOf(OPEN, attempts)), { tops: 2, zones: 1, tried: 4, total: 30, points: 21 });
});

test('the clock counts down to the start, then shows time gone and left, then finishes', () => {
  assertEqual(clockOf(OPEN, STARTED_AT - 10 * MINUTE), { phase: 'before', startsIn: 10 * MINUTE, length: 150 * MINUTE }, 'before');
  assertEqual(clockOf(OPEN, STARTED_AT + 60 * MINUTE), { phase: 'live', elapsed: 60 * MINUTE, left: 90 * MINUTE, length: 150 * MINUTE }, 'during');
  assertEqual(clockOf(OPEN, STARTED_AT + 150 * MINUTE), { phase: 'after', length: 150 * MINUTE }, 'after');
});

test('a competition is live only between its start and its end', () => {
  const live = (now) => liveCompetition([OTHER, OPEN], now)?.timestamp ?? null;
  assertEqual([live(STARTED_AT - 1), live(STARTED_AT), live(STARTED_AT + 150 * MINUTE)], [null, 'open', null]);
});

test('tapping a result steps through attempt, zone and top', () => {
  assertEqual(['attempt', 'zone', 'top'].map(nextResult), ['zone', 'top', 'attempt']);
});
