import { personalRecords } from './analysis.js';
import { entryDate } from './entry-log.js';
import { dayKey, daysBetween, describeSet, escapeHtml, formatDay, roundValue } from './format.js';
import { currentDateAttribute, editAttributes, unsyncedHtml } from './history.js';

const variantOf = (entry) => entry.variant ?? '';

const toDay = (dayEntries) => ({
  date: entryDate(dayEntries[0]),
  rows: [...Map.groupBy(dayEntries, variantOf)].map(([variant, sets]) => ({ variant, sets })),
});

const gapSince = (previous, day) => (previous ? daysBetween(previous.date, day.date) : null);

export function historyDays(entries) {
  const days = [...Map.groupBy(entries, (entry) => dayKey(entryDate(entry))).values()].map(toDay);
  return days.map((day, i) => ({ ...day, gap: gapSince(days[i - 1], day) })).toReversed();
}

export const daysSinceLast = (days, today) => Math.max(0, daysBetween(days[0].date, today));

export function setChipText({ reps, weight }) {
  const rounded = roundValue(weight);
  return rounded === 0 ? String(reps) : `${reps}<span class="set-times">×</span>${rounded}`;
}

export function setHistoryHtml(entries, view) {
  const shown = view.variant ? entries.filter((entry) => variantOf(entry) === view.variant) : entries;
  if (!shown.length) return '<p class="empty">No sets logged yet.</p>';
  const days = historyDays(shown);
  const dayView = { ...view, records: personalRecords(shown) };
  return `<div class="set-history">${sinceLastHtml(daysSinceLast(days, new Date()))}${days.map((day) => dayHtml(day, dayView)).join('')}</div>`;
}

const sinceLastHtml = (days) => (days === 0 ? '' : `<div class="history-since"><span class="history-gap">${days}d</span></div>`);

function dayHtml({ date, gap, rows }, view) {
  return `
    <section class="history-day"${currentDateAttribute(date)}>
      <span class="history-date">${formatDay(date)}</span>
      ${rows.map((row) => rowHtml(row, view)).join('')}
      ${gap === null ? '' : `<span class="history-gap">${gap}d</span>`}
    </section>`;
}

function rowHtml({ variant, sets }, view) {
  return `
    <div class="history-row">
      <span class="set-lead">${view.variant ? '' : escapeHtml(variant)}</span>
      <ul class="set-chips">${sets.map((set) => chipHtml(set, view)).join('')}</ul>
    </div>`;
}

const recordHtml = (isRecord) => (isRecord ? '<span class="set-record">PR</span>' : '');

function chipHtml(set, { isUnsynced, editingId, records }) {
  const isRecord = records.has(set);
  const description = isRecord ? `${describeSet(set)}, personal record` : describeSet(set);
  const content = `${setChipText(set)}${recordHtml(isRecord)}${unsyncedHtml(set, isUnsynced)}`;
  return `
    <li><button type="button" class="set-chip" ${editAttributes(set, description, editingId)}>${content}</button></li>`;
}
