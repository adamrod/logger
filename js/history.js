import { entryDate } from './entry-log.js';
import { escapeHtml, formatDay, formatTime, isToday } from './format.js';

const LEAVE_MS = 400;

const partsOf = ({ parts }, log) => parts.filter((part) => part.target === log);

const rowsOf = (list, entries) => entries.map((entry) => list.querySelector(`[data-id="${entry.timestamp}"]`)).filter(Boolean);

export function historyHtml(entries, view) {
  if (!entries.length) return `<p class="empty">${view.empty}</p>`;
  const columns = `style="--lead-columns: ${view.lead.length}"`;
  return `<ul class="entries" ${columns}>${entries.toReversed().map((entry) => entryHtml(entry, view)).join('')}</ul>`;
}

export function revealNewest(list, newest) {
  list.scrollTo({ top: 0, behavior: 'smooth' });
  list.querySelector(`[data-id="${newest.timestamp}"]`)?.classList.add('is-new');
}

export const arrivingEntries = (step, log) => partsOf(step, log).flatMap((part) => part.to);

export const leavingEntries = (step, log) => partsOf(step, log)
  .flatMap(({ from, to }) => from.filter((entry) => !to.some((kept) => kept.timestamp === entry.timestamp)));

export function revealEntries(list, entries) {
  const rows = rowsOf(list, entries);
  rows.forEach((row) => row.classList.add('is-new'));
  if (rows.length) scrollIntoList(list, rows.at(-1));
}

export async function fadeOutEntries(list, entries) {
  const rows = rowsOf(list, entries);
  if (!rows.length) return;
  rows.forEach((row) => row.classList.add('is-leaving'));
  scrollIntoList(list, rows.at(-1));
  await new Promise((resolve) => { setTimeout(resolve, LEAVE_MS); });
}

export function editAttributes(entry, description, editingId) {
  const current = entry.timestamp === editingId ? ' aria-current="true"' : '';
  return `data-action="edit" data-id="${escapeHtml(entry.timestamp)}"
    aria-label="Edit ${escapeHtml(description)}, ${whenText(entry)}"${current}`;
}

export const unsyncedHtml = (entry, isUnsynced) => (isUnsynced(entry)
  ? '<span class="set-unsynced" role="img" aria-label="Not synced"></span>'
  : '');

export const currentDateAttribute = (date) => (isToday(date) ? ' aria-current="date"' : '');

function entryHtml(entry, view) {
  const leadHtml = view.lead.map((cell) => `<span class="set-lead">${escapeHtml(cell(entry))}</span>`).join('');
  const isEditing = entry.timestamp === view.editingId;
  return `
    <li class="set"${currentDateAttribute(entryDate(entry))}>
      <button type="button" class="set-row" ${editAttributes(entry, view.describe(entry), view.editingId)}>
        ${leadHtml}<span class="set-info"><span class="set-text">${view.valueHtml(entry)}</span>${unsyncedHtml(entry, view.isUnsynced)}</span>
        <span class="set-editing">${isEditing ? 'Editing' : ''}</span>
      </button>
    </li>`;
}

function whenText(entry) {
  const date = entryDate(entry);
  return `${formatDay(date)} ${formatTime(date)}`;
}

function scrollIntoList(list, row) {
  const top = row.getBoundingClientRect().top - list.getBoundingClientRect().top;
  const isOutside = top < 0 || top + row.offsetHeight > list.clientHeight;
  if (isOutside) list.scrollBy({ top: top - list.clientHeight / 2, behavior: 'smooth' });
}
