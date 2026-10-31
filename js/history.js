import { entryDate } from './entry-log.js';
import { escapeHtml, formatDay, formatTime } from './format.js';

export function historyHtml(entries, view) {
  if (!entries.length) return `<p class="empty">${view.empty}</p>`;
  const columns = `style="--lead-columns: ${view.lead.length}"`;
  return `<ul class="entries" ${columns}>${entries.toReversed().map((entry) => entryHtml(entry, view)).join('')}</ul>`;
}

export function revealNewest(list, newest) {
  list.scrollTo({ top: 0, behavior: 'smooth' });
  list.querySelector(`[data-id="${newest.timestamp}"]`)?.classList.add('is-new');
}

export function editAttributes(entry, description, editingId) {
  const current = entry.timestamp === editingId ? ' aria-current="true"' : '';
  return `data-action="edit" data-id="${escapeHtml(entry.timestamp)}"
    aria-label="Edit ${escapeHtml(description)}, ${whenText(entry)}"${current}`;
}

export const unsyncedHtml = (entry, isUnsynced) => (isUnsynced(entry)
  ? '<span class="set-unsynced" role="img" aria-label="Not synced"></span>'
  : '');

function entryHtml(entry, view) {
  const leadHtml = view.lead.map((cell) => `<span class="set-lead">${escapeHtml(cell(entry))}</span>`).join('');
  const isEditing = entry.timestamp === view.editingId;
  return `
    <li class="set">
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
