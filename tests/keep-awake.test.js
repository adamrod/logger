import { initKeepAwake } from '../js/keep-awake.js';
import { assertEqual, test } from './harness.js';

const MINUTE = 60000;

const pageListeners = {};
const timers = new Map();
const sentinels = [];
let now = 0;
let nextTimerId = 0;
let refusals = 0;
let isOpen = false;

const heldLocks = () => sentinels.filter((sentinel) => !sentinel.released).length;
const touch = () => pageListeners.pointerup();
const leaveApp = () => sentinels.forEach((sentinel) => sentinel.release());
const returnToApp = () => pageListeners.visibilitychange();

async function settle() {
  for (let tick = 0; tick < 5; tick += 1) await null;
}

function fakeSentinel() {
  const onRelease = [];
  const sentinel = {
    released: false,
    addEventListener: (type, listener) => onRelease.push(listener),
    release: async () => {
      sentinel.released = true;
      onRelease.forEach((listener) => listener());
    },
  };
  sentinels.push(sentinel);
  return sentinel;
}

const fakeWakeLock = {
  request() {
    if (refusals === 0) return Promise.resolve(fakeSentinel());
    refusals -= 1;
    return Promise.reject(new Error('Not allowed'));
  },
};

function startTimer(callback, delay) {
  nextTimerId += 1;
  timers.set(nextTimerId, { callback, at: now + delay });
  return nextTimerId;
}

async function passTime(ms) {
  now += ms;
  [...timers].filter(([, timer]) => timer.at <= now).forEach(([id, { callback }]) => {
    timers.delete(id);
    callback();
  });
  await settle();
}

function openApp() {
  if (isOpen) return;
  isOpen = true;
  navigator.wakeLock = fakeWakeLock;
  const { addEventListener } = document;
  document.addEventListener = (type, listener) => { pageListeners[type] = listener; };
  initKeepAwake();
  document.addEventListener = addEventListener;
}

const withOpenApp = (run) => async () => {
  const real = { setTimeout, clearTimeout };
  globalThis.setTimeout = startTimer;
  globalThis.clearTimeout = (id) => timers.delete(id);
  try {
    openApp();
    await settle();
    await run();
  } finally {
    Object.assign(globalThis, real);
  }
};

test('the app keeps the screen awake while it is open', withOpenApp(() => {
  assertEqual(heldLocks(), 1);
}));

test('the screen stays awake until seven minutes after the last touch', withOpenApp(async () => {
  touch();
  await passTime(6 * MINUTE);
  touch();
  await passTime(6 * MINUTE);
  assertEqual(heldLocks(), 1, 'held 6 minutes after a touch');
  await passTime(MINUTE);
  assertEqual(heldLocks(), 0, 'held 7 minutes after a touch');
}));

test('a touch keeps the screen awake again after it was let sleep', withOpenApp(async () => {
  await passTime(7 * MINUTE);
  touch();
  await settle();
  assertEqual(heldLocks(), 1);
}));

test('quick touches hold one wake lock', withOpenApp(async () => {
  await passTime(7 * MINUTE);
  touch();
  touch();
  await settle();
  assertEqual(heldLocks(), 1);
}));

test('coming back to the app keeps the screen awake again', withOpenApp(async () => {
  touch();
  await settle();
  leaveApp();
  returnToApp();
  await settle();
  assertEqual(heldLocks(), 1);
}));

test('a refused wake lock is asked for again on the next touch', withOpenApp(async () => {
  await passTime(7 * MINUTE);
  refusals = 1;
  touch();
  await settle();
  assertEqual(heldLocks(), 0, 'held after the refusal');
  touch();
  await settle();
  assertEqual(heldLocks(), 1, 'held after the next touch');
}));
