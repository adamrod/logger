import { STYLES, attemptsOfClimb, climbsIn, isTop, outcomeOf, projectSessions } from './climbing.js';
import { countText, escapeHtml, formatShortDay } from './format.js';
import { editAttributes, unsyncedHtml } from './history.js';

const REMOVE_ICON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const describeAttempt = (attempt) => `${attempt.grade} ${isTop(attempt) ? 'top' : 'attempt'}`;

const ropeStyles = (climb) => (climb.kind === 'rope' ? [...new Set(climb.attempts.map((attempt) => STYLES[attempt.style]))] : []);

const metaText = (parts) => parts.filter(Boolean).map(escapeHtml).join(' · ');

export function climbListHtml(attempts, allAttempts, view) {
  const climbs = climbsIn(attempts).toReversed();
  return `<ul class="climb-list">${climbs.map((climb) => climbRowHtml(climb, allAttempts, view)).join('')}</ul>`;
}

function climbRowHtml(climb, allAttempts, { selectedId = null, editingId = null, isUnsynced, canPick }) {
  const outcome = escapeHtml(outcomeOf(attemptsOfClimb(allAttempts, climb.id), climb.attempts));
  const meta = metaText([climb.name, ...climb.tags, ...ropeStyles(climb)]);
  const body = `
    <span class="climb-grade">${escapeHtml(climb.grade)}</span>
    <span class="climb-info">
      <span class="climb-outcome">${outcome}${unsyncedHtml(climb.attempts.find(isUnsynced) ?? climb.attempts[0], isUnsynced)}</span>
      ${meta ? `<span class="climb-meta">${meta}</span>` : ''}
    </span>`;
  const head = canPick
    ? `<button type="button" class="climb-pick" data-action="pick" data-climb="${escapeHtml(climb.id)}"
        aria-label="Climb ${escapeHtml(climb.grade)} again">${body}</button>`
    : `<div class="climb-pick">${body}</div>`;
  return `
    <li class="climb-row"${climb.id === selectedId ? ' aria-current="true"' : ''}>
      ${head}
      <ul class="attempt-dots">${climb.attempts.map((attempt) => attemptDotHtml(attempt, editingId)).join('')}</ul>
    </li>`;
}

function attemptDotHtml(attempt, editingId) {
  return `<li><button type="button" class="attempt-dot${isTop(attempt) ? ' is-top' : ''}"
    ${editAttributes(attempt, describeAttempt(attempt), editingId)}></button></li>`;
}

export function projectListHtml(projects, removingId) {
  return `<ul class="climb-list">${projects.map((project) => projectRowHtml(project, removingId)).join('')}</ul>`;
}

function projectRowHtml(project, removingId) {
  const id = escapeHtml(project.id);
  const name = escapeHtml(project.name);
  const sessions = projectSessions(project);
  const lastTried = formatShortDay(new Date(project.attempts.at(-1).timestamp));
  const meta = metaText([...project.tags, countText(project.attempts.length, 'attempt'), countText(sessions, 'session'), `last ${lastTried}`]);
  const remove = project.id === removingId
    ? `<button type="button" class="option-confirm" data-action="confirm-remove-project" data-climb="${id}" aria-label="Confirm remove ${name} from projects">Remove</button>`
    : `<button type="button" class="option-icon" data-action="remove-project" data-climb="${id}" aria-label="Remove ${name} from projects">${REMOVE_ICON}</button>`;
  return `
    <li class="climb-row">
      <button type="button" class="climb-pick" data-action="pick" data-climb="${id}" aria-label="Work on ${name}">
        <span class="climb-grade">${escapeHtml(project.grade)}</span>
        <span class="climb-info"><span class="climb-outcome">${name}</span><span class="climb-meta">${meta}</span></span>
      </button>
      ${remove}
    </li>`;
}

export const sessionKindText = (attempts) => [...new Set(attempts.map((attempt) => STYLES[attempt.style]))].join(', ');
