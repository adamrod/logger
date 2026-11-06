import { markPressed } from './chart-controls.js';
import { revealPressedChip } from './chip-row.js';
import { climbListHtml, projectListHtml } from './climb-history.js';
import {
  DEFAULT_TAGS, STYLES, attemptsOfClimb, climbOf, climbingSessions, gradesFor, isLive, joinTags, kindOf,
  lastGradeAt, lastStyleAt, openProjects, tagsOf,
} from './climbing.js';
import { createEntryEditor } from './entry-editor.js';
import { onAction } from './events.js';
import { countText, escapeHtml, formatDuration, formatLongDay, formatWhen } from './format.js';
import { initGymForm, isGymFormOpen, openGymForm, showFirstGymForm } from './gym-form.js';
import { allGyms, gymGrades } from './gyms.js';
import { arrivingEntries, fadeOutEntries, leavingEntries, revealEntries, revealNewest } from './history.js';
import { createPickerMenu } from './picker-menu.js';
import { STOP_ICON, createStopwatch, startFreshOrStop, startIfStopped } from './stopwatch.js';
import { climbs } from './store.js';
import { undoable } from './undo.js';

const STATE_KEY = 'logger.v2.climb';
const TICK_MS = 1000;
const EDIT_ICON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
const EMPTY_DRAFT = { grade: null, name: '', tags: [] };

const gymBar = document.getElementById('gym-bar');
const controls = document.getElementById('climb-controls');
const styleSelect = document.getElementById('climb-style');
const gradeChips = document.getElementById('grade-chips');
const cardEl = document.getElementById('climb-card');
const cardGrade = document.getElementById('climb-grade');
const cardTitle = document.getElementById('climb-title');
const cardMeta = document.getElementById('climb-meta');
const newButton = document.getElementById('climb-new');
const nameToggle = document.getElementById('climb-name-toggle');
const tagsToggle = document.getElementById('climb-tags-toggle');
const nameInput = document.getElementById('climb-name');
const tagChips = document.getElementById('climb-tags');
const tagForm = document.getElementById('tag-form');
const tagInput = document.getElementById('tag-name');
const restTime = document.getElementById('climb-rest-time');
const logButtons = document.getElementById('climb-log-buttons');
const resultField = document.getElementById('climb-result-field');
const resultGroup = document.getElementById('climb-result');
const historyHeading = document.getElementById('climb-history-heading');
const historyEl = document.getElementById('climb-history');

const sessionStopwatch = createStopwatch({
  id: 'session-stopwatch',
  name: 'session',
  storageKey: 'logger.v2.session-stopwatch',
  toggle: startFreshOrStop,
  stopIcon: STOP_ICON,
});

const allAttempts = () => climbs.getEntries();

let place = { gym: allAttempts().at(-1)?.gym ?? null, styles: {}, selected: null, ...JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}') };
let draft = EMPTY_DRAFT;
let form = null;
let openField = null;
let isAddingTag = false;
let removingProject = null;
let isGradeRevealDue = true;

const editor = createEntryEditor(climbs, {
  logButton: logButtons,
  editActions: document.getElementById('climb-edit-actions'),
  deleteActions: document.getElementById('climb-delete-actions'),
  whenField: document.getElementById('climb-when-field'),
  whenInput: document.getElementById('climb-when'),
}, { fill: fillForm, read: readForm, save: saveAttempt, render: renderClimb });

const gymPicker = createPickerMenu('gym', {
  names: allGyms,
  onPick: selectGym,
  onAdd: (name) => openGymForm({ name, isNew: true }),
  actions: {
    'edit-gym': ({ name }) => {
      gymPicker.close();
      openGymForm({ name, grades: gymGrades(name), isNew: false });
      renderClimb();
    },
  },
  extrasHtml: (gym) => {
    const name = escapeHtml(gym);
    return `<button type="button" class="option-icon" data-action="edit-gym" data-name="${name}" aria-label="Edit ${name}">${EDIT_ICON}</button>`;
  },
});

