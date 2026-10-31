import { entryDate } from './entry-log.js';
import { dayKey, describeSet, escapeHtml, formatDay, roundValue } from './format.js';
import { editAttributes, unsyncedHtml } from './history.js';

const variantOf = (entry) => entry.variant ?? '';

export function historyDays(entries) {
  const days = [...Map.groupBy(entries, (entry) => dayKey(entryDate(entry))).values()];
  return days.toReversed().map((dayEntries) => ({
    date: entryDate(dayEntries[0]),
    rows: [...Map.groupBy(dayEntries, variantOf)].map(([variant, sets]) => ({ variant, sets })),
  }));
}

export function setChipText({ reps, weight }) {
  const rounded = roundValue(weight);
  return rounded === 0 ? String(reps) : `${reps}<span class="set-times">×</span>${rounded}`;
}

export function setHistoryHtml(entries, view) {
  if (!entries.length) return '<p class="empty">No sets logged yet.</p>';
  return `<div class="set-history">${historyDays(entries).map((day) => dayHtml(day, view)).join('')}</div>`;
}

function dayHtml({ date, rows }, view) {
  const day = formatDay(date);
  return `
    <section class="history-day" aria-label="${day}">
      <h3 class="day-label">${day}</h3>
      ${rows.map((row) => rowHtml(row, view)).join('')}
    </section>`;
}

function rowHtml({ variant, sets }, view) {
  return `
    <div class="history-row">
      <span class="set-lead">${escapeHtml(variant)}</span>
      <ul class="set-chips">${sets.map((set) => chipHtml(set, view)).join('')}</ul>
    </div>`;
}

function chipHtml(set, { isUnsynced, editingId }) {
  return `
    <li><button type="button" class="set-chip" ${editAttributes(set, describeSet(set), editingId)}>${setChipText(set)}${unsyncedHtml(set, isUnsynced)}</button></li>`;
}
