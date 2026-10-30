function createSignal() {
  const listeners = [];
  return {
    listen: (listener) => listeners.push(listener),
    notify: () => listeners.forEach((listener) => listener()),
  };
}

const changes = createSignal();
const edits = createSignal();

export const onChange = changes.listen;
export const notifyChange = changes.notify;

export const onEdit = edits.listen;
export const notifyEdit = edits.notify;

export function onAction(containers, actions) {
  containers.forEach((container) => container.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (button) actions[button.dataset.action](button.dataset);
  }));
}
