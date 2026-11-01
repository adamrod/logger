import { enterAnalysis, initAnalysis, renderAnalysis } from './analysis-screen.js';
import { initBodyWeight, renderBodyWeight, revealWeights } from './body-weight-screen.js';
import { onChange } from './events.js';
import { forgetLoggedNames } from './exercises.js';
import { initKeepAwake } from './keep-awake.js';
import { currentExercise, initLog, renderLog, revealSets } from './log-screen.js';
import { initSettings, renderSettings } from './settings-screen.js';
import { initAutoSync } from './sync.js';
import { initSyncStatus, renderSyncStatus } from './sync-status.js';
import { trackPlace } from './undo.js';
import { initUndoButtons, renderUndoButtons } from './undo-buttons.js';

const RENDERERS = {
  log: renderLog,
  settings: renderSettings,
  'body-weight': renderBodyWeight,
  analysis: renderAnalysis,
};
const ENTER_HANDLERS = { analysis: enterAnalysis };
const PARENT_TABS = { analysis: 'log' };
const REVEALERS = { log: revealSets, 'body-weight': revealWeights };

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
  renderUndoButtons();
}

async function showReplayed(step) {
  goTo(step.place.screen);
  const reveal = REVEALERS[current];
  if (reveal) await reveal(step);
  else step.apply();
}

function goTo(screen) {
  if (screen === current) return;
  history.pushState(null, '', `#${screen}`);
  route();
}

function letIosShowPressedButtons() {}

function snapPageBackAfterKeyboard() {
  window.scrollTo(0, 0);
}

forgetLoggedNames();
initLog();
initBodyWeight();
initAnalysis();
initSettings();
initSyncStatus();
initUndoButtons(showReplayed);
trackPlace(() => ({ screen: current, exercise: currentExercise() }));
onChange(render);
window.addEventListener('hashchange', route);
window.addEventListener('resize', render);
document.addEventListener('focusout', snapPageBackAfterKeyboard);
document.addEventListener('touchstart', letIosShowPressedButtons, { passive: true });
route();

initAutoSync();
initKeepAwake();
