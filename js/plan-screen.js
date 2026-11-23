import { notifyChange } from './events.js';
import { isConflict, readFile, writeFile } from './github.js';
import { dayPlan, weekPath } from './plan.js';
import { getSettings, isSyncConfigured } from './settings.js';

const STORAGE_KEY = 'logger.plan';

const todayEl = document.getElementById('plan-today');
const weekInput = document.getElementById('plan-week');
const syncEl = document.getElementById('plan-sync');
const syncText = document.getElementById('plan-sync-text');
const syncButton = document.getElementById('plan-sync-button');

let plan = { path: '', text: '', draft: null, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
let syncing = false;
let problem = null;

export function initPlan() {
  weekInput.addEventListener('input', () => keep({ ...plan, draft: weekInput.value === plan.text ? null : weekInput.value }));
  weekInput.addEventListener('change', syncPlan);
  syncButton.addEventListener('click', syncPlan);
}

export function enterPlan() {
  const path = weekPath(new Date());
  if (plan.path !== path) keep({ path, text: '', draft: null });
  weekInput.value = plan.draft ?? plan.text;
  return syncPlan();
}

export function renderPlan() {
  const { text, isSynced = false, canSync = false } = currentStatus();
  todayEl.textContent = dayPlan(plan.text, new Date()) || 'Nothing planned';
  weekInput.disabled = syncing;
  syncEl.hidden = !isSyncConfigured();
  syncEl.classList.toggle('is-synced', isSynced);
  syncEl.classList.toggle('is-failed', Boolean(problem));
  syncText.textContent = text;
  syncButton.hidden = !canSync;
}

function currentStatus() {
  if (syncing) return { text: 'Syncing…' };
  if (problem) return { text: problem, canSync: true };
  if (plan.draft !== null) return { text: 'Not synced', canSync: true };
  return { text: 'Synced', isSynced: true };
}

async function syncPlan() {
  if (!isSyncConfigured() || syncing) return;
  syncing = true;
  problem = null;
  notifyChange();
  try {
    if (plan.draft === null) await load();
    else await save();
  } catch {
    problem = navigator.onLine ? 'Sync failed' : 'Offline';
  }
  syncing = false;
  notifyChange();
}

async function load() {
  const file = await readFile(getSettings(), plan.path);
  keep({ path: plan.path, text: file?.text ?? '', sha: file?.sha, draft: null });
  weekInput.value = plan.text;
}

async function save() {
  try {
    const response = await writeFile(getSettings(), plan.path, plan.draft, plan.sha);
    keep({ ...plan, text: plan.draft, sha: response.content.sha, draft: null });
  } catch (error) {
    if (!isConflict(error)) throw error;
    await load();
    problem = 'Changed elsewhere';
  }
}

function keep(next) {
  plan = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  notifyChange();
}
