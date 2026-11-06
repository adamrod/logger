import { personalRecords } from './analysis.js';
import { monthValue } from './calendar.js';
import { climbContext, climbListHtml } from './climb-history.js';
import { editClimbAttempt } from './climb-screen.js';
import { stylesText } from './climbing.js';
import { daySummary, daySummaryText, loggedDays, nearbyDays } from './day-summary.js';
import { onAction } from './events.js';
import { escapeHtml, formatIsoDate, formatLongDay, parseDateValue } from './format.js';
import { editSet, showExercise } from './log-screen.js';
import { setRowHtml } from './set-history.js';
import { bodyWeights, climbs, sets } from './store.js';

const CHEVRON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

const titleEl = document.getElementById('day-title');
const summaryEl = document.getElementById('day-summary');
const stepsEl = document.getElementById('day-steps');
const calendarLink = document.getElementById('day-calendar');
const previousButton = document.getElementById('day-previous');
const nextButton = document.getElementById('day-next');
const latestButton = document.getElementById('day-latest');
const exercisesEl = document.getElementById('day-exercises');
const climbsEl = document.getElementById('day-climbs');

let day = new Date();

export const allLoggedDays = () => loggedDays(sets.getEntries(), bodyWeights.getEntries(), climbs.getEntries());

const nearby = () => nearbyDays(allLoggedDays(), day);

const actions = {
  step: ({ step }) => showDay(nearby()[step]),
  latest: () => showDay(lastLoggedDay()),
  exercise: ({ name }) => {
    showExercise(name);
    location.hash = '#log';
  },
  edit: ({ id }) => {
    editSet(id);
    location.hash = '#log';
  },
};

const climbActions = {
  session: ({ id }) => { location.hash = `#climb-session/${id}`; },
  edit: ({ id }) => {
    editClimbAttempt(id);
    location.hash = '#climb';
  },
};

export function initDay() {
  onAction([stepsEl, exercisesEl], actions);
  onAction([climbsEl], climbActions);
}

export function enterDay(isoDate = '') {
  const chosen = parseDateValue(isoDate);
  day = Number.isNaN(chosen.getTime()) ? lastLoggedDay() : chosen;
}

export function renderDay() {
  const { previous, next } = nearby();
  previousButton.disabled = !previous;
  nextButton.disabled = !next;
  latestButton.disabled = !next;
  calendarLink.href = `#calendar/${monthValue(day)}`;
  const summary = daySummary(day, sets.getEntries(), bodyWeights.getEntries(), climbs.getEntries());
  const isEmpty = !summary.exercises.length && !summary.climbing.length;
  titleEl.textContent = formatLongDay(day);
  summaryEl.textContent = daySummaryText(summary);
  exercisesEl.innerHTML = isEmpty ? '<p class="empty analysis-empty">Nothing logged this day.</p>' : summary.exercises.map(exerciseHtml).join('');
  climbsEl.innerHTML = summary.climbing.map(climbingHtml).join('');
}

function showDay(chosen) {
  day = chosen;
  history.replaceState(null, '', `#day/${formatIsoDate(day)}`);
  renderDay();
}

function lastLoggedDay() {
  return allLoggedDays().at(-1) ?? new Date();
}

const dayHeadingHtml = (action, data, name) => `
  <h2><button type="button" class="day-exercise-name" data-action="${action}" ${data}>${name}${CHEVRON}</button></h2>`;

function exerciseHtml({ exercise, rows }) {
  const records = personalRecords(sets.getEntries().filter((set) => set.exercise === exercise));
  const view = { variant: '', isUnsynced: sets.isUnsynced, editingId: null, records };
  const name = escapeHtml(exercise);
  return `
    <section class="day-exercise">
      ${dayHeadingHtml('exercise', `data-name="${name}"`, name)}
      <div class="day-sets">${rows.map((row) => setRowHtml(row, view)).join('')}</div>
    </section>`;
}

function climbingHtml(session) {
  const name = escapeHtml(`${session.gym} · ${stylesText(session.attempts)}`);
  return `
    <section class="day-exercise">
      ${dayHeadingHtml('session', `data-id="${escapeHtml(session.id)}"`, name)}
      ${climbListHtml(session.attempts, climbContext())}
    </section>`;
}
