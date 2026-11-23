import { notifyChange } from './events.js';
import { isConflict, readFile, writeFile } from './github.js';
import { dayPlan, weekPath } from './plan.js';
import { getSettings, isSyncConfigured } from './settings.js';

const STORAGE_KEY = 'logger.plan';
const CONFLICT_MESSAGE = 'Changed on GitHub. Reopen Plan to load it.';

const todayEl = document.getElementById('plan-today');
const weekInput = document.getElementById('plan-week');
const statusEl = document.getElementById('plan-status');
const saveButton = document.getElementById('plan-save');

let plan = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') ?? { path: '', text: '' };
let status = '';
let busy = false;

export function initPlan() {
  saveButton.addEventListener('click', save);
}

export async function enterPlan() {
  const path = weekPath(new Date());
  if (plan.path !== path) keep({ path, text: '' });
  weekInput.value = plan.text;
  if (!isSyncConfigured()) {
    setStatus('Add a token to load the plan');
    return;
  }
  await run('Loading…', async () => {
    const file = await readFile(getSettings(), path);
    keep({ path, text: file?.text ?? '', sha: file?.sha });
    weekInput.value = plan.text;
  });
}

export function renderPlan() {
  todayEl.textContent = dayPlan(plan.text, new Date()) || 'Nothing planned';
  statusEl.textContent = status;
  weekInput.disabled = busy;
  saveButton.disabled = busy || !isSyncConfigured();
}

async function save() {
  const text = weekInput.value;
  await run('Saving…', async () => {
    const response = await writeFile(getSettings(), plan.path, text, plan.sha);
    keep({ ...plan, text, sha: response.content.sha });
  }, 'Saved');
}

async function run(progress, action, done = '') {
  busy = true;
  setStatus(progress);
  try {
    await action();
    status = done;
  } catch (error) {
    status = isConflict(error) ? CONFLICT_MESSAGE : error.message;
  }
  busy = false;
  notifyChange();
}

function keep(next) {
  plan = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

function setStatus(text) {
  status = text;
  notifyChange();
}