const actions = {
  ...editor.actions,
  ...sessionStopwatch.actions,
  grade: ({ grade }) => chooseGrade(grade),
  log: ({ result }) => logAttempt(result),
  'new-climb': () => startNewClimb(),
  pick: ({ climb }) => pickClimb(climb),
  'toggle-name': () => toggleField('name'),
  'toggle-tags': () => toggleField('tags'),
  tag: ({ tag }) => toggleTag(tag),
  'add-tag': () => {
    isAddingTag = true;
    renderClimb();
    tagInput.focus();
  },
  'edit-result': ({ result }) => {
    form.result = result;
    renderClimb();
  },
  'remove-project': ({ climb }) => {
    removingProject = climb;
    renderClimb();
  },
  'confirm-remove-project': ({ climb }) => {
    removingProject = null;
    climbs.updateWhere((attempt) => attempt.climb === climb, { name: '' });
  },
};

export function initClimb() {
  initGymForm(closeGymForm);
  onAction([controls, historyEl], actions);
  styleSelect.addEventListener('change', () => chooseStyle(styleSelect.value));
  nameInput.addEventListener('change', () => changeClimb({ name: nameInput.value.trim() }));
  nameInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') nameInput.blur(); });
  tagForm.addEventListener('submit', addTag);
  sessionStopwatch.init();
  setInterval(renderRest, TICK_MS);
}

export function currentGym() {
  const gyms = allGyms();
  return gyms.includes(place.gym) ? place.gym : gyms[0] ?? null;
}

export const currentStyle = () => editedForm()?.style
  ?? place.styles[currentGym()]
  ?? lastStyleAt(allAttempts(), currentGym())
  ?? 'boulder';

export const currentKind = () => kindOf(currentStyle());

export const climbPlace = () => ({ gym: currentGym(), selected: place.selected });

export const editClimbAttempt = (id) => editor.actions.edit({ id });

export function enterClimb() {
  isGradeRevealDue = true;
}

export async function revealClimbs(step) {
  editor.stopEditing();
  await fadeOutEntries(historyEl, leavingEntries(step, climbs));
  savePlace({ gym: step.place.gym ?? place.gym, selected: step.place.selected ?? null });
  step.apply();
  revealEntries(historyEl, arrivingEntries(step, climbs));
}

export function renderClimb() {
  if (!currentGym()) showFirstGymForm();
  gymPicker.render(currentGym());
  gymBar.hidden = isGymFormOpen();
  controls.hidden = isGymFormOpen();
  renderStyles();
  renderGrades();
  renderCard();
  renderRest();
  renderEditing();
  renderHistory();
  if (isGradeRevealDue) revealPressedChip(gradeChips);
  isGradeRevealDue = false;
}

const editedForm = () => (editor.editingId() === null ? null : form);

const currentGrades = () => gradesFor(gymGrades(currentGym()), currentKind());

function savePlace(changes) {
  place = { ...place, ...changes };
  localStorage.setItem(STATE_KEY, JSON.stringify(place));
}

function selectedClimb() {
  const attempts = attemptsOfClimb(allAttempts(), place.selected);
  return attempts.length ? climbOf(attempts) : null;
}

function draftGrade() {
  const grades = currentGrades();
  if (grades.includes(draft.grade)) return draft.grade;
  const last = lastGradeAt(allAttempts(), currentGym(), currentKind());
  return grades.includes(last) ? last : grades[Math.floor(grades.length / 3)];
}

const shownGrade = () => editedForm()?.grade ?? selectedClimb()?.grade ?? draftGrade();

const shownClimb = () => editedForm() ?? selectedClimb() ?? draft;

const latestSession = () => climbingSessions(allAttempts()).findLast((session) => session.gym === currentGym()) ?? null;

function liveSession() {
  const session = latestSession();
  return session && isLive(session, Date.now()) ? session : null;
}

function logAttempt(result) {
  const gym = currentGym();
  if (!gym) return;
  undoable(() => {
    const climb = selectedClimb() ?? { id: new Date().toISOString(), grade: draftGrade(), name: draft.name, tags: draft.tags };
    const startsSession = !liveSession();
    savePlace({ selected: result === 'top' ? null : climb.id });
    draft = { ...EMPTY_DRAFT, grade: climb.grade };
    openField = null;
    climbs.add({ gym, style: currentStyle(), grade: climb.grade, climb: climb.id, name: climb.name, tags: joinTags(climb.tags), result });
    if (startsSession) sessionStopwatch.update(startIfStopped);
  });
  revealNewest(historyEl, allAttempts().at(-1));
}

