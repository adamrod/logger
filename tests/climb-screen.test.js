import { monthValue } from '../js/calendar.js';
import { enterClimbCalendar, initClimbCalendar, renderClimbCalendar } from '../js/climb-calendar-screen.js';
import { enterClimbProgress, initClimbProgress, renderClimbProgress } from '../js/climb-progress-screen.js';
import { climbPlace, initClimb, renderClimb, revealClimbs } from '../js/climb-screen.js';
import { enterClimbSession, initClimbSession, renderClimbSession } from '../js/climb-session-screen.js';
import { climbingSessions, numberGrades, openProjects } from '../js/climbing.js';
import { onChange } from '../js/events.js';
import { formatDateTimeValue } from '../js/format.js';
import { saveGym } from '../js/gyms.js';
import { climbs } from '../js/store.js';
import { nextRedo, nextUndo, trackPlace } from '../js/undo.js';
import { assertEqual, test } from './harness.js';
import { element } from './setup.js';

const GYM = 'Boulder hall';

let isOpen = false;

function openClimb() {
  if (isOpen) return;
  isOpen = true;
  saveGym(null, GYM, numberGrades(9));
  initClimb();
  initClimbSession();
  initClimbCalendar();
  initClimbProgress();
  onChange(renderClimb);
  renderClimb();
}

const click = (containerId, dataset) => element(containerId).dispatch('click', { target: { closest: () => ({ dataset }) } });

const controls = (dataset) => click('climb-controls', dataset);

const log = (result) => controls({ action: 'log', result });

const logAll = (results) => [...results].forEach((result) => log(result === 'T' ? 'top' : 'attempt'));

const last = () => climbs.getEntries().at(-1);

const attemptsOf = (climb) => climbs.getEntries().filter((attempt) => attempt.climb === climb);

const isShown = (id, text) => element(id).innerHTML.includes(text);

function change(id, value) {
  element(id).value = value;
  element(id).dispatch('change', {});
}

const submit = (id) => element(id).dispatch('submit', { preventDefault: () => {} });

function pickGym(name) {
  click('gym-picker', { action: 'pick', name });
}

function startFresh(grade) {
  pickGym(GYM);
  change('climb-style', 'boulder');
  controls({ action: 'new-climb' });
  controls({ action: 'grade', grade });
}

async function withPlaces(run) {
  trackPlace(() => ({ screen: 'climb', ...climbPlace() }));
  try {
    await run();
  } finally {
    trackPlace(() => null);
  }
}

test('an attempt keeps the climb chosen, a top starts a new climb at the same grade', () => {
  openClimb();
  startFresh('5');
  logAll('AT');
  const { climb } = last();
  assertEqual(attemptsOf(climb).map((attempt) => [attempt.grade, attempt.result]), [['5', 'attempt'], ['5', 'top']], 'same climb');
  log('attempt');
  assertEqual([last().climb !== climb, last().grade], [true, '5'], 'next climb');
});

test('tapping another grade starts a new climb, tapping its own grade or New keeps the grade', () => {
  openClimb();
  startFresh('6');
  log('attempt');
  const { climb } = last();
  controls({ action: 'grade', grade: '6' });
  log('attempt');
  assertEqual(last().climb, climb, 'same grade');
  controls({ action: 'grade', grade: '7' });
  log('attempt');
  assertEqual([last().climb !== climb, last().grade], [true, '7'], 'other grade');
  const seven = last().climb;
  controls({ action: 'new-climb' });
  log('attempt');
  assertEqual([last().climb !== seven, last().grade], [true, '7'], 'New');
});

test('a name and tags given before the first attempt go with the new climb, and a custom tag is offered next time', () => {
  openClimb();
  startFresh('4');
  change('climb-name', ' Blue slab ');
  controls({ action: 'tag', tag: 'Slab' });
  controls({ action: 'add-tag' });
  element('tag-name').value = 'Heel|hook';
  submit('tag-form');
  log('attempt');
  assertEqual([last().name, last().tags], ['Blue slab', 'Slab|Heelhook'], 'logged');
  controls({ action: 'new-climb' });
  assertEqual(isShown('climb-tags', 'data-tag="Heelhook"'), true, 'offered');
});

test('renaming and tagging the chosen climb changes every attempt on it', () => {
  openClimb();
  startFresh('3');
  logAll('AA');
  const { climb } = last();
  change('climb-name', 'Arete');
  controls({ action: 'tag', tag: 'Roof' });
  assertEqual(attemptsOf(climb).map((attempt) => [attempt.name, attempt.tags]), [['Arete', 'Roof'], ['Arete', 'Roof']]);
});

