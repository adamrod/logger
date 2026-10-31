import { assertEqual, test } from './harness.js';

const DEPLOYED_AT = 'Sat, 31 Oct 2026 11:48:04 GMT';
const EARLIER_DEPLOY = 'Sat, 31 Oct 2026 11:39:53 GMT';

const workerCode = readFile('sw.js');
const version = Number(workerCode.match(/const VERSION = (\d+);/)[1]);

function installWorker({ deployedAt = () => DEPLOYED_AT, servedWorker = workerCode } = {}) {
  const listeners = {};
  const cached = [];
  const scope = { addEventListener: (type, listener) => { listeners[type] = listener; } };
  const caches = { open: async () => ({ put: async (path) => cached.push(path) }) };
  const fetch = async (path) => ({
    ok: true,
    headers: { get: () => deployedAt(path) },
    text: async () => (path === 'sw.js' ? servedWorker : ''),
  });
  new Function('self', 'caches', 'fetch', workerCode)(scope, caches, fetch);
  let installing;
  listeners.install({ waitUntil: (promise) => { installing = promise; } });
  return installing.then(() => ({ installed: true, cached }), () => ({ installed: false, cached }));
}

test('the worker installs and caches the app when every file is from one deploy', async () => {
  const { installed, cached } = await installWorker();
  assertEqual(installed, true, 'installed');
  assertEqual(cached.includes('index.html') && cached.includes('js/app.js'), true, 'cached app files');
});

test('the worker refuses to install when the server mixes in a file from an earlier deploy', async () => {
  const { installed, cached } = await installWorker({ deployedAt: (path) => (path === 'index.html' ? EARLIER_DEPLOY : DEPLOYED_AT) });
  assertEqual(installed, false, 'installed');
  assertEqual(cached, [], 'cached');
});

test('the worker refuses to install when the server still has another version of it', async () => {
  const servedWorker = workerCode.replace(`const VERSION = ${version};`, `const VERSION = ${version - 1};`);
  const { installed } = await installWorker({ servedWorker });
  assertEqual(installed, false, 'installed');
});
