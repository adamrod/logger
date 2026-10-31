import { onAction } from './events.js';
import { escapeHtml } from './format.js';

const NO_MATCHES = '<li class="option-empty">No matches</li>';
const SCREEN_EDGE_GAP = 8;

const normalized = (text) => text.trim().toLowerCase();

export const matchingNames = (names, query) => names.filter((name) => normalized(name).includes(normalized(query)));

export const isNewName = (names, query) => normalized(query) !== ''
  && !names.some((name) => normalized(name) === normalized(query));

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
    toggle: () => (isOpen ? closeAndRender() : open()),
    pick: ({ name }) => choose(onPick, name),
    add: ({ name }) => choose(onAdd, name),
  });
  queryInput.addEventListener('input', renderOptions);
  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = queryInput.value.trim();
    if (!query) return;
    const [first] = matchingNames(names(), query);
    if (first) choose(onPick, first);
    else if (onAdd) choose(onAdd, query);
  });
  document.addEventListener('click', (event) => {
    if (isOpen && !event.composedPath().includes(picker)) closeAndRender();
  });
  window.visualViewport?.addEventListener('resize', fitAboveKeyboard);

  function choose(handler, name) {
    close();
    handler(name);
  }

  function open() {
    isOpen = true;
    render();
    queryInput.focus();
  }

  function closeAndRender() {
    close();
    render();
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
    const all = names();
    const addHtml = onAdd && isNewName(all, query) ? addOptionHtml(query.trim()) : '';
    const rows = matchingNames(all, query).map(optionHtml).join('') + addHtml;
    optionsEl.innerHTML = rows || NO_MATCHES;
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