test('editing an attempt changes its result and time, and moves the whole climb to the new grade and name', () => {
  openClimb();
  startFresh('3');
  logAll('AA');
  const [first, second] = attemptsOf(last().climb);
  click('climb-history', { action: 'edit', id: second.timestamp });
  assertEqual([element('climb-log-buttons').hidden, element('climb-result-field').hidden], [true, false], 'while editing');
  controls({ action: 'grade', grade: '8' });
  change('climb-name', 'Crack');
  controls({ action: 'edit-result', result: 'top' });
  const earlier = new Date(Date.parse(first.timestamp) - 3600000);
  element('climb-when').value = formatDateTimeValue(earlier);
  controls({ action: 'save' });
  const edited = attemptsOf(first.climb);
  assertEqual(edited.map((attempt) => [attempt.grade, attempt.name, attempt.result]), [['8', 'Crack', 'top'], ['8', 'Crack', 'attempt']], 'saved');
  assertEqual(new Date(edited[0].timestamp).getHours(), earlier.getHours(), 'moved earlier');
  assertEqual([element('climb-log-buttons').hidden, element('climb-result-field').hidden], [false, true], 'after saving');
});

test('a deleted attempt is gone, and undo brings it back', async () => {
  openClimb();
  await withPlaces(async () => {
    startFresh('2');
    logAll('AA');
    const { climb, timestamp } = last();
    click('climb-history', { action: 'edit', id: timestamp });
    controls({ action: 'delete' });
    assertEqual(element('climb-delete-actions').hidden, false, 'asks first');
    controls({ action: 'confirm-delete' });
    assertEqual(attemptsOf(climb).length, 1, 'deleted');
    await revealClimbs(nextUndo());
    assertEqual(attemptsOf(climb).length, 2, 'undone');
  });
});

test('deleting the only attempt of the chosen climb goes back to a new climb at its grade', () => {
  openClimb();
  startFresh('6');
  log('attempt');
  click('climb-history', { action: 'edit', id: last().timestamp });
  controls({ action: 'delete' });
  controls({ action: 'confirm-delete' });
  assertEqual([element('climb-title').textContent, element('climb-grade').textContent], ['New climb', '6']);
});

test('undoing a top brings its climb back as the chosen climb, redoing lets it go again', async () => {
  openClimb();
  await withPlaces(async () => {
    startFresh('2');
    log('attempt');
    const { climb } = last();
    log('top');
    await revealClimbs(nextUndo());
    assertEqual(climbPlace().selected, climb, 'undone');
    await revealClimbs(nextRedo());
    assertEqual([climbPlace().selected, last().result], [null, 'top'], 'redone');
  });
});

test('Lead starts a new climb on French grades, and top rope after lead stays on that route', () => {
  openClimb();
  startFresh('5');
  log('attempt');
  change('climb-style', 'lead');
  assertEqual([climbPlace().selected, isShown('grade-chips', 'data-grade="6a+"')], [null, true], 'new route');
  controls({ action: 'grade', grade: '6b' });
  log('attempt');
  const { climb } = last();
  change('climb-style', 'toprope');
  log('top');
  assertEqual(attemptsOf(climb).map((attempt) => [attempt.style, attempt.grade]), [['lead', '6b'], ['toprope', '6b']]);
});

test('picking a project from another day goes back to its gym and style and continues it', () => {
  openClimb();
  startFresh('9');
  change('climb-name', 'Moon');
  log('attempt');
  const { climb } = last();
  change('climb-style', 'lead');
  log('attempt');
  click('climb-history', { action: 'pick', climb });
  log('attempt');
  assertEqual([last().climb, last().style, attemptsOf(climb).length], [climb, 'boulder', 2]);
});

test('removing a project clears its name, so it leaves the projects', () => {
  openClimb();
  startFresh('9');
  change('climb-name', 'Roof crack');
  log('attempt');
  const { climb } = last();
  const isProject = () => openProjects(climbs.getEntries(), GYM, 'boulder').some((project) => project.id === climb);
  assertEqual(isProject(), true, 'named');
  click('climb-history', { action: 'remove-project', climb });
  click('climb-history', { action: 'confirm-remove-project', climb });
  assertEqual([isProject(), last().name], [false, ''], 'removed');
});

test('adding a gym from the menu opens its form in place of the climbing controls and picks it once saved', () => {
  openClimb();
  click('gym-picker', { action: 'add', name: 'Cave' });
  assertEqual([element('gym-form').hidden, element('climb-controls').hidden], [false, true], 'form open');
  submit('gym-form');
  assertEqual([element('gym-form').hidden, element('climb-controls').hidden, climbPlace().gym], [true, false, 'Cave'], 'saved');
  assertEqual(isShown('grade-chips', 'data-grade="6A+"'), true, 'Font grades');
});

