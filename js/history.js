import { entryDate } from './entry-log.js';
import { dayKey, escapeHtml, formatDay, formatTime } from './format.js';

export function historyHtml(entries, view) {
  if (!entries.length) return `<p class="empty">${view.empty}</p>`;
  const newestFirst = entries.toReversed();
  return view.flat
    ? `<ul class="entries">${entriesHtml(newestFirst, view)}</ul>`
    : groupByDay(newestFirst).map((day) => dayHtml(day, view)).join('');
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
  const text = escapeHtml(view.describe(entry));
  const date = entryDate(entry);
  const day = formatDay(date);
  const time = formatTime(date);
  const whenHtml = view.flat ? `<span class="set-time">${day}</span><span class="set-time">${time}</span>` : '';
  return `
    <li class="set">
      ${whenHtml}<span class="set-info"><span class="set-text">${text}</span>${unsyncedHtml(entry, view)}</span>
      <span class="set-actions">${actionsHtml(entry.timestamp, `${text}, ${day} ${time}`, view)}</span>
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
