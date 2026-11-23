import { onChange } from '../js/events.js';
import { formatIsoDate } from '../js/format.js';
import { enterPlan, initPlan, renderPlan } from '../js/plan-screen.js';
import { addWeeks, weekPath, weekStart } from '../js/plan.js';
import { assertEqual, test } from './harness.js';
import { element, handleFetch } from './setup.js';

const path = weekPath(new Date());
const lastWeekPath = weekPath(addWeeks(weekStart(new Date()), -1));
const files = {};
let rejectWrites = false;
let isOpen = false;

const response = (status, body) => ({ status, ok: status < 300, json: async () => body });
const toBase64 = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));
const fromBase64 = (base64) => new TextDecoder().decode(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));

function openPlan() {
  if (isOpen) return;
  isOpen = true;
  handleFetch(async (url, { method = 'GET', body } = {}) => {
    const file = url.split('/contents/')[1];
    if (method === 'PUT' && rejectWrites) return response(409, {});
    if (method === 'PUT') {
      files[file] = fromBase64(JSON.parse(body).content);
      return response(200, { content: { sha: 'saved' } });
    }
    return file in files ? response(200, { content: toBase64(files[file]), sha: 'loaded' }) : response(404, {});
  });
  initPlan();
  onChange(renderPlan);
}

async function settle() {
  for (let tick = 0; tick < 20; tick += 1) await null;
}

function type(text) {
  element('plan-week').value = text;
  element('plan-week').dispatch('input', {});
}

function step(count) {
  const dataset = { action: 'step', step: String(count) };
  element('plan-steps').dispatch('click', { target: { closest: () => ({ dataset }) } });
  return settle();
}

const syncText = () => element('plan-sync-text').textContent;

test('the plan loads this week and shows today', async () => {
  openPlan();
  files[path] = `## ${formatIsoDate(new Date())} Today\nLimit bouldering\n`;
  await enterPlan();
  assertEqual(element('plan-week').value, files[path], 'week');
  assertEqual(element('plan-today').textContent, 'Limit bouldering', 'today');
  assertEqual(element('plan-today-section').hidden, false, 'today shown');
  assertEqual(syncText(), 'Synced');
});

test('an edit waits as not synced, then reaches GitHub', async () => {
  openPlan();
  type('Rest');
  assertEqual(syncText(), 'Not synced', 'before sync');
  await enterPlan();
  assertEqual(files[path], 'Rest', 'remote');
  assertEqual(syncText(), 'Synced', 'after sync');
});

test('an edit rejected because the plan changed elsewhere gives way to the newer plan', async () => {
  openPlan();
  files[path] = 'Newer';
  rejectWrites = true;
  type('Mine');
  await enterPlan();
  rejectWrites = false;
  assertEqual(element('plan-week').value, 'Newer', 'week');
  assertEqual(syncText(), 'Changed elsewhere');
});

test('leaving an edit for another week saves it to its own week, then shows the other one', async () => {
  openPlan();
  files[path] = 'This week';
  files[lastWeekPath] = 'Last week';
  await enterPlan();
  type('This week, edited');
  element('plan-week').dispatch('change', {});
  await step(-1);
  assertEqual(files[path], 'This week, edited', 'this week saved');
  assertEqual(files[lastWeekPath], 'Last week', 'last week untouched');
  assertEqual(element('plan-week').value, 'Last week', 'shown');
  assertEqual(element('plan-today-section').hidden, true, 'today hidden');
  await step(1);
  assertEqual(element('plan-week').value, 'This week, edited', 'back to this week');
});
