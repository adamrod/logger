import { onChange } from '../js/events.js';
import { formatIsoDate } from '../js/format.js';
import { enterPlan, initPlan, renderPlan } from '../js/plan-screen.js';
import { weekPath } from '../js/plan.js';
import { assertEqual, test } from './harness.js';
import { element, handleFetch } from './setup.js';

const path = weekPath(new Date());
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

function type(text) {
  element('plan-week').value = text;
  element('plan-week').dispatch('input', {});
}

const syncText = () => element('plan-sync-text').textContent;

test('the plan loads this week and shows today', async () => {
  openPlan();
  files[path] = `## ${formatIsoDate(new Date())} Today\nLimit bouldering\n`;
  await enterPlan();
  assertEqual(element('plan-week').value, files[path], 'week');
  assertEqual(element('plan-today').textContent, 'Limit bouldering', 'today');
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
