import { STYLES, climbsIn, isTop, outcomeOf, recordSends, sessionCount } from './climbing.js';
import { countText, daysBetween, escapeHtml, formatDay, formatShortDay } from './format.js';
import { gradesAt } from './gyms.js';
import { UNSYNCED_HTML, currentDateAttribute, editAttributes, gapHtml, sinceLastHtml } from './history.js';
import { climbs } from './store.js';

const REMOVE_ICON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const RECORD_HTML = '<span class="set-record">PR</span>';

const metaText = (parts) => parts.filter(Boolean).map(escapeHtml).join(' · ');

const ropeStyles = (climb) => (climb.kind === 'rope' ? [...new Set(climb.attempts.map((attempt) => STYLES[attempt.style]))] : []);

const describeAttempt = (attempt) => `${attempt.grade} ${isTop(attempt) ? 'top' : 'attempt'}`;

export function climbContext() {
  const all = climbs.getEntries();
  return { byClimb: Map.groupBy(all, (attempt) => attempt.climb), records: recordSends(all, gradesAt), isUnsynced: climbs.isUnsynced };
}

const climbHtml = (grade, title, meta) => `
  <span class="climb-grade">${escapeHtml(grade)}</span>
  <span class="climb-info">
    <span class="climb-outcome">${title}</span>
    ${meta ? `<span class="climb-meta">${meta}</span>` : ''}
  </span>`;

export function climbListHtml(attempts, context, { selectedId = null, editingId = null, canPick = false } = {}) {
  const rowHtml = (climb) => {
    const id = escapeHtml(climb.id);
    const outcome = escapeHtml(outcomeOf(context.byClimb.get(climb.id), climb.attempts));
    const isRecord = climb.attempts.some((attempt) => context.records.has(attempt.timestamp));
    const title = outcome + (isRecord ? RECORD_HTML : '') + (climb.attempts.some(context.isUnsynced) ? UNSYNCED_HTML : '');
    const body = climbHtml(climb.grade, title, metaText([climb.name, ...climb.tags, ...ropeStyles(climb)]));
    const head = canPick
      ? `<button type="button" class="climb-pick" data-action="pick" data-climb="${id}" aria-label="Climb ${escapeHtml(climb.grade)} again">${body}</button>`
      : `<div class="climb-pick">${body}</div>`;
    const dots = climb.attempts.map((attempt) => `
      <li><button type="button" class="attempt-dot${isTop(attempt) ? ' is-top' : ''}"
        ${editAttributes(attempt, describeAttempt(attempt), editingId)}></button></li>`).join('');
    return `
      <li class="climb-row"${climb.id === selectedId ? ' aria-current="true"' : ''}>
        ${head}<ul class="attempt-dots">${dots}</ul>
      </li>`;
  };
  return `<ul class="climb-list">${climbsIn(attempts).toReversed().map(rowHtml).join('')}</ul>`;
}

export function climbHistoryHtml(sessions, context, view) {
  if (!sessions.length) return '<p class="empty">No climbs logged here yet.</p>';
  const newestFirst = sessions.toReversed();
  const dateOf = (session) => new Date(session.startAt);
  const sessionHtml = (session, i) => {
    const older = newestFirst[i + 1];
    return `
      <section class="history-day climb-day"${currentDateAttribute(dateOf(session))}>
        <button type="button" class="history-date" data-action="session" data-id="${escapeHtml(session.id)}">${formatDay(dateOf(session))}</button>
        ${climbListHtml(session.attempts, context, view)}
        ${older ? gapHtml(daysBetween(dateOf(older), dateOf(session))) : ''}
      </section>`;
  };
  return sinceLastHtml(daysBetween(dateOf(newestFirst[0]), new Date())) + newestFirst.map(sessionHtml).join('');
}

export function projectListHtml(projects, removingId) {
  const rowHtml = (project) => {
    const id = escapeHtml(project.id);
    const name = escapeHtml(project.name);
    const lastTried = formatShortDay(new Date(project.attempts.at(-1).timestamp));
    const meta = metaText([
      ...project.tags,
      countText(project.attempts.length, 'attempt'),
      countText(sessionCount(project.attempts), 'session'),
      `last ${lastTried}`,
    ]);
    const remove = project.id === removingId
      ? `<button type="button" class="option-confirm" data-action="confirm-remove-project" data-climb="${id}"
          aria-label="Confirm remove ${name} from projects">Remove</button>`
      : `<button type="button" class="option-icon" data-action="remove-project" data-climb="${id}"
          aria-label="Remove ${name} from projects">${REMOVE_ICON}</button>`;
    return `
      <li class="climb-row">
        <button type="button" class="climb-pick" data-action="pick" data-climb="${id}" aria-label="Work on ${name}">
          ${climbHtml(project.grade, name, meta)}
        </button>
        ${remove}
      </li>`;
  };
  return `<ul class="climb-list">${projects.map(rowHtml).join('')}</ul>`;
}
