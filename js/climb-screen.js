import { markPressed } from './chart-controls.js';
import { revealPressedChip } from './chip-row.js';
import { climbContext, climbHistoryHtml, projectListHtml } from './climb-history.js';
import {
  DEFAULT_TAGS, STYLES, UNGRADED, attemptsOfClimb, climbOf, climbingSessions, isLive, joinTags, kindOf, lastGradeAt, lastStyleAt,
  openProjects, tagsOf,
} from './climbing.js';
import { createEntryEditor } from './entry-editor.js';
import { onAction } from './events.js';
import { countText, escapeHtml, formatDuration, formatWhen } from './format.js';
import { initGymForm, isGymFormOpen, openGymForm, showFirstGymForm } from './gym-form.js';
import { allGyms, gradesAt, gymGrades } from './gyms.js';
import { arrivingEntries, fadeOutEntries, leavingEntries, revealEntries, revealNewest } from './history.js';
import { createPickerMenu } from './picker-menu.js';
import { createStopwatch, restartUnlessStartedSince } from './stopwatch.js';
import { climbs } from './store.js';
import { undoable } from './undo.js';

const STATE_KEY = 'logger.v2.climb';
const TICK_MS = 1000;
const EDIT_ICON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
const NEW_CLIMB = { grade: null, name: '', tags: [] };

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
const analysisLink = document.getElementById('climb-analysis-link');
const historyEl = document.getElementById('climb-history');

const renderedHtml = new WeakMap();

const sessionStopwatch = createStopwatch({ id: 'session-stopwatch', name: 'session', storageKey: 'logger.v2.session-stopwatch' });

const allAttempts = () => climbs.getEntries();

