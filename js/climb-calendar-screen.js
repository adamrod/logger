import { addMonths, calendarDays, monthValue, parseMonthValue, startOfMonth } from './calendar.js';
import { climbingSessions, hardestGrade, isSend, isTop, sessionFocus, stylesText } from './climbing.js';
import { onAction } from './events.js';
import { countText, dayKey, escapeHtml, formatLength, formatLongDay, formatMonthYear, formatWeekday, isToday } from './format.js';
import { gradesAt } from './gyms.js';
import { climbs } from './store.js';

const WEEK_FROM_MONDAY = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i));
const CHEVRON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

const stepsEl = document.getElementById('climb-calendar-steps');
const todayButton = document.getElementById('climb-calendar-today');
const titleEl = document.getElementById('climb-calendar-title');
const summaryEl = document.getElementById('climb-calendar-summary');
const gridEl = document.getElementById('climb-calendar-grid');
const sessionsEl = document.getElementById('climb-calendar-sessions');

let month = startOfMonth(new Date());

const actions = {
  step: ({ step }) => showMonth(addMonths(month, Number(step))),
  today: () => showMonth(startOfMonth(new Date())),
  session: ({ id }) => { location.hash = `#climb-session/${id}`; },
};

export function initClimbCalendar() {
  onAction([stepsEl, gridEl, sessionsEl], actions);
}

export function enterClimbCalendar(value = '') {
  const chosen = value ? parseMonthValue(value) : null;
  const latest = climbingSessions(climbs.getEntries()).at(-1);
  month = chosen && !Number.isNaN(chosen.getTime()) ? chosen : startOfMonth(latest ? new Date(latest.startAt) : new Date());
}

export function renderClimbCalendar() {
  const sessions = climbingSessions(climbs.getEntries()).filter((session) => isInMonth(session.startAt));
  const attempts = sessions.reduce((sum, session) => sum + session.attempts.length, 0);
  todayButton.disabled = monthValue(month) === monthValue(new Date());
  titleEl.textContent = formatMonthYear(month);
  summaryEl.textContent = sessions.length ? `${countText(sessions.length, 'session')} · ${countText(attempts, 'attempt')}` : 'No sessions';
  gridEl.innerHTML = gridHtml(sessions);
  sessionsEl.innerHTML = sessions.toReversed().map(sessionRowHtml).join('');
}

function showMonth(chosen) {
  month = chosen;
  history.replaceState(null, '', `#climb-calendar/${monthValue(month)}`);
  renderClimbCalendar();
}

const isInMonth = (time) => monthValue(new Date(time)) === monthValue(month);

function gridHtml(sessions) {
  const byDay = Map.groupBy(sessions, (session) => dayKey(new Date(session.startAt)));
  const head = WEEK_FROM_MONDAY.map((day) => `<span class="calendar-weekday">${formatWeekday(day).slice(0, 2)}</span>`).join('');
  const cells = calendarDays(month).map((day) => dayHtml(day, byDay)).join('');
  return `<div class="calendar-grid">${head}${cells}</div>`;
}

function dayHtml(day, byDay) {
  if (!day) return '<span class="calendar-day"></span>';
  const today = isToday(day) ? ' aria-current="date"' : '';
  const [session] = byDay.get(dayKey(day)) ?? [];
  if (!session) return `<span class="calendar-day"${today}>${day.getDate()}</span>`;
  return `<button type="button" class="calendar-day has-session" data-action="session" data-id="${escapeHtml(session.id)}"${today}
    aria-label="Session on ${escapeHtml(formatLongDay(day))}">${day.getDate()}</button>`;
}

function sessionRowHtml(session) {
  const { kind, attempts } = sessionFocus(session);
  const hardest = hardestGrade(attempts.filter(isSend), gradesAt(session.gym, kind));
  const start = new Date(session.startAt);
  const meta = [
    formatLength(session.endAt - session.startAt),
    countText(session.attempts.length, 'attempt'),
    countText(session.attempts.filter(isTop).length, 'top'),
    hardest ? `hardest ${hardest}` : '',
  ].filter(Boolean).join(' · ');
  return `
    <button type="button" class="session-row" data-action="session" data-id="${escapeHtml(session.id)}">
      <span class="session-date">${formatWeekday(start).slice(0, 2)} ${start.getDate()}</span>
      <span class="session-info">
        <span class="session-title">${escapeHtml(`${session.gym} · ${stylesText(session.attempts)}`)}</span>
        <span class="session-meta">${escapeHtml(meta)}</span>
      </span>
      ${CHEVRON}
    </button>`;
}
