import { entryDate } from './entry-log.js';
import { dayKey, escapeHtml, formatDay, formatTime } from './format.js';

export function historyHtml(entries, view) {
  return entries.length
    ? groupByDay(entries.toReversed()).map((day) => dayHtml(day, view)).join('')
    : `<p class="empty">${view.empty}</p>`;
}

function groupByDay(entries) {
  return [...Map.groupBy(entries, (entry) => dayKey(entryDate(entry))).values()];
}

function dayHtml(entries, view) {
  const day = formatDay(entryDate(entries[0]));
  return `
    <section class="day" aria-label="${day}">
      <h3 class="day-label">${day}</h3>
      <ul>${entries.map((entry) => entryHtml(entry, view)).join('')}</ul>
    </section>`;
}

function entryHtml(entry, view) {
  const text = escapeHtml(view.describe(entry));
  const date = entryDate(entry);
  const time = formatTime(date);
  const timeHtml = view.showTime ? `<span class="set-time">${time}</span>` : '';
  const unsynced = view.isUnsynced(entry) ? '<span class="set-unsynced">Not synced</span>' : '';
  return `
    <li class="set">
      <span class="set-info"><span class="set-text">${text}</span>${timeHtml}${unsynced}</span>
      <span class="set-actions">${actionsHtml(entry.timestamp, `${text}, ${formatDay(date)} ${time}`, view)}</span>
    </li>`;
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
