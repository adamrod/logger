import { formatDuration } from './format.js';

const TICK_MS = 1000;
const LIMIT_MS = 12 * 60 * 60 * 1000;
const DEFAULTS = { startedAt: null, elapsed: 0, restartOnLog: true };
const START_ICON = 'M8 5.5v13l10.5-6.5z';
const PAUSE_ICON = 'M9 6v12M15 6v12';

export const STOP_ICON = 'M7 7h10v10H7z';

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

export const startIfStopped = (state, now) => (isRunning(state) ? state : { ...state, startedAt: now, elapsed: 0 });

export const startFreshOrStop = (state, now) => (isRunning(state) ? toggleStopwatch(state, now) : startIfStopped(state, now));

export function createStopwatch({ id, name, storageKey, toggle = toggleStopwatch, stopIcon = PAUSE_ICON }) {
  const stopwatchEl = document.getElementById(id);
  const timeEl = document.getElementById(`${id}-time`);
  const toggleButton = document.getElementById(`${id}-toggle`);
  const icon = document.getElementById(`${id}-icon`);
  const restartOnLogInput = document.getElementById(`${id}-restart-on-log`);

  let stopwatch = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(storageKey) ?? '{}') };

  function showPress({ target }) {
    target.closest('.stopwatch-button')?.classList.add('is-pressed');
  }

  function update(change) {
    save(change(stopwatch, Date.now()));
    render();
  }

  function save(state) {
    stopwatch = state;
    localStorage.setItem(storageKey, JSON.stringify(stopwatch));
  }

  function render() {
    const running = isRunning(stopwatch);
    toggleButton.setAttribute('aria-label', `${running ? 'Stop' : 'Start'} ${name}`);
    icon.setAttribute('d', running ? stopIcon : START_ICON);
    if (restartOnLogInput) restartOnLogInput.checked = stopwatch.restartOnLog;
    renderTime();
  }

  function renderTime() {
    timeEl.textContent = formatDuration(Math.max(0, elapsedOf(stopwatch, Date.now())));
  }

  function init() {
    stopwatchEl.addEventListener('pointerdown', showPress);
    stopwatchEl.addEventListener('animationend', ({ target }) => target.classList.remove('is-pressed'));
    restartOnLogInput?.addEventListener('change', () => save({ ...stopwatch, restartOnLog: restartOnLogInput.checked }));
    document.addEventListener('visibilitychange', () => update(expireStopwatch));
    setInterval(renderTime, TICK_MS);
    update(expireStopwatch);
  }

  return {
    init,
    update,
    actions: {
      [`${id}-toggle`]: () => update(toggle),
      [`${id}-reset`]: () => update(resetStopwatch),
    },
  };
}
