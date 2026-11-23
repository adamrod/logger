import { notifyChange, onAction } from './events.js';
import { formatShortDay } from './format.js';
import { isConflict, readFile, writeFile } from './github.js';
import { addWeeks, dayPlan, weekPath, weekStart } from './plan.js';
import { getSettings, isSyncConfigured } from './settings.js';

const STORAGE_KEY = 'logger.plans';
const EMPTY_PLAN = { text: '', draft: null };

const titleEl = document.getElementById('plan-title');
const stepsEl = document.getElementById('plan-steps');
const thisWeekButton = document.getElementById('plan-this-week');
const todaySection = document.getElementById('plan-today-section');
const todayEl = document.getElementById('plan-today');
const weekInput = document.getElementById('plan-week');
const syncEl = document.getElementById('plan-sync');
const syncText = document.getElementById('plan-sync-text');
const syncButton = document.getElementById('plan-sync-button');

let plans = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
let monday = weekStart(new Date());
let syncing = false;
let problem = null;

const shownPath = () => weekPath(monday);
const planAt = (path) => ({ ...EMPTY_PLAN, ...plans[path] });
const isThisWeek = () => shownPath() === weekPath(new Date());

export function initPlan() {
  weekInput.addEventListener('input', editPlan);
  weekInput.addEventListener('change', syncPlan);
  syncButton.addEventListener('click', syncPlan);
  onAction([stepsEl], {
    step: ({ step }) => showWeek(addWeeks(monday, Number(step))),
    'this-week': () => showWeek(weekStart(new Date())),
  });
}

export function enterPlan() {
  return showWeek(weekStart(new Date()));
}

export function renderPlan() {
  const { text, isSynced = false, canSync = false } = currentStatus();
  titleEl.textContent = `Week of ${formatShortDay(monday)}`;
  thisWeekButton.disabled = isThisWeek();
  todaySection.hidden = !isThisWeek();
  todayEl.textContent = dayPlan(planAt(shownPath()).text, new Date()) || 'Nothing planned';
  weekInput.disabled = syncing;
  syncEl.hidden = !isSyncConfigured();
  syncEl.classList.toggle('is-synced', isSynced);
  syncEl.classList.toggle('is-failed', Boolean(problem));
  syncText.textContent = text;
  syncButton.hidden = !canSync;
}

function showWeek(nextMonday) {
  monday = nextMonday;
  problem = null;
  showText();
  return syncPlan();
}

function showText() {
  const plan = planAt(shownPath());
  weekInput.value = plan.draft ?? plan.text;
  notifyChange();
}

function editPlan() {
  const path = shownPath();
  const plan = planAt(path);
  keep(path, { ...plan, draft: weekInput.value === plan.text ? null : weekInput.value });
}

function currentStatus() {
  if (syncing) return { text: 'Syncing…' };
  if (problem) return { text: problem, canSync: true };
  if (planAt(shownPath()).draft !== null) return { text: 'Not synced', canSync: true };
  return { text: 'Synced', isSynced: true };
}

async function syncPlan() {
  if (!isSyncConfigured() || syncing) return;
  syncing = true;
  notifyChange();
  let path;
  do {
    path = shownPath();
    problem = null;
    try {
      await syncWeek(path);
    } catch {
      problem = navigator.onLine ? 'Sync failed' : 'Offline';
    }
  } while (path !== shownPath());
  syncing = false;
  showText();
}

async function syncWeek(path) {
  const plan = planAt(path);
  if (plan.draft === null) return load(path);
  try {
    const response = await writeFile(getSettings(), path, plan.draft, plan.sha);
    keep(path, { text: plan.draft, sha: response.content.sha, draft: null });
  } catch (error) {
    if (!isConflict(error)) throw error;
    await load(path);
    problem = 'Changed elsewhere';
  }
}

async function load(path) {
  const file = await readFile(getSettings(), path);
  keep(path, { text: file?.text ?? '', sha: file?.sha, draft: null });
}

function keep(path, plan) {
  plans = { ...plans, [path]: plan };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  notifyChange();
}
