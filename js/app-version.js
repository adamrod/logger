const versionEl = document.getElementById('app-version');

export function initAppVersion() {
  const workers = navigator.serviceWorker;
  if (!workers) return;
  const running = workers.controller ? askVersion(workers.controller) : Promise.resolve(null);
  running.then((version) => { if (version !== null) showRunning(version); });
  workers.addEventListener('controllerchange', async () => {
    const [current, latest] = await Promise.all([running, askVersion(workers.controller)]);
    if (current === null) showRunning(latest);
    else if (latest !== current) reloadWhenIdle();
  });
  workers.register('sw.js', { updateViaCache: 'none' }).then(activateUpdates);
}

function activateUpdates(registration) {
  if (registration.waiting) activate(registration.waiting);
  if (registration.installing) activateWhenInstalled(registration.installing);
  registration.addEventListener('updatefound', () => activateWhenInstalled(registration.installing));
}

function activateWhenInstalled(worker) {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') activate(worker);
  });
}

function activate(worker) {
  worker.postMessage('activate');
}

function askVersion(worker) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => resolve(event.data);
    worker.postMessage('version', [channel.port2]);
  });
}

function showRunning(version) {
  versionEl.textContent = `Version ${version}`;
}

function reloadWhenIdle() {
  if (!document.activeElement?.matches('input, textarea, select')) return location.reload();
  document.addEventListener('visibilitychange', () => location.reload(), { once: true });
}
