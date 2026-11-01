import { personalRecords } from './analysis.js';
import { daySummary, loggedDays, nearbyDays } from './day-summary.js';
import { onAction } from './events.js';
import { countText, escapeHtml, formatIsoDate, formatLongDay, parseDateValue, roundValue } from './format.js';
import { editSet, showExercise } from './log-screen.js';
import { setRowHtml } from './set-history.js';
import { bodyWeights, sets } from './store.js';

const titleEl = document.getElementById('day-title');
const summaryEl = document.getElementById('day-summary');
const stepsEl = document.getElementById('day-steps');
const previousButton = document.getElementById('day-previous');
const nextButton = document.getElementById('day-next');
const latestButton = document.getElementById('day-latest');
const exercisesEl = document.getElementById('day-exercises');

let day = new Date();

const nearby = () => nearbyDays(loggedDays(sets.getEntries(), bodyWeights.getEntries()), day);

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

export function initDay() {
  onAction([stepsEl, exercisesEl], actions);
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
  const summary = daySummary(day, sets.getEntries(), bodyWeights.getEntries());
  titleEl.textContent = formatLongDay(day);
  summaryEl.textContent = summaryText(summary);
  exercisesEl.innerHTML = summary.exercises.length
    ? summary.exercises.map(exerciseHtml).join('')
    : '<p class="empty analysis-empty">No sets logged this day.</p>';
}

function showDay(chosen) {
  day = chosen;
  history.replaceState(null, '', `#day/${formatIsoDate(day)}`);
  renderDay();
}

function lastLoggedDay() {
  return loggedDays(sets.getEntries(), bodyWeights.getEntries()).at(-1) ?? new Date();
}

function summaryText({ exercises, setCount, bodyWeight }) {
  const setParts = setCount ? [countText(exercises.length, 'exercise'), countText(setCount, 'set')] : [];
  const weightParts = bodyWeight === null ? [] : [`BW ${roundValue(bodyWeight)}`];
  return [...setParts, ...weightParts].join(' · ');
}

function exerciseHtml({ exercise, rows }) {
  const records = personalRecords(sets.getEntries().filter((set) => set.exercise === exercise));
  const view = { variant: '', isUnsynced: sets.isUnsynced, editingId: null, records };
  const name = escapeHtml(exercise);
  return `
    <section class="day-exercise">
      <h2>
        <button type="button" class="day-exercise-name" data-action="exercise" data-name="${name}">
          ${name}<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
        </button>
      </h2>
      <div class="day-sets">${rows.map((row) => setRowHtml(row, view)).join('')}</div>
    </section>`;
}
