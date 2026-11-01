const AWAKE_FOR_MS = 10 * 60000;

let wakeLock = null;
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
  wakeLock ??= requestWakeLock();
}

async function requestWakeLock() {
  try {
    const sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => { wakeLock = null; });
    return sentinel;
  } catch {
    wakeLock = null;
    return null;
  }
}

function letScreenSleep() {
  wakeLock?.then((sentinel) => sentinel?.release());
}