function chooseGrade(grade) {
  const edited = editedForm();
  const selected = selectedClimb();
  if (edited) edited.grade = grade;
  else if (selected?.grade === grade) return;
  else if (selected) startNewClimb(grade);
  else draft = { ...draft, grade };
  renderClimb();
}

function chooseStyle(style) {
  const edited = editedForm();
  if (edited) {
    edited.style = style;
    renderClimb();
    return;
  }
  const changesKind = kindOf(style) !== currentKind();
  savePlace({ styles: { ...place.styles, [currentGym()]: style } });
  if (changesKind) startNewClimb(null);
  isGradeRevealDue = true;
  renderClimb();
}

function startNewClimb(grade = shownGrade()) {
  savePlace({ selected: null });
  draft = { ...EMPTY_DRAFT, grade };
  openField = null;
  renderClimb();
}

function pickClimb(id) {
  const attempts = attemptsOfClimb(allAttempts(), id);
  editor.stopEditing();
  removingProject = null;
  openField = null;
  if (attempts.length) {
    const latest = attempts.at(-1);
    const style = kindOf(currentStyle()) === kindOf(latest.style) ? currentStyle() : latest.style;
    savePlace({ gym: latest.gym, styles: { ...place.styles, [latest.gym]: style }, selected: id });
  }
  isGradeRevealDue = true;
  renderClimb();
}

function selectGym(gym) {
  editor.stopEditing();
  savePlace({ gym, selected: null });
  draft = EMPTY_DRAFT;
  isGradeRevealDue = true;
  renderClimb();
}

function closeGymForm(gym) {
  if (gym) selectGym(gym);
  else renderClimb();
}

function changeClimb(changes) {
  const edited = editedForm();
  const selected = selectedClimb();
  if (edited) Object.assign(edited, changes);
  else if (!selected) draft = { ...draft, ...changes };
  else if (!matches(selected, changes)) climbs.updateWhere((attempt) => attempt.climb === selected.id, asColumns(changes));
  renderClimb();
}

const matches = (climb, changes) => {
  const columns = { name: climb.name, tags: joinTags(climb.tags) };
  return Object.entries(asColumns(changes)).every(([key, value]) => columns[key] === value);
};

const asColumns = (changes) => ('tags' in changes ? { ...changes, tags: joinTags(changes.tags) } : changes);

function toggleField(field) {
  openField = openField === field ? null : field;
  isAddingTag = false;
  renderClimb();
  if (openField === 'name') nameInput.focus();
}

function toggleTag(tag) {
  const { tags } = shownClimb();
  changeClimb({ tags: tags.includes(tag) ? tags.filter((kept) => kept !== tag) : [...tags, tag] });
}

function addTag(event) {
  event.preventDefault();
  const tag = tagInput.value.replaceAll('|', '').trim();
  const { tags } = shownClimb();
  tagInput.value = '';
  isAddingTag = false;
  if (tag && !tags.includes(tag)) changeClimb({ tags: [...tags, tag] });
  else renderClimb();
}

function fillForm(attempt) {
  savePlace({ gym: attempt.gym });
  openField = null;
  form = { grade: attempt.grade, name: attempt.name ?? '', tags: tagsOf(attempt), result: attempt.result, style: attempt.style };
}

function readForm() {
  return { ...form, name: form.name.trim(), tags: joinTags(form.tags) };
}

function saveAttempt(id, { timestamp, result, style, ...climbFields }) {
  const attempt = allAttempts().find((entry) => entry.timestamp === id);
  const differs = (entry) => entry.climb === attempt.climb && entry.timestamp !== id
    && Object.entries(climbFields).some(([key, value]) => (entry[key] ?? '') !== value);
  undoable(() => {
    climbs.updateWhere(differs, climbFields);
    climbs.update(id, { ...climbFields, result, style, timestamp });
  });
}

const allTags = () => [...new Set([...DEFAULT_TAGS, ...allAttempts().flatMap(tagsOf), ...shownClimb().tags])];

function renderStyles() {
  const edited = editedForm();
  const styles = Object.entries(STYLES).filter(([style]) => !edited || kindOf(style) === kindOf(edited.style));
  styleSelect.innerHTML = styles.map(([style, label]) => `<option value="${style}">${label}</option>`).join('');
  styleSelect.value = currentStyle();
  styleSelect.disabled = styles.length < 2;
}

