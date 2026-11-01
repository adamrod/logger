import { elapsedOf, isRunning, resetStopwatch, restartOnLog, startStopwatch, stopStopwatch } from '../js/stopwatch.js';
import { assertEqual, test } from './harness.js';

const SECOND = 1000;
const STOPPED = { startedAt: null, elapsed: 0, resetOnLog: true };

test('the stopwatch counts while running and holds its time while stopped', () => {
  const running = startStopwatch(STOPPED, 0);
  assertEqual(elapsedOf(running, 30 * SECOND), 30 * SECOND, 'running');
  const held = stopStopwatch(running, 30 * SECOND);
  assertEqual([isRunning(held), elapsedOf(held, 90 * SECOND)], [false, 30 * SECOND], 'stopped');
  assertEqual(elapsedOf(startStopwatch(held, 100 * SECOND), 110 * SECOND), 40 * SECOND, 'started again');
  assertEqual(startStopwatch(running, 50 * SECOND), running, 'starting while running');
});

test('resetting goes back to zero and keeps the stopwatch running or stopped', () => {
  const running = startStopwatch(STOPPED, 0);
  assertEqual(elapsedOf(resetStopwatch(running, 20 * SECOND), 25 * SECOND), 5 * SECOND, 'running');
  const held = resetStopwatch(stopStopwatch(running, 20 * SECOND), 30 * SECOND);
  assertEqual([isRunning(held), elapsedOf(held, 40 * SECOND)], [false, 0], 'stopped');
});

test('logging a set restarts the stopwatch from zero only when reset on log is ticked', () => {
  const held = stopStopwatch(startStopwatch(STOPPED, 0), 20 * SECOND);
  assertEqual(elapsedOf(restartOnLog(held, 30 * SECOND), 35 * SECOND), 5 * SECOND, 'ticked');
  const unticked = { ...held, resetOnLog: false };
  assertEqual(restartOnLog(unticked, 30 * SECOND), unticked, 'unticked');
});
