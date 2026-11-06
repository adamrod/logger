import { STYLES, attemptsOfClimb, climbsIn, isTop, outcomeOf, sessionCount } from './climbing.js';
import { countText, escapeHtml, formatShortDay } from './format.js';
import { UNSYNCED_HTML, editAttributes } from './history.js';

const REMOVE_ICON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const metaText = (parts) => parts.filter(Boolean).map(escapeHtml).join(' · ');

const ropeStyles = (climb) => (climb.kind === 'rope' ? [...new Set(climb.attempts.map((attempt) => STYLES[attempt.style]))] : []);

const describeAttempt = (attempt) => `${attempt.grade} ${isTop(attempt) ? 'top' : 'attempt'}`;

const climbHtml = (grade, title, meta) => `
  <span class="climb-grade">${escapeHtml(grade)}</span>
  <span class="climb-info">
    <span class="climb-outcome">${title}</span>
    ${meta ? `<span class="climb-meta">${meta}</span>` : ''}
  </span>`;

export function climbListHtml(attempts, allAttempts, { selectedId = null, editingId = null, isUnsynced, canPick }) {
  const rowHtml = (climb) => {
    const id = escapeHtml(climb.id);
    const outcome = escapeHtml(outcomeOf(attemptsOfClimb(allAttempts, climb.id), climb.attempts));
    const title = outcome + (climb.attempts.some(isUnsynced) ? UNSYNCED_HTML : '');
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
