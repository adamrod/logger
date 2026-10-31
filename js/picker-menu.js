import { onAction } from './events.js';
import { escapeHtml } from './format.js';

const NO_MATCHES = '<li class="option-empty">No matches</li>';
const SCREEN_EDGE_GAP = 8;

export const matchingNames = (names, query) => names.filter((name) => name.toLowerCase().includes(query.trim().toLowerCase()));

export const isNewName = (names, query) => query.trim() !== ''
  && !names.some((name) => name.toLowerCase() === query.trim().toLowerCase());

export function createPickerMenu(id, { names, onPick, onAdd = null, actions = {}, extrasHtml = () => '', onClose = () => {} }) {
  const picker = document.getElementById(`${id}-picker`);
  const toggleButton = document.getElementById(`${id}-button`);
  const menu = document.getElementById(`${id}-menu`);
  const searchForm = document.getElementById(`${id}-search`);
  const queryInput = document.getElementById(`${id}-query`);
  const optionsEl = document.getElementById(`${id}-options`);

  let current = null;
  let isOpen = false;

  onAction([picker], {
    ...actions,
    toggle: () => { if (isOpen) close(); else isOpen = true; render(); },
    pick: ({ name }) => choose(onPick, name),
    add: ({ name }) => choose(onAdd, name),
  });
  queryInput.addEventListener('input', renderOptions);
  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = queryInput.value.trim();
    const [first] = matchingNames(names(), query);
    if (!query) return;
    if (first) choose(onPick, first);
    else if (onAdd) choose(onAdd, query);
  });
  document.addEventListener('click', (event) => {
    if (isOpen && !event.composedPath().includes(picker)) { close(); render(); }
  });
  window.visualViewport?.addEventListener('resize', fitAboveKeyboard);

  function choose(handler, name) {
    close();
    handler(name);
  }

  function close() {
    isOpen = false;
    queryInput.value = '';
    queryInput.blur();
    onClose();
  }

  function render() {
    toggleButton.textContent = current ?? '';
    toggleButton.setAttribute('aria-expanded', isOpen);
    menu.hidden = !isOpen;
    fitAboveKeyboard();
    renderOptions();
  }

  function fitAboveKeyboard() {
    if (!isOpen) return;
    const visible = window.visualViewport;
    const visibleBottom = visible ? visible.offsetTop + visible.height : window.innerHeight;
    const room = visibleBottom - menu.getBoundingClientRect().top - SCREEN_EDGE_GAP;
    menu.style.maxHeight = `${Math.min(window.innerHeight / 2, room)}px`;
  }

  function renderOptions() {
    const query = queryInput.value;
    const matches = matchingNames(names(), query);
    const addHtml = onAdd && isNewName(names(), query) ? addOptionHtml(query.trim()) : '';
    optionsEl.innerHTML = (matches.length || addHtml ? matches.map(optionHtml).join('') : NO_MATCHES) + addHtml;
  }

  function optionHtml(name) {
    const value = escapeHtml(name);
    return `
      <li class="option">
        <button type="button" class="option-pick" data-action="pick" data-name="${value}"
          aria-current="${name === current}">${value}</button>
        ${extrasHtml(name)}
      </li>`;
  }

  function addOptionHtml(name) {
    const value = escapeHtml(name);
    return `<li><button type="button" class="option-new" data-action="add" data-name="${value}">+ Add “${value}”</button></li>`;
  }

  return {
    render: (name) => { current = name; render(); },
    close,
  };
}
