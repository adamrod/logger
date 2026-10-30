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
  const date = entryDate(entry);
  const label = `${escapeHtml(view.describe(entry))}, ${formatDay(date)} ${formatTime(date)}`;
  const leadHtml = view.lead.map((cell) => `<span class="set-lead">${escapeHtml(cell(entry))}</span>`).join('');
  return `
    <li class="set">
      ${leadHtml}<span class="set-info"><span class="set-text">${view.valueHtml(entry)}</span>${unsyncedHtml(entry, view)}</span>
      <span class="set-actions">${actionsHtml(entry.timestamp, label, view)}</span>
    </li>`;
}

function unsyncedHtml(entry, { isUnsynced, flat }) {
  if (!isUnsynced(entry)) return '';
  return flat
    ? '<span class="set-unsynced" role="img" aria-label="Not synced"></span>'
    : '<span class="set-unsynced">Not synced</span>';
}

function actionsHtml(id, label, { editingId, confirmingId }) {
  if (id === editingId) return '<span class="set-editing">Editing</span>';
  if (id === confirmingId) {
    return actionButton('cancel-delete', id, 'Cancel', 'Cancel delete')
      + actionButton('confirm-delete', id, 'Confirm', `Confirm delete ${label}`, 'is-strong');
  }
  return actionButton('edit', id, 'Edit', `Edit ${label}`) + actionButton('delete', id, 'Delete', `Delete ${label}`);
}

function actionButton(action, id, text, label, modifier = '') {
  return `<button type="button" class="btn-text ${modifier}" data-action="${action}" data-id="${escapeHtml(id)}"
    aria-label="${label}">${text}</button>`;
}
