import { initPortraitLock } from '../js/portrait-lock.js';
import { assertEqual, test } from './harness.js';

const listeners = {};
const orientation = { angle: 0, addEventListener: (type, listener) => { listeners[type] = listener; } };

function turnPhone(angle) {
  orientation.angle = angle;
  listeners.change();
}

test('portrait lock marks how far the phone is turned', () => {
  globalThis.screen = { orientation };
  document.documentElement = { dataset: {} };
  initPortraitLock();
  assertEqual(document.documentElement.dataset.turn, 0);
  turnPhone(90);
  assertEqual(document.documentElement.dataset.turn, 90);
  turnPhone(-90);
  assertEqual(document.documentElement.dataset.turn, 270);
  turnPhone(0);
  assertEqual(document.documentElement.dataset.turn, 0);
});

test('portrait lock does nothing without screen orientation', () => {
  globalThis.screen = {};
  document.documentElement = { dataset: {} };
  initPortraitLock();
  assertEqual(document.documentElement.dataset.turn, undefined);
});
