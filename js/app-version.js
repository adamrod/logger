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
