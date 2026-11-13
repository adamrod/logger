import { statTilesHtml } from './climb-report.js';
import { RESULTS, attemptsIn, boardOf, clockOf, endOf, liveCompetition, nextResult, scoreOf } from './competition.js';
import { initCompetitionForm, isCompetitionFormOpen, openCompetitionForm } from './competition-form.js';
import { allCompetitions, competitionById, competitionNamed } from './competitions.js';
import { onAction } from './events.js';
import { countText, escapeHtml, formatDuration, formatTime, formatWhen } from './format.js';
import { historyHtml } from './history.js';
import { createPickerMenu } from './picker-menu.js';
import { createStopwatch, restartAfterLog } from './stopwatch.js';
import { competitionAttempts } from './store.js';
import { undoable } from './undo.js';

const STATE_KEY = 'logger.v2.competition';
const FORM_LABEL = 'Competition';
const TICK_MS = 1000;
const SECOND_MS = 1000;
const REVERSIBLE_RESULTS = ['zone', 'top'];
const RESULT_CELLS = { attempt: 'cell', zone: 'cell is-zone', top: 'cell is-top' };
const STATE_NAMES = { untouched: 'not tried', tried: 'tried', zone: 'zone', top: 'top' };
const REMOVE_ICON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const pickerEl = document.getElementById('competition-picker');
const actionsEl = document.getElementById('competition-actions');
const controls = document.getElementById('competition-controls');
const labelEl = document.getElementById('competition-label');
const clockEl = document.getElementById('competition-clock');
const mainLabel = document.getElementById('competition-main-label');
const mainTime = document.getElementById('competition-main-time');
const sideLabel = document.getElementById('competition-side-label');
const sideTime = document.getElementById('competition-side-time');
const progressEl = document.getElementById('competition-progress');
const scoreEl = document.getElementById('competition-score');
const boardEl = document.getElementById('competition-board');
const cardEl = document.getElementById('competition-boulder');
const cardOpen = document.getElementById('competition-boulder-open');
const cardTitle = document.getElementById('competition-boulder-title');
const cardMeta = document.getElementById('competition-boulder-meta');
const attemptsEl = document.getElementById('competition-attempts');
const historySection = document.getElementById('competition-history-section');
const historyEl = document.getElementById('competition-history');
const logButtons = Object.fromEntries(Object.keys(RESULTS).map((result) => [result, document.getElementById(`competition-log-${result}`)]));

let place = { competition: null, boulder: null, ...JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}') };
let isShowingAttempts = false;

const restStopwatch = createStopwatch({ id: 'competition-rest', name: 'rest', storageKey: 'logger.v2.competition-rest' });

const picker = createPickerMenu('competition', {
  names: () => allCompetitions().map((competition) => competition.name),
  onPick: (name) => showCompetition(competitionNamed(name)),
  onAdd: (name) => editCompetition({ name }),
});

const actions = {
  ...restStopwatch.actions,
  boulder: ({ boulder }) => {
    savePlace({ boulder: Number(boulder) });
    isShowingAttempts = false;
    renderCompetition();
  },
  log: ({ result }) => logOrReverse(result),
  'toggle-attempts': () => {
    isShowingAttempts = !isShowingAttempts;
    renderCompetition();
  },
  'next-result': ({ id, result }) => competitionAttempts.update(id, { result: nextResult(result) }),
  'remove-attempt': ({ id }) => competitionAttempts.remove(id),
};

export function initCompetition() {
  initCompetitionForm(closeForm);
  onAction([controls], actions);
  onAction([actionsEl], { edit: () => editCompetition({ competition: currentCompetition() }) });
  onAction([historyEl], { edit: ({ id }) => showBoulderOf(id) });
  restStopwatch.init();
  setInterval(renderClock, TICK_MS);
}

export function enterCompetition() {
  const live = liveCompetition(allCompetitions(), Date.now());
  if (live) showCompetition(live);
}

export const hasLiveCompetition = () => liveCompetition(allCompetitions(), Date.now()) !== null;

export const competitionPlace = () => ({ competition: currentCompetition()?.timestamp ?? null, boulder: place.boulder });

export function revealCompetition(step) {
  savePlace({ competition: step.place.competition ?? place.competition, boulder: step.place.boulder ?? place.boulder });
  step.apply();
}

export function renderCompetition() {
  const competition = currentCompetition();
  if (!competition && !isCompetitionFormOpen()) openCompetitionForm({});
  const isFormOpen = isCompetitionFormOpen();
  picker.render(competition?.name ?? null);
  pickerEl.hidden = isFormOpen;
  actionsEl.hidden = isFormOpen;
  controls.hidden = isFormOpen;
  historySection.hidden = isFormOpen;
  if (isFormOpen) labelEl.textContent = FORM_LABEL;
  if (isFormOpen) return;
  const board = boardOf(competition, competitionAttempts.getEntries());
  renderClock();
  renderScore(scoreOf(competition, board));
  renderBoard(board);
  renderBoulder(board.find(({ number }) => number === place.boulder) ?? null);
  renderHistory(competition);
}

function currentCompetition() {
  return competitionById(place.competition) ?? allCompetitions()[0] ?? null;
}

function savePlace(changes) {
  place = { ...place, ...changes };
  localStorage.setItem(STATE_KEY, JSON.stringify(place));
}

function showCompetition(competition) {
  if (competition.timestamp !== currentCompetition()?.timestamp) savePlace({ boulder: null });
  savePlace({ competition: competition.timestamp });
  isShowingAttempts = false;
  renderCompetition();
}

function editCompetition(shown) {
  picker.close();
  openCompetitionForm(shown);
  renderCompetition();
}