let place = { gym: allAttempts().at(-1)?.gym ?? null, styles: {}, selected: null, ...JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}') };
let draft = NEW_CLIMB;
let form = null;
let openPanel = null;
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
  onAdd: (name) => editGym({ name, isNew: true }),
  actions: {
    'edit-gym': ({ name }) => {
      gymPicker.close();
      editGym({ name, grades: gymGrades(name), isNew: false });
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
  'new-climb': () => {
    startNewClimb(shownGrade());
    renderClimb();
  },
  pick: ({ climb }) => pickClimb(climb),
  session: ({ id }) => { location.hash = `#climb-session/${id}`; },
  'toggle-name': () => togglePanel('name'),
  'toggle-tags': () => togglePanel('tags'),
  tag: ({ tag }) => toggleTag(tag),
  'add-tag': () => {
    openPanel = 'new-tag';
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

export function enterClimb() {
  isGradeRevealDue = true;
}

export function currentGym() {
  const gyms = allGyms();
  return gyms.includes(place.gym) ? place.gym : gyms[0] ?? null;
}

const currentStyle = () => editedForm()?.style
  ?? place.styles[currentGym()]
  ?? lastStyleAt(allAttempts(), currentGym())
  ?? 'boulder';

export const currentKind = () => kindOf(currentStyle());

export const climbPlace = () => ({ gym: currentGym(), selected: place.selected });

export const editClimbAttempt = (id) => editor.actions.edit({ id });

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

const currentGrades = () => gradesAt(currentGym(), currentKind());

const gradeOptions = () => [...currentGrades(), UNGRADED];

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
  const last = lastGradeAt(allAttempts(), currentGym(), currentKind());
  return [draft.grade, last].find((grade) => gradeOptions().includes(grade)) ?? grades[Math.floor(grades.length / 3)];
}

const shownGrade = () => editedForm()?.grade ?? selectedClimb()?.grade ?? draftGrade();

const shownClimb = () => editedForm() ?? selectedClimb() ?? draft;

function liveSession() {
  const session = climbingSessions(allAttempts()).at(-1);
  return session?.gym === currentGym() && isLive(session, Date.now()) ? session : null;
}

function logAttempt(result) {
  const gym = currentGym();
  const startsSession = !liveSession();
  const previousEndAt = climbingSessions(allAttempts()).at(-1)?.endAt ?? 0;
  undoable(() => {
    const climb = selectedClimb() ?? { ...draft, id: new Date().toISOString(), grade: draftGrade() };
    savePlace({ selected: result === 'top' ? null : climb.id });
    draft = { ...NEW_CLIMB, grade: climb.grade };
    openPanel = null;
    climbs.add({ gym, style: currentStyle(), grade: climb.grade, climb: climb.id, name: climb.name, tags: joinTags(climb.tags), result });
  });
  if (startsSession) sessionStopwatch.update(restartUnlessStartedSince(previousEndAt));
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
  if (edited) edited.style = style;
  else {
    if (kindOf(style) !== currentKind()) startNewClimb(null);
    savePlace({ styles: { ...place.styles, [currentGym()]: style } });
    isGradeRevealDue = true;
  }
  renderClimb();
}

function startNewClimb(grade) {
  savePlace({ selected: null });
  draft = { ...NEW_CLIMB, grade };
  openPanel = null;
}

function pickClimb(id) {
  const latest = attemptsOfClimb(allAttempts(), id).at(-1);
  const style = kindOf(currentStyle()) === kindOf(latest.style) ? currentStyle() : latest.style;
  editor.stopEditing();
  removingProject = null;
  openPanel = null;
  savePlace({ gym: latest.gym, styles: { ...place.styles, [latest.gym]: style }, selected: id });
  isGradeRevealDue = true;
  renderClimb();
}

function selectGym(gym) {
  editor.stopEditing();
  savePlace({ gym, selected: null });
  draft = NEW_CLIMB;
  isGradeRevealDue = true;
  renderClimb();
}

function editGym(gym) {
  openGymForm(gym);
  renderClimb();
}

function closeGymForm(saved) {
  if (saved?.original === null) selectGym(saved.name);
  else if (saved) savePlace(placeAfterRename(saved.original, saved.name));
  renderClimb();
}

function placeAfterRename(from, to) {
  const { [from]: style, ...styles } = place.styles;
  return { gym: place.gym === from ? to : place.gym, styles: style ? { ...styles, [to]: style } : styles };
}

function changeClimb(changes) {
  const edited = editedForm();
  const selected = selectedClimb();
  if (edited) Object.assign(edited, changes);
  else if (selected) climbs.updateWhere((attempt) => attempt.climb === selected.id, asColumns(changes));
  else draft = { ...draft, ...changes };
  renderClimb();
}

const asColumns = (changes) => ('tags' in changes ? { ...changes, tags: joinTags(changes.tags) } : changes);

function togglePanel(panel) {
  const isOpen = openPanel === panel || (panel === 'tags' && openPanel === 'new-tag');
  openPanel = isOpen ? null : panel;
  renderClimb();
  if (openPanel === 'name') nameInput.focus();
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
  openPanel = 'tags';
  if (tag && !tags.includes(tag)) changeClimb({ tags: [...tags, tag] });
  else renderClimb();
}

function fillForm(attempt) {
  savePlace({ gym: attempt.gym });
  openPanel = null;
  form = { grade: attempt.grade, name: attempt.name ?? '', tags: tagsOf(attempt), result: attempt.result, style: attempt.style };
}

function readForm() {
  return { ...form, name: form.name.trim(), tags: joinTags(form.tags) };
}

function saveAttempt(id, { timestamp, result, style, ...climbFields }) {
  const { climb } = allAttempts().find((attempt) => attempt.timestamp === id);
  undoable(() => {
    climbs.updateWhere((attempt) => attempt.climb === climb, climbFields);
    climbs.update(id, { result, style, timestamp });
  });
}

function setHtml(element, html) {
  if (renderedHtml.get(element) === html) return;
  renderedHtml.set(element, html);
  element.innerHTML = html;
}

const optionHtml = (value, label) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;

const chipHtml = (action, key, value, isPressed, label = value) => `<button type="button" class="chip ${action}-chip" data-action="${action}"
  data-${key}="${escapeHtml(value)}" aria-pressed="${isPressed}" aria-label="${escapeHtml(label)}">${escapeHtml(value)}</button>`;

function renderStyles() {
  const edited = editedForm();
  const styles = Object.entries(STYLES).filter(([style]) => !edited || kindOf(style) === kindOf(edited.style));
  setHtml(styleSelect, styles.map(([style, label]) => optionHtml(style, label)).join(''));
  styleSelect.value = currentStyle();
  styleSelect.disabled = styles.length < 2;
}

function renderGrades() {
  const grade = shownGrade();
  const label = (option) => (option === UNGRADED ? 'No grade' : option);
  setHtml(gradeChips, gradeOptions().map((option) => chipHtml('grade', 'grade', option, option === grade, label(option))).join(''));
}

function renderCard() {
  const edited = editedForm();
  const selected = selectedClimb();
  const climb = shownClimb();
  const isTagsOpen = openPanel === 'tags' || openPanel === 'new-tag';
  cardEl.classList.toggle('is-current', Boolean(edited || selected));
  cardGrade.textContent = shownGrade();
  cardTitle.textContent = edited ? 'Editing attempt' : climb.name || (selected ? 'Climb' : 'New climb');
  cardMeta.textContent = cardMetaText(edited, selected);
  newButton.hidden = Boolean(edited || !selected);
  nameToggle.textContent = climb.name ? 'Rename' : '+ Name';
  nameToggle.setAttribute('aria-expanded', openPanel === 'name');
  tagsToggle.textContent = climb.tags.join(', ') || '+ Tags';
  tagsToggle.classList.toggle('is-set', climb.tags.length > 0);
  tagsToggle.setAttribute('aria-expanded', isTagsOpen);
  nameInput.hidden = openPanel !== 'name';
  if (nameInput !== document.activeElement) nameInput.value = climb.name;
  tagChips.hidden = !isTagsOpen;
  tagForm.hidden = openPanel !== 'new-tag';
  setHtml(tagChips, tagChipsHtml(climb.tags));
}

function cardMetaText(edited, selected) {
  if (edited) return formatWhen(new Date(editor.editingId()));
  if (!selected) return 'Starts with your next attempt';
  const today = liveSession()?.attempts.filter((attempt) => attempt.climb === selected.id).length ?? 0;
  const before = selected.attempts.length - today;
  if (!today) return `${countText(before, 'attempt')} before`;
  return before ? `${countText(today, 'attempt')} · ${before} before` : countText(today, 'attempt');
}

function tagChipsHtml(tags) {
  const allTags = [...new Set([...DEFAULT_TAGS, ...allAttempts().flatMap(tagsOf), ...tags])];
  const chips = allTags.map((tag) => chipHtml('tag', 'tag', tag, tags.includes(tag))).join('');
  return openPanel === 'new-tag' ? chips : `${chips}<button type="button" class="chip chip-new tag-chip" data-action="add-tag" aria-label="New tag">+</button>`;
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
}

function renderHistory() {
  const sessions = climbingSessions(allAttempts()).filter((session) => session.gym === currentGym());
  const view = { selectedId: place.selected, editingId: editor.editingId(), canPick: true };
  analysisLink.hidden = !sessions.length;
  setHtml(historyEl, projectsHtml() + climbHistoryHtml(sessions, climbContext(), view));
}

function projectsHtml() {
  const live = new Set(liveSession()?.attempts.map((attempt) => attempt.climb));
  const projects = openProjects(allAttempts(), currentGym(), currentKind()).filter((project) => !live.has(project.id));
  return projects.length ? `<h2 class="label climb-subhead">Projects</h2>${projectListHtml(projects, removingProject)}` : '';
}
