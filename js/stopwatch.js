import { formatDuration } from './format.js';

const STORAGE_KEY = 'logger.v2.stopwatch';
const TICK_MS = 1000;
const DEFAULTS = { startedAt: null, elapsed: 0, resetOnLog: true };

const timeEl = document.getElementById('stopwatch-time');
const startButton = document.getElementById('stopwatch-start');
const stopButton = document.getElementById('stopwatch-stop');
const resetOnLogInput = document.getElementById('stopwatch-reset-on-log');

let stopwatch = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };

export const isRunning = ({ startedAt }) => startedAt !== null;

export const elapsedOf = (state, now) => (isRunning(state) ? now - state.startedAt : state.elapsed);

export const startStopwatch = (state, now) => (isRunning(state) ? state : { ...state, startedAt: now - state.elapsed });

export const stopStopwatch = (state, now) => ({ ...state, startedAt: null, elapsed: elapsedOf(state, now) });

export const resetStopwatch = (state, now) => ({ ...state, startedAt: isRunning(state) ? now : null, elapsed: 0 });

export const restartOnLog = (state, now) => (state.resetOnLog ? { ...state, startedAt: now, elapsed: 0 } : state);

export const stopwatchActions = {
  'stopwatch-start': () => update(startStopwatch),
  'stopwatch-stop': () => update(stopStopwatch),
  'stopwatch-reset': () => update(resetStopwatch),
};

export function initStopwatch() {
  resetOnLogInput.addEventListener('change', () => save({ ...stopwatch, resetOnLog: resetOnLogInput.checked }));
  setInterval(renderTime, TICK_MS);
  renderStopwatch();
}

export const onSetLogged = () => update(restartOnLog);

function update(change) {
  save(change(stopwatch, Date.now()));
  renderStopwatch();
}

function save(state) {
  stopwatch = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stopwatch));
}

function renderStopwatch() {
  startButton.disabled = isRunning(stopwatch);
  stopButton.disabled = !isRunning(stopwatch);
  resetOnLogInput.checked = stopwatch.resetOnLog;
  renderTime();
}

function renderTime() {
  timeEl.textContent = formatDuration(Math.max(0, elapsedOf(stopwatch, Date.now())));
}
