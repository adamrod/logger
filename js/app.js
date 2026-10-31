import { enterAnalysis, initAnalysis, renderAnalysis } from './analysis-screen.js';
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
const ENTER_HANDLERS = { analysis: enterAnalysis };
const PARENT_TABS = { analysis: 'log' };

let current = null;

function route() {
  const name = location.hash.slice(1);
  const next = name in RENDERERS ? name : 'log';
  if (next !== current) ENTER_HANDLERS[next]?.();
  current = next;
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
window.addEventListener('resize', render);
document.addEventListener('focusout', snapPageBackAfterKeyboard);
route();

initAutoSync();
