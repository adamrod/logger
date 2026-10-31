const VERSION = 31;
const CACHE = `logger-v${VERSION}`;
const APP_SHELL = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/analysis.js',
  'js/analysis-screen.js',
  'js/app-version.js',
  'js/app.js',
  'js/body-weight-chart.js',
  'js/body-weight-screen.js',
  'js/chart-controls.js',
  'js/csv.js',
  'js/entry-editor.js',
  'js/entry-log.js',
  'js/events.js',
  'js/exercises.js',
  'js/exercise-picker.js',
  'js/format.js',
  'js/github.js',
  'js/history.js',
  'js/line-chart.js',
  'js/log-screen.js',
  'js/name-list.js',
  'js/number-field.js',
  'js/rest-timer.js',
  'js/settings-screen.js',
  'js/set-history.js',
  'js/settings.js',
  'js/store.js',
  'js/sync.js',
  'js/sync-status.js',
  'js/variant-picker.js',
  'js/when-field.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  const freshShell = APP_SHELL.map((path) => `${path}?v=${VERSION}`);
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(freshShell)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  event.respondWith(fromThisVersion(request));
});

self.addEventListener('message', (event) => {
  if (event.data === 'version') event.ports[0].postMessage(VERSION);
  if (event.data === 'activate') self.skipWaiting();
});

async function fromThisVersion(request) {
  const cache = await caches.open(CACHE);
  return (await cache.match(request, { ignoreSearch: true })) ?? fetch(request);
}
