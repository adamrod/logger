import { entryDate } from './entry-log.js';
import { dayKey, escapeHtml, formatDay, formatTime } from './format.js';

export function historyHtml(entries, view) {
  if (!entries.length) return `<p class="empty">${view.empty}</p>`;
  const newestFirst = entries.toReversed();
  const columns = `style="--lead-columns: ${view.lead.length}"`;
  return view.flat
    ? `<ul class="entries is-flat" ${columns}>${entriesHtml(newestFirst, view)}</ul>`
    : `<div class="entries" ${columns}>${groupByDay(newestFirst).map((day) => dayHtml(day, view)).join('')}</div>`;
}

export function revealNewest(list) {
  list.scrollTo({ top: 0, behavior: 'smooth' });
  list.querySelector('.set')?.classList.add('is-new');
}

function groupByDay(entries) {
  return [...Map.groupBy(entries, (entry) => dayKey(entryDate(entry))).values()];
}

function dayHtml(entries, view) {
  const day = formatDay(entryDate(entries[0]));
  return `
    <section class="day" aria-label="${day}">
      <h3 class="day-label">${day}</h3>
      <ul>${entriesHtml(entries, view)}</ul>
    </section>`;
}

const entriesHtml = (entries, view) => entries.map((entry) => entryHtml(entry, view)).join('');

function entryHtml(entry, view) {
  const leadHtml = view.lead.map((cell) => `<span class="set-lead">${escapeHtml(cell(entry))}</span>`).join('');
  const isEditing = entry.timestamp === view.editingId;
  return `
    <li class="set">
      <button type="button" class="set-row" data-action="edit" data-id="${escapeHtml(entry.timestamp)}"
        aria-label="Edit ${escapeHtml(view.describe(entry))}, ${whenText(entry)}"${isEditing ? ' aria-current="true"' : ''}>
        ${leadHtml}<span class="set-info"><span class="set-text">${view.valueHtml(entry)}</span>${unsyncedHtml(entry, view)}</span>
        <span class="set-editing">${isEditing ? 'Editing' : ''}</span>
      </button>
    </li>`;
}

function whenText(entry) {
  const date = entryDate(entry);
  return `${formatDay(date)} ${formatTime(date)}`;
}

function unsyncedHtml(entry, { isUnsynced, flat }) {
  if (!isUnsynced(entry)) return '';
  return flat
    ? '<span class="set-unsynced" role="img" aria-label="Not synced"></span>'
    : '<span class="set-unsynced">Not synced</span>';
}
