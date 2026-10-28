import { initAppVersion } from './app-version.js';
import { initBodyWeight, renderBodyWeight } from './body-weight-screen.js';
import { onChange } from './events.js';
import { initLog, renderLog } from './log-screen.js';
import { initSettings, renderSettings } from './settings-screen.js';
import { sync } from './sync.js';
import { initSyncButtons, renderSyncButtons } from './sync-buttons.js';

const RENDERERS = {
  log: renderLog,
  settings: renderSettings,
  'body-weight': renderBodyWeight,
};

let current = 'log';

function route() {
  const name = location.hash.slice(1);
  current = name in RENDERERS ? name : 'log';
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.hidden = screen.id !== `screen-${current}`;
  });
  document.querySelectorAll('.tab').forEach((tab) => {
    if (tab.hash === `#${current}`) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  render();
}

function render() {
  RENDERERS[current]();
  renderSyncButtons();
}

function snapPageBackAfterKeyboard() {
  window.scrollTo(0, 0);
}

initLog();
initBodyWeight();
initSettings();
initSyncButtons();
onChange(render);
window.addEventListener('hashchange', route);
document.addEventListener('focusout', snapPageBackAfterKeyboard);
route();

sync();
window.addEventListener('online', sync);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') sync();
});

initAppVersion();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
