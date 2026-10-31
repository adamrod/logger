import { entryDate } from './entry-log.js';
import { dayKey, daysBetween, describeSet, escapeHtml, formatDay, roundValue } from './format.js';
import { editAttributes, unsyncedHtml } from './history.js';

const variantOf = (entry) => entry.variant ?? '';

export function historyDays(entries) {
  const days = [...Map.groupBy(entries, (entry) => dayKey(entryDate(entry))).values()].map((dayEntries) => ({
    date: entryDate(dayEntries[0]),
    rows: [...Map.groupBy(dayEntries, variantOf)].map(([variant, sets]) => ({ variant, sets })),
  }));
  return days.map((day, i) => ({ ...day, gap: i === 0 ? null : daysBetween(days[i - 1].date, day.date) })).toReversed();
}

export function setChipText({ reps, weight }) {
  const rounded = roundValue(weight);
  return rounded === 0 ? String(reps) : `${reps}<span class="set-times">×</span>${rounded}`;
}

export function setHistoryHtml(entries, view) {
  if (!entries.length) return '<p class="empty">No sets logged yet.</p>';
  return `<div class="set-history">${historyDays(entries).map((day) => dayHtml(day, view)).join('')}</div>`;
}

function dayHtml({ date, gap, rows }, view) {
  return `
    <section class="history-day">
      <span class="history-date">${formatDay(date)}</span>
      <span class="set-days history-gap">${gap === null ? '' : `${gap}d`}</span>
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