function renderGrades() {
  const grade = shownGrade();
  gradeChips.innerHTML = currentGrades().map((option) => {
    const value = escapeHtml(option);
    return `<button type="button" class="chip grade-chip" data-action="grade" data-grade="${value}" aria-pressed="${option === grade}">${value}</button>`;
  }).join('');
}

function renderCard() {
  const edited = editedForm();
  const selected = selectedClimb();
  const climb = shownClimb();
  cardEl.classList.toggle('is-current', Boolean(edited || selected));
  cardGrade.textContent = shownGrade();
  cardTitle.textContent = edited ? 'Editing attempt' : climb.name || (selected ? 'Climb' : 'New climb');
  cardMeta.textContent = cardMetaText(edited, selected);
  newButton.hidden = Boolean(edited || !selected);
  nameToggle.textContent = climb.name ? 'Rename' : '+ Name';
  nameToggle.setAttribute('aria-expanded', openField === 'name');
  tagsToggle.textContent = climb.tags.length ? climb.tags.join(', ') : '+ Tags';
  tagsToggle.classList.toggle('is-set', climb.tags.length > 0);
  tagsToggle.setAttribute('aria-expanded', openField === 'tags');
  nameInput.hidden = openField !== 'name';
  if (nameInput !== document.activeElement) nameInput.value = climb.name;
  tagChips.hidden = openField !== 'tags';
  tagChips.innerHTML = tagChipsHtml(climb.tags);
  tagForm.hidden = openField !== 'tags' || !isAddingTag;
}

function cardMetaText(edited, selected) {
  if (edited) return formatWhen(new Date(editor.editingId()));
  if (!selected) return 'Starts with your next attempt';
  const today = liveSession()?.attempts.filter((attempt) => attempt.climb === selected.id).length ?? 0;
  const before = selected.attempts.length - today;
  if (!today) return `${countText(before, 'attempt')} before`;
  return [countText(today, 'attempt'), before ? `${before} before` : ''].filter(Boolean).join(' · ');
}

function tagChipsHtml(tags) {
  const chips = allTags().map((tag) => {
    const value = escapeHtml(tag);
    return `<button type="button" class="chip tag-chip" data-action="tag" data-tag="${value}" aria-pressed="${tags.includes(tag)}">${value}</button>`;
  });
  const addChip = isAddingTag ? '' : '<button type="button" class="chip chip-new tag-chip" data-action="add-tag" aria-label="New tag">+</button>';
  return chips.join('') + addChip;
}

function renderRest() {
  const session = liveSession();
  restTime.textContent = formatDuration(session ? Date.now() - session.endAt : 0);
  restTime.classList.toggle('is-idle', !session);
}

function renderEditing() {
  const edited = editedForm();
  editor.render();
  resultField.hidden = !edited;
  if (edited) markPressed(resultGroup, 'result', edited.result);
  logButtons.querySelectorAll('button').forEach((button) => { button.disabled = !currentGym(); });
}

function renderHistory() {
  const session = latestSession();
  historyHeading.innerHTML = session ? sessionLinkHtml(session) : 'This session';
  const view = { selectedId: place.selected, editingId: editor.editingId(), isUnsynced: climbs.isUnsynced, canPick: true };
  const sessionHtml = session ? climbListHtml(session.attempts, allAttempts(), view) : '<p class="empty">No climbs logged here yet.</p>';
  historyEl.innerHTML = sessionHtml + projectsHtml(session);
}

function sessionLinkHtml(session) {
  const title = isLive(session, Date.now()) ? 'This session' : formatLongDay(new Date(session.startAt));
  return `<a class="history-link" href="#climb-session/${escapeHtml(session.id)}">${escapeHtml(title)} ›</a>`;
}

function projectsHtml(session) {
  const shown = new Set(session?.attempts.map((attempt) => attempt.climb));
  const projects = openProjects(allAttempts(), currentGym(), currentKind()).filter((project) => !shown.has(project.id));
  if (!projects.length) return '';
  return `<h2 class="label climb-subhead">Projects</h2>${projectListHtml(projects, removingProject)}`;
}