test('a custom grade list keeps its order and drops blanks and repeats', () => {
  openClimb();
  click('gym-picker', { action: 'add', name: 'Colours' });
  click('gym-form', { action: 'scale', scale: 'custom' });
  element('gym-custom').value = ' Yellow, Green,,Blue\nGreen , Red|';
  submit('gym-form');
  assertEqual(element('grade-chips').innerHTML.match(/data-grade="[^"]+"/g), ['data-grade="Yellow"', 'data-grade="Green"', 'data-grade="Blue"', 'data-grade="Red"']);
  pickGym(GYM);
});

test('a gym name already taken in any case is refused', () => {
  openClimb();
  click('gym-picker', { action: 'add', name: 'boulder HALL' });
  submit('gym-form');
  assertEqual([element('gym-form').hidden, element('gym-error').hidden], [false, false]);
  click('gym-form', { action: 'cancel' });
});

test('renaming and rescaling the current gym keeps the chosen climb', () => {
  openClimb();
  startFresh('5');
  log('attempt');
  const { climb } = last();
  click('gym-picker', { action: 'edit-gym', name: GYM });
  element('gym-name').value = 'North wall';
  click('gym-form', { action: 'count', steps: '1' });
  submit('gym-form');
  assertEqual([climbPlace().gym, climbPlace().selected, last().gym], ['North wall', climb, 'North wall'], 'renamed');
  assertEqual(isShown('grade-chips', 'data-grade="10"'), true, 'one more grade');
  change('climb-style', 'lead');
  click('gym-picker', { action: 'edit-gym', name: 'North wall' });
  element('gym-name').value = 'North face';
  submit('gym-form');
  assertEqual(element('climb-style').value, 'lead', 'style kept through the rename');
  change('climb-style', 'boulder');
  saveGym('North face', 'North wall', numberGrades(10));
  saveGym('North wall', GYM, numberGrades(9));
});

test('the session stopwatch starts with a new session and stays stopped within it once stopped', () => {
  openClimb();
  const label = () => element('session-stopwatch-toggle').getAttribute('aria-label');
  saveGym(null, 'Crag', numberGrades(5));
  pickGym('Crag');
  log('attempt');
  assertEqual(label(), 'Stop session', 'started');
  controls({ action: 'session-stopwatch-toggle' });
  log('attempt');
  assertEqual(label(), 'Start session', 'stopped within the session');
});

test('the session report shows the latest session, steps back, and edits an attempt on Climb', () => {
  openClimb();
  startFresh('4');
  log('attempt');
  const { timestamp } = last();
  enterClimbSession();
  renderClimbSession();
  assertEqual(isShown('climb-session-body', 'Attempts by grade'), true, 'report');
  assertEqual(element('climb-session-next').disabled, true, 'latest');
  click('climb-session-steps', { action: 'step', step: '-1' });
  const previous = climbingSessions(climbs.getEntries()).at(-2);
  assertEqual(location.hash, `#climb-session/${previous.id}`, 'stepped back');
  click('climb-session-body', { action: 'edit', id: timestamp });
  assertEqual([location.hash, element('climb-log-buttons').hidden], ['#climb', true], 'editing on Climb');
  controls({ action: 'cancel-edit' });
});

test('the calendar marks days with a session and steps through months', () => {
  openClimb();
  const now = new Date();
  enterClimbCalendar(monthValue(now));
  renderClimbCalendar();
  assertEqual(isShown('climb-calendar-grid', 'has-session'), true, 'marked');
  click('climb-calendar-steps', { action: 'step', step: '-1' });
  assertEqual(location.hash, `#climb-calendar/${monthValue(new Date(now.getFullYear(), now.getMonth() - 1, 1))}`, 'stepped back');
  click('climb-calendar-steps', { action: 'today' });
  assertEqual(location.hash, `#climb-calendar/${monthValue(now)}`, 'today');
});

test('progress shows the chosen discipline at the current gym', () => {
  openClimb();
  startFresh('6');
  log('top');
  enterClimbProgress();
  renderClimbProgress();
  assertEqual([element('climb-progress-title').textContent, isShown('climb-progress-body', 'Pyramid')], [GYM, true], 'boulders');
  click('climb-progress-kinds', { action: 'kind', kind: 'rope' });
  assertEqual(isShown('climb-progress-body', '6b'), true, 'routes');
});
