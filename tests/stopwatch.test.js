import {
  elapsedOf, expireStopwatch, isRunning, resetStopwatch, restartAfterLog, restartUnlessStartedSince, startFreshOrStop, toggleStopwatch,
} from '../js/stopwatch.js';
import { assertEqual, test } from './harness.js';

const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;
const STOPPED = { startedAt: null, elapsed: 0, restartOnLog: true };

test('the stopwatch counts while running and holds its time while stopped', () => {
  const running = toggleStopwatch(STOPPED, 0);
  assertEqual(elapsedOf(running, 30 * SECOND), 30 * SECOND, 'running');
  const held = toggleStopwatch(running, 30 * SECOND);
  assertEqual([isRunning(held), elapsedOf(held, 90 * SECOND)], [false, 30 * SECOND], 'stopped');
  assertEqual(elapsedOf(toggleStopwatch(held, 100 * SECOND), 110 * SECOND), 40 * SECOND, 'started again');
});

test('resetting goes back to zero and keeps the stopwatch running or stopped', () => {
  const running = toggleStopwatch(STOPPED, 0);
  assertEqual(elapsedOf(resetStopwatch(running, 20 * SECOND), 25 * SECOND), 5 * SECOND, 'running');
  const held = resetStopwatch(toggleStopwatch(running, 20 * SECOND), 30 * SECOND);
  assertEqual([isRunning(held), elapsedOf(held, 40 * SECOND)], [false, 0], 'stopped');
});

test('logging a set restarts the stopwatch from zero only when restart on log is ticked', () => {
  const held = toggleStopwatch(toggleStopwatch(STOPPED, 0), 20 * SECOND);
  assertEqual(elapsedOf(restartAfterLog(held, 30 * SECOND), 35 * SECOND), 5 * SECOND, 'ticked');
  const unticked = { ...held, restartOnLog: false };
  assertEqual(restartAfterLog(unticked, 30 * SECOND), unticked, 'unticked');
});

test('the stopwatch stops at zero once it reaches twelve hours', () => {
  const running = toggleStopwatch(STOPPED, 0);
  assertEqual(expireStopwatch(running, 12 * HOUR - SECOND), running, 'under the limit');
  const expired = expireStopwatch(running, 7 * 24 * HOUR);
  assertEqual([isRunning(expired), elapsedOf(expired, 8 * 24 * HOUR)], [false, 0], 'over the limit');
});

test('the session stopwatch starts from zero and holds its time when stopped', () => {
  const held = toggleStopwatch(toggleStopwatch(STOPPED, 0), 50 * SECOND);
  const started = startFreshOrStop(held, 100 * SECOND);
  assertEqual(elapsedOf(started, 130 * SECOND), 30 * SECOND, 'started fresh');
  const stopped = startFreshOrStop(started, 130 * SECOND);
  assertEqual([isRunning(stopped), elapsedOf(stopped, 999 * SECOND)], [false, 30 * SECOND], 'stopped');
});

test('a new session keeps a stopwatch started since the last session and restarts any other', () => {
  const startedAtArrival = toggleStopwatch(STOPPED, 100 * SECOND);
  assertEqual(restartUnlessStartedSince(50 * SECOND)(startedAtArrival, 200 * SECOND), startedAtArrival, 'started since');
  const leftRunning = toggleStopwatch(STOPPED, 10 * SECOND);
  assertEqual(elapsedOf(restartUnlessStartedSince(50 * SECOND)(leftRunning, 200 * SECOND), 230 * SECOND), 30 * SECOND, 'left running');
  assertEqual(isRunning(restartUnlessStartedSince(50 * SECOND)(STOPPED, 200 * SECOND)), true, 'stopped');
});
