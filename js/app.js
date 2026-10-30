import { initAnalysis, renderAnalysis } from './analysis-screen.js';
import { initAppVersion } from './app-version.js';
import { initBodyWeight, renderBodyWeight } from './body-weight-screen.js';
import { onChange } from './events.js';
import { initLog, renderLog } from './log-screen.js';
import { initSettings, renderSettings } from './settings-screen.js';
import { initAutoSync } from './sync.js';
import { initSyncStatus, renderSyncStatus } from './sync-status.js';

const RENDERERS = {
  log: renderLog,
  settings: renderSettings,
  'body-weight': renderBodyWeight,
  analysis: renderAnalysis,
};
const PARENT_TABS = { analysis: 'log' };

let current = 'log';

function route() {
  const name = location.hash.slice(1);
  current = name in RENDERERS ? name : 'log';
  const currentTab = PARENT_TABS[current] ?? current;
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.hidden = screen.id !== `screen-${current}`;
  });
  document.querySelectorAll('.tab').forEach((tab) => {
    if (tab.hash === `#${currentTab}`) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  render();
}

function render() {
  RENDERERS[current]();
  renderSyncStatus();
}

function snapPageBackAfterKeyboard() {
  window.scrollTo(0, 0);
}

initLog();
initBodyWeight();
initAnalysis();
initSettings();
initSyncStatus();
onChange(render);
window.addEventListener('hashchange', route);
document.addEventListener('focusout', snapPageBackAfterKeyboard);
route();

initAutoSync();

initAppVersion();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
