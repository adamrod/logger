import { enterAnalysis, initAnalysis, renderAnalysis } from './analysis-screen.js';
import { initBodyWeight, renderBodyWeight, revealWeights } from './body-weight-screen.js';
import { enterClimbCalendar, initClimbCalendar, renderClimbCalendar } from './climb-calendar-screen.js';
import { enterClimbProgress, initClimbProgress, renderClimbProgress } from './climb-progress-screen.js';
import { climbPlace, enterClimb, initClimb, renderClimb, revealClimbs } from './climb-screen.js';
import { enterClimbSession, initClimbSession, renderClimbSession } from './climb-session-screen.js';
import { enterDay, initDay, renderDay } from './day-screen.js';
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
  climb: renderClimb,
  'climb-session': renderClimbSession,
  'climb-calendar': renderClimbCalendar,
  'climb-progress': renderClimbProgress,
  settings: renderSettings,
  'body-weight': renderBodyWeight,
  analysis: renderAnalysis,
  day: renderDay,
};
const ENTER_HANDLERS = {
  analysis: enterAnalysis,
  day: enterDay,
  climb: enterClimb,
  'climb-session': enterClimbSession,
  'climb-calendar': enterClimbCalendar,
  'climb-progress': enterClimbProgress,
};
const PARENT_TABS = {
  analysis: 'log',
  day: 'log',
  'climb-session': 'climb',
  'climb-calendar': 'climb',
  'climb-progress': 'climb',
};
const REVEALERS = { log: revealSets, climb: revealClimbs, 'body-weight': revealWeights };

let current = null;
let enteredHash = null;

function route() {
  const [name, param] = location.hash.slice(1).split('/');
  const next = name in RENDERERS ? name : 'log';
  if (next !== current || location.hash !== enteredHash) ENTER_HANDLERS[next]?.(param);
  current = next;
  enteredHash = location.hash;
  const currentTab = PARENT_TABS[current] ?? current;
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.hidden = screen.id !== `screen-${current}`;
  });
  document.querySelectorAll('.top-bar a').forEach((tab) => {
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
initClimb();
initClimbSession();
initClimbCalendar();
initClimbProgress();
initBodyWeight();
initAnalysis();
initDay();
initSettings();
initSyncStatus();
initUndoButtons(showReplayed);
trackPlace(() => ({ screen: current, exercise: currentExercise(), ...climbPlace() }));
onChange(render);
window.addEventListener('hashchange', route);
window.addEventListener('resize', render);
document.addEventListener('focusout', snapPageBackAfterKeyboard);
document.addEventListener('touchstart', letIosShowPressedButtons, { passive: true });
route();

initAutoSync();
initKeepAwake();
