const versionEl = document.getElementById('app-version');

export function initAppVersion() {
  const workers = navigator.serviceWorker;
  if (!workers) return;
  const running = workers.controller ? askVersion(workers.controller) : Promise.resolve(null);
  running.then((version) => { if (version !== null) showRunning(version); });
  workers.addEventListener('controllerchange', async () => {
    const [current, latest] = await Promise.all([running, askVersion(workers.controller)]);
    if (current === null) showRunning(latest);
    else if (latest !== current) showUpdateReady(current, latest);
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

function showUpdateReady(current, latest) {
  versionEl.innerHTML = `Version ${current} · <button type="button" class="update-btn">Update to version ${latest}</button>`;
  versionEl.querySelector('button').addEventListener('click', () => location.reload());
}
