import { formatDuration } from './format.js';

const STORAGE_KEY = 'logger.v2.stopwatch';
const TICK_MS = 1000;
const LIMIT_MS = 12 * 60 * 60 * 1000;
const DEFAULTS = { startedAt: null, elapsed: 0, restartOnLog: true };
const START_ICON = 'M8 5.5v13l10.5-6.5z';
const STOP_ICON = 'M9 6v12M15 6v12';

const stopwatchEl = document.getElementById('stopwatch');
const timeEl = document.getElementById('stopwatch-time');
const toggleButton = document.getElementById('stopwatch-toggle');
const icon = document.getElementById('stopwatch-icon');
const restartOnLogInput = document.getElementById('stopwatch-restart-on-log');

let stopwatch = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };

export const isRunning = ({ startedAt }) => startedAt !== null;

export const elapsedOf = (state, now) => (isRunning(state) ? now - state.startedAt : state.elapsed);

export const toggleStopwatch = (state, now) => (isRunning(state)
  ? { ...state, startedAt: null, elapsed: elapsedOf(state, now) }
  : { ...state, startedAt: now - state.elapsed });

export const resetStopwatch = (state, now) => ({ ...state, startedAt: isRunning(state) ? now : null, elapsed: 0 });

export const expireStopwatch = (state, now) => (elapsedOf(state, now) >= LIMIT_MS
  ? { ...state, startedAt: null, elapsed: 0 }
  : state);

export const restartAfterLog = (state, now) => (state.restartOnLog ? { ...state, startedAt: now, elapsed: 0 } : state);

export const stopwatchActions = {
  'stopwatch-toggle': () => update(toggleStopwatch),
  'stopwatch-reset': () => update(resetStopwatch),
};

export function initStopwatch() {
  stopwatchEl.addEventListener('pointerdown', showPress);
  stopwatchEl.addEventListener('animationend', ({ target }) => target.classList.remove('is-pressed'));
  restartOnLogInput.addEventListener('change', () => save({ ...stopwatch, restartOnLog: restartOnLogInput.checked }));
  document.addEventListener('visibilitychange', () => update(expireStopwatch));
  setInterval(renderTime, TICK_MS);
  update(expireStopwatch);
}

export const onSetLogged = () => update(restartAfterLog);

function showPress({ target }) {
  target.closest('.stopwatch-button')?.classList.add('is-pressed');
}

function update(change) {
  save(change(stopwatch, Date.now()));
  renderStopwatch();
}

function save(state) {
  stopwatch = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stopwatch));
}

function renderStopwatch() {
  const running = isRunning(stopwatch);
  toggleButton.setAttribute('aria-label', running ? 'Stop stopwatch' : 'Start stopwatch');
  icon.setAttribute('d', running ? STOP_ICON : START_ICON);
  restartOnLogInput.checked = stopwatch.restartOnLog;
  renderTime();
}

function renderTime() {
  timeEl.textContent = formatDuration(Math.max(0, elapsedOf(stopwatch, Date.now())));
}
