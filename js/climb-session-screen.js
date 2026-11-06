import { monthValue } from './calendar.js';
import { attemptTimelineSvg } from './climb-charts.js';
import { climbContext, climbListHtml } from './climb-history.js';
import {
  DOTS_LEGEND, attemptRowsHtml, sectionHtml, statTilesHtml, tagBarsHtml, topsDetail,
} from './climb-report.js';
import { editClimbAttempt } from './climb-screen.js';
import { attemptsByGrade, climbStats, climbingSessions, meanRest, sessionFocus, stylesText, tagCounts } from './climbing.js';
import { onAction } from './events.js';
import { formatDuration, formatLength, formatLongDay, formatTime } from './format.js';
import { gradesAt } from './gyms.js';
import { climbs } from './store.js';

const stepsEl = document.getElementById('climb-session-steps');
const previousButton = document.getElementById('climb-session-previous');
const nextButton = document.getElementById('climb-session-next');
const latestButton = document.getElementById('climb-session-latest');
const calendarLink = document.getElementById('climb-session-calendar');
const titleEl = document.getElementById('climb-session-title');
const summaryEl = document.getElementById('climb-session-summary');
const bodyEl = document.getElementById('climb-session-body');

let sessionId = '';

const sessions = () => climbingSessions(climbs.getEntries());

const actions = {
  step: ({ step }) => showSession(sessions()[shownIndex() + Number(step)]),
  latest: () => showSession(sessions().at(-1)),
  edit: ({ id }) => {
    editClimbAttempt(id);
    location.hash = '#climb';
  },
};

export function initClimbSession() {
  onAction([stepsEl, bodyEl], actions);
}

export function enterClimbSession(id = '') {
  sessionId = id;
}

export function renderClimbSession() {
  const all = sessions();
  const index = shownIndex();
  const session = all[index];
  previousButton.disabled = index <= 0;
  nextButton.disabled = index >= all.length - 1;
  latestButton.disabled = index >= all.length - 1;
  calendarLink.href = session ? `#climb-calendar/${monthValue(new Date(session.startAt))}` : '#climb-calendar';
  titleEl.textContent = session ? formatLongDay(new Date(session.startAt)) : 'No sessions yet';
  summaryEl.textContent = session ? summaryText(session) : '';
  bodyEl.innerHTML = session ? sessionHtml(session) : '<p class="empty analysis-empty">Log a climb to start your first session.</p>';
}

function shownIndex() {
  const all = sessions();
  const index = all.findIndex((session) => session.attempts.some((attempt) => attempt.timestamp === sessionId));
  return index === -1 ? all.length - 1 : index;
}

function showSession(session) {
  if (!session) return;
  sessionId = session.id;
  history.replaceState(null, '', `#climb-session/${session.id}`);
  renderClimbSession();
}

const summaryText = (session) => [
  session.gym,
  stylesText(session.attempts),
  `${formatTime(new Date(session.startAt))}–${formatTime(new Date(session.endAt))}`,
].join(' · ');

function sessionHtml(session) {
  const all = climbs.getEntries();
  const { kind, attempts } = sessionFocus(session);
  const grades = gradesAt(session.gym, kind);
  const stats = climbStats(attempts, all, grades);
  const rest = meanRest(session.attempts);
  const tiles = statTilesHtml([
    ['Duration', formatLength(session.endAt - session.startAt)],
    ['Attempts', String(stats.attempts)],
    ['Tops', String(stats.tops), topsDetail(stats.tops, stats.attempts)],
    ['Hardest send', stats.hardestSend],
    ['Hardest flash', stats.hardestFlash],
    ['Avg rest', rest === null ? null : formatDuration(rest)],
  ]);
  const climbsHtml = climbListHtml(session.attempts, climbContext());
  return `
    <div class="climb-section">${tiles}</div>
    ${sectionHtml('Attempts by grade', attemptRowsHtml(attemptsByGrade(attempts, grades)), DOTS_LEGEND)}
    ${sectionHtml('Timeline', attemptTimelineSvg(attempts, grades))}
    ${sectionHtml('Sends by tag', tagBarsHtml(tagCounts(session.attempts, all)))}
    ${sectionHtml('Climbs', climbsHtml)}`;
}
