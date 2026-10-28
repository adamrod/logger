const listeners = [];

export const onChange = (listener) => listeners.push(listener);

export const notifyChange = () => listeners.forEach((listener) => listener());

export function onAction(containers, actions) {
  containers.forEach((container) => container.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (button) actions[button.dataset.action](button.dataset);
  }));
}
