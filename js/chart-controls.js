import { entryDate } from './entry-log.js';
import { onAction } from './events.js';
import { formatIsoDate, parseDateValue } from './format.js';

const DAY_MS = 86400000;
const RANGE_DAYS = { '1M': 30, '3M': 91, '1Y': 365, All: Infinity };

export function markPressed(group, key, value) {
  group.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', button.dataset[key] === value));
}

export function createRangePicker(prefix, onPick) {
  const group = document.getElementById(`${prefix}-ranges`);
  const customRow = document.getElementById(`${prefix}-custom`);
  const fromInput = document.getElementById(`${prefix}-from`);
  const toInput = document.getElementById(`${prefix}-to`);
  let range = 'All';
  let from = '';
  let to = '';
  let firstShown = null;

  function pick(name) {
    if (name === 'Custom' && range !== 'Custom') startCustom();
    range = name;
    onPick();
  }

  function startCustom() {
    to = formatIsoDate(new Date());
    from = formatIsoDate(firstShown ?? new Date());
  }

  function changeFrom() {
    if (fromInput.value) from = fromInput.value;
    if (from > to) to = from;
    onPick();
  }

  function changeTo() {
    if (toInput.value) to = toInput.value;
    if (to < from) from = to;
    onPick();
  }

  function bounds() {
    if (range !== 'Custom') return [Date.now() - RANGE_DAYS[range] * DAY_MS, Infinity];
    return [parseDateValue(from).getTime(), parseDateValue(to).getTime() + DAY_MS];
  }

  function filter(entries) {
    const [start, end] = bounds();
    const shown = entries.filter((entry) => entryDate(entry).getTime() >= start && entryDate(entry).getTime() < end);
    firstShown = shown.length ? entryDate(shown[0]) : null;
    return shown;
  }

  function show() {
    markPressed(group, 'range', range);
    customRow.hidden = range !== 'Custom';
    fromInput.value = from;
    toInput.value = to;
    fromInput.max = to;
    toInput.min = from;
    toInput.max = formatIsoDate(new Date());
  }

  onAction([group], { range: ({ range: name }) => pick(name) });
  fromInput.addEventListener('change', changeFrom);
  toInput.addEventListener('change', changeTo);
  return { filter, show };
}
