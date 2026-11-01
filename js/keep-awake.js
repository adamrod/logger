const AWAKE_FOR_MS = 7 * 60000;

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

function keepAwake() {
  clearTimeout(sleepTimer);
  sleepTimer = setTimeout(letScreenSleep, AWAKE_FOR_MS);
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