function closeForm(savedName) {
  if (savedName) showCompetition(competitionNamed(savedName));
  else renderCompetition();
}

function logOrReverse(result) {
  const logged = REVERSIBLE_RESULTS.includes(result) ? triesWith(result) : [];
  if (logged.length) undoable(() => logged.forEach(({ timestamp }) => competitionAttempts.remove(timestamp)));
  else logTry(result);
}

function logTry(result) {
  competitionAttempts.add({ competition: currentCompetition().timestamp, boulder: place.boulder, result });
  restStopwatch.update(restartAfterLog);
}

function showBoulderOf(id) {
  const { boulder } = competitionAttempts.getEntries().find((attempt) => attempt.timestamp === id);
  savePlace({ boulder });
  isShowingAttempts = true;
  renderCompetition();
  cardEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function triesWith(result) {
  return attemptsIn(competitionAttempts.getEntries(), currentCompetition())
    .filter((attempt) => attempt.boulder === place.boulder && attempt.result === result);
}

const wholeSeconds = (ms) => Math.ceil(ms / SECOND_MS) * SECOND_MS;

function renderClock() {
  const competition = currentCompetition();
  if (!competition || controls.hidden) return;
  const clock = clockOf(competition, Date.now());
  const isLive = clock.phase === 'live';
  labelEl.textContent = whenText(competition, clock);
  clockEl.hidden = clock.phase === 'after';
  mainLabel.textContent = isLive ? 'Left' : 'Starts in';
  mainTime.textContent = formatDuration(wholeSeconds(isLive ? clock.left : clock.startsIn ?? 0));
  sideLabel.textContent = isLive ? 'Elapsed' : 'Length';
  sideTime.textContent = formatDuration(isLive ? clock.elapsed : clock.length);
  progressEl.style.width = `${isLive ? (clock.elapsed / clock.length) * 100 : 0}%`;
}

function whenText(competition, { phase }) {
  const when = `${formatWhen(new Date(competition.start))}–${formatTime(new Date(endOf(competition)))}`;
  return phase === 'after' ? `Finished · ${when}` : when;
}

function renderScore({ tops, zones, tried, total, points }) {
  scoreEl.innerHTML = statTilesHtml([
    ['Tops', String(tops)],
    ['Zones', String(zones)],
    ['Tried', String(tried), `/${total}`],
    ['Points', String(points)],
  ]);
}

function renderBoard(board) {
  boardEl.innerHTML = board.map(tileHtml).join('');
}

function tileHtml({ number, attempts, state }) {
  const tries = attempts.length ? `<span class="boulder-tries">${attempts.length}</span>` : '';
  return `<button type="button" class="boulder is-${state}" data-action="boulder" data-boulder="${number}"
    aria-pressed="${number === place.boulder}" aria-label="Boulder ${number}, ${STATE_NAMES[state]}">${number}${tries}</button>`;
}

function renderBoulder(boulder) {
  const hasAttempts = Boolean(boulder?.attempts.length);
  const isOpen = isShowingAttempts && hasAttempts;
  cardEl.classList.toggle('is-current', Boolean(boulder));
  cardTitle.textContent = boulder ? `Boulder ${boulder.number}` : 'Pick a boulder';
  cardMeta.textContent = boulder ? boulderText(boulder) : 'Tap its number to log';
  cardOpen.disabled = !hasAttempts;
  cardOpen.setAttribute('aria-expanded', isOpen);
  attemptsEl.hidden = !isOpen;
  attemptsEl.innerHTML = isOpen ? boulder.attempts.map(attemptHtml).join('') : '';
  renderLogButtons(boulder);
}

function renderLogButtons(boulder) {
  const has = (result) => Boolean(boulder?.attempts.some((attempt) => attempt.result === result));
  logButtons.attempt.disabled = !boulder;
  logButtons.zone.disabled = !boulder || has('top');
  logButtons.zone.setAttribute('aria-pressed', has('zone') || has('top'));
  logButtons.top.disabled = !boulder;
  logButtons.top.setAttribute('aria-pressed', has('top'));
}

function boulderText({ attempts, state }) {
  if (!attempts.length) return 'Not tried yet';
  const count = countText(attempts.length, 'attempt');
  return state === 'tried' ? count : `${count} · ${STATE_NAMES[state]}`;
}

function attemptHtml({ timestamp, result }, i) {
  const id = escapeHtml(timestamp);
  return `
    <li class="attempt-edit">
      <span class="attempt-number">${i + 1}</span>
      <span class="attempt-time">${formatTime(new Date(timestamp))}</span>
      <button type="button" class="chip result-chip" data-action="next-result" data-id="${id}" data-result="${result}"
        aria-pressed="${result !== 'attempt'}" aria-label="Attempt ${i + 1}: ${RESULTS[result]}, tap to change">${RESULTS[result]}</button>
      <button type="button" class="option-icon" data-action="remove-attempt" data-id="${id}" aria-label="Remove attempt ${i + 1}">${REMOVE_ICON}</button>
    </li>`;
}

function renderHistory(competition) {
  historyEl.innerHTML = historyHtml(attemptsIn(competitionAttempts.getEntries(), competition), {
    lead: [(attempt) => formatTime(new Date(attempt.timestamp))],
    valueHtml: tryHtml,
    describe: ({ boulder, result }) => `boulder ${boulder}, ${RESULTS[result]}`,
    isUnsynced: competitionAttempts.isUnsynced,
    editingId: null,
    empty: 'Nothing logged yet.',
  });
}

function tryHtml({ boulder, result }) {
  return `<span class="try is-${result}"><span class="try-boulder">${boulder}</span><span class="${RESULT_CELLS[result]}"></span><span class="try-result">${RESULTS[result]}</span></span>`;
}
