import { addMonths, calendarDays, monthValue, parseMonthValue, startOfMonth } from './calendar.js';
import { onAction } from './events.js';
import { dayKey, escapeHtml, formatLongDay, formatMonthYear, formatWeekday, isToday } from './format.js';

const WEEK_FROM_MONDAY = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i));
const CHEVRON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

const shortWeekday = (date) => formatWeekday(date).slice(0, 2);

export function createMonthCalendar(route, { entriesIn, latestDate, summary }) {
  const part = (name) => document.getElementById(`${route}-${name}`);
  const stepsEl = part('steps');
  const todayButton = part('today');
  const titleEl = part('title');
  const summaryEl = part('summary');
  const gridEl = part('grid');
  const listEl = part('list');

  let month = startOfMonth(new Date());

  function show(chosen) {
    month = chosen;
    history.replaceState(null, '', `#${route}/${monthValue(month)}`);
    render();
  }

  function enter(value = '') {
    const chosen = value ? parseMonthValue(value) : null;
    month = chosen && !Number.isNaN(chosen.getTime()) ? chosen : startOfMonth(latestDate() ?? new Date());
  }

  function render() {
    const entries = entriesIn(month);
    todayButton.disabled = monthValue(month) === monthValue(new Date());
    titleEl.textContent = formatMonthYear(month);
    summaryEl.textContent = summary(entries);
    gridEl.innerHTML = gridHtml(entries);
    listEl.innerHTML = entries.toReversed().map(entryHtml).join('');
  }

  function gridHtml(entries) {
    const byDay = Map.groupBy(entries, (entry) => dayKey(entry.date));
    const head = WEEK_FROM_MONDAY.map((day) => `<span class="calendar-weekday">${shortWeekday(day)}</span>`).join('');
    return `<div class="calendar-grid">${head}${calendarDays(month).map((day) => dayHtml(day, byDay)).join('')}</div>`;
  }

  function dayHtml(day, byDay) {
    if (!day) return '<span class="calendar-day"></span>';
    const today = isToday(day) ? ' aria-current="date"' : '';
    const [entry] = byDay.get(dayKey(day)) ?? [];
    if (!entry) return `<span class="calendar-day"${today}>${day.getDate()}</span>`;
    return `<a class="calendar-day has-entry" href="${escapeHtml(entry.href)}"${today}
      aria-label="${escapeHtml(formatLongDay(day))}">${day.getDate()}</a>`;
  }

  const entryHtml = ({ date, href, title, meta }) => `
    <a class="calendar-entry" href="${escapeHtml(href)}">
      <span class="calendar-entry-date">${shortWeekday(date)} ${date.getDate()}</span>
      <span class="calendar-entry-info">
        <span class="calendar-entry-title">${escapeHtml(title)}</span>
        <span class="calendar-entry-meta">${escapeHtml(meta)}</span>
      </span>
      ${CHEVRON}
    </a>`;

  return {
    init: () => onAction([stepsEl], {
      step: ({ step }) => show(addMonths(month, Number(step))),
      today: () => show(startOfMonth(new Date())),
    }),
    enter,
    render,
  };
}
