import { formatDuration } from './format.js';

const STORAGE_KEY = 'logger.v2.timer';
const TICK_MS = 1000;
const DEFAULTS = { startedAt: null, elapsed: 0, resetOnLog: true };

const timeEl = document.getElementById('timer-time');
const startButton = document.getElementById('timer-start');
const stopButton = document.getElementById('timer-stop');
const resetOnLogInput = document.getElementById('timer-reset-on-log');

let timer = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };

export const isRunning = ({ startedAt }) => startedAt !== null;

export const elapsedOf = (state, now) => (isRunning(state) ? now - state.startedAt : state.elapsed);

export const startTimer = (state, now) => (isRunning(state) ? state : { ...state, startedAt: now - state.elapsed });

export const stopTimer = (state, now) => ({ ...state, startedAt: null, elapsed: elapsedOf(state, now) });

export const resetTimer = (state, now) => ({ ...state, startedAt: isRunning(state) ? now : null, elapsed: 0 });

export const restartOnLog = (state, now) => (state.resetOnLog ? { ...state, startedAt: now, elapsed: 0 } : state);

export const timerActions = {
  'timer-start': () => update(startTimer),
  'timer-stop': () => update(stopTimer),
  'timer-reset': () => update(resetTimer),
};

export function initTimer() {
  resetOnLogInput.addEventListener('change', () => save({ ...timer, resetOnLog: resetOnLogInput.checked }));
  setInterval(renderTime, TICK_MS);
  renderTimer();
}

export const onSetLogged = () => update(restartOnLog);

function update(change) {
  save(change(timer, Date.now()));
  renderTimer();
}

function save(state) {
  timer = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
}

function renderTimer() {
  startButton.disabled = isRunning(timer);
  stopButton.disabled = !isRunning(timer);
  resetOnLogInput.checked = timer.resetOnLog;
  renderTime();
}

function renderTime() {
  timeEl.textContent = formatDuration(Math.max(0, elapsedOf(timer, Date.now())));
}
