import { getSettings } from './settings.js';

const MINUTE_MS = 60000;

let wakeLockRequest = null;
let sleepTimer = null;

export function initKeepAwake() {
  if (!navigator.wakeLock) return;
  ['pointerup', 'keydown'].forEach((type) => document.addEventListener(type, keepAwake));
  document.addEventListener('visibilitychange', keepAwakeWhenVisible);
  keepAwake();
}

function keepAwakeWhenVisible() {
  if (document.visibilityState === 'visible') keepAwake();
}

export function keepAwake() {
  clearTimeout(sleepTimer);
  const minutes = getSettings().screenTimeout;
  if (!navigator.wakeLock || !minutes) return letScreenSleep();
  sleepTimer = setTimeout(letScreenSleep, minutes * MINUTE_MS);
  wakeLockRequest ??= requestWakeLock();
}

async function requestWakeLock() {
  try {
    const sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => { wakeLockRequest = null; });
    return sentinel;
  } catch {
    wakeLockRequest = null;
    return null;
  }
}

function letScreenSleep() {
  wakeLockRequest?.then((sentinel) => sentinel?.release());
}
