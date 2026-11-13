import { monthValue } from '../js/calendar.js';
import { enterClimbCalendar, initClimbCalendar, renderClimbCalendar } from '../js/climb-calendar-screen.js';
import { enterClimbAnalysis, initClimbAnalysis, renderClimbAnalysis } from '../js/climb-analysis-screen.js';
import { climbPlace, initClimb, renderClimb, revealClimbs } from '../js/climb-screen.js';
import { enterClimbSession, initClimbSession, renderClimbSession } from '../js/climb-session-screen.js';
import { enterDayCalendar, initDayCalendar, renderDayCalendar } from '../js/day-calendar-screen.js';
import { climbingSessions, numberGrades, openProjects } from '../js/climbing.js';
import { onChange } from '../js/events.js';
import { formatIsoDate, formatShortDay, formatTime } from '../js/format.js';
import { saveGym } from '../js/gyms.js';
import { climbs } from '../js/store.js';
import { nextRedo, nextUndo, trackPlace } from '../js/undo.js';
import { readTime } from '../js/when-field.js';
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
  initClimbAnalysis();
  initDayCalendar();
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

const editTheClimb = (climb) => click('climb-history', { action: 'edit-climb', climb });

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

test('a boulder with no grade is logged as ?, and grading it later moves the whole climb', () => {
  openClimb();
  startFresh('?');
  assertEqual(isShown('grade-chips', 'aria-label="No grade"'), true, 'offered');
  logAll('AA');
  const { climb } = last();
  assertEqual(attemptsOf(climb).map((attempt) => attempt.grade), ['?', '?'], 'logged');
  editTheClimb(climb);
  controls({ action: 'grade', grade: '6' });
  controls({ action: 'save' });
  assertEqual(attemptsOf(climb).map((attempt) => attempt.grade), ['6', '6'], 'graded later');
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

test('the climb editor changes the grade and name of every attempt, and each attempt\'s result and time', () => {
  openClimb();
  startFresh('3');
  logAll('AA');
  const [first, second] = attemptsOf(last().climb);
  editTheClimb(first.climb);
  assertEqual([element('climb-log-buttons').hidden, element('climb-attempts').hidden], [true, false], 'while editing');
  assertEqual(isShown('climb-attempts', 'aria-label="Time of attempt 2"'), true, 'lists attempts');
  assertEqual(isShown('climb-attempts', `<span class="attempt-day">${formatShortDay(new Date(second.timestamp))}</span>`), true, 'shows the day');
  controls({ action: 'grade', grade: '8' });
  change('climb-name', 'Crack');
  controls({ action: 'toggle-result', id: second.timestamp });
  const earlier = formatTime(new Date(Date.parse(first.timestamp) - 60000));
  element('climb-attempts').dispatch('change', { target: { dataset: { id: first.timestamp }, value: earlier } });
  controls({ action: 'save' });
  const edited = attemptsOf(first.climb);
  assertEqual(edited.map((attempt) => [attempt.grade, attempt.name, attempt.result]), [['8', 'Crack', 'attempt'], ['8', 'Crack', 'top']], 'saved');
  assertEqual(edited[0].timestamp, readTime(first.timestamp, earlier), 'moved');
  assertEqual([element('climb-log-buttons').hidden, element('climb-attempts').hidden], [false, true], 'after saving');
});

test('an attempt removed in the editor is gone once saved, and undo brings it back', async () => {
  openClimb();
  await withPlaces(async () => {
    startFresh('2');
    logAll('AA');
    const { climb, timestamp } = last();
    editTheClimb(climb);
    controls({ action: 'remove-attempt', id: timestamp });
    assertEqual(attemptsOf(climb).length, 2, 'kept until saved');
    controls({ action: 'save' });
    assertEqual(attemptsOf(climb).length, 1, 'removed');
    await revealClimbs(nextUndo());
    assertEqual(attemptsOf(climb).length, 2, 'undone');
  });
});

test('deleting a climb removes all its attempts after asking, and cancelling changes nothing', async () => {
  openClimb();
  await withPlaces(async () => {
    startFresh('2');
    logAll('AAT');
    const { climb } = last();
    editTheClimb(climb);
    controls({ action: 'grade', grade: '9' });
    controls({ action: 'cancel-edit' });
    assertEqual(attemptsOf(climb).map((attempt) => attempt.grade), ['2', '2', '2'], 'cancelled');
    editTheClimb(climb);
    controls({ action: 'delete' });
    assertEqual([element('climb-delete-actions').hidden, element('climb-edit-actions').hidden], [false, true], 'asks first');
    controls({ action: 'confirm-delete' });
    assertEqual(attemptsOf(climb).length, 0, 'deleted');
    await revealClimbs(nextUndo());
    assertEqual(attemptsOf(climb).length, 3, 'undone');
  });
});

test('removing the only attempt of the chosen climb goes back to a new climb at its grade', () => {
  openClimb();
  startFresh('6');
  log('attempt');
  const { climb, timestamp } = last();
  editTheClimb(climb);
  controls({ action: 'remove-attempt', id: timestamp });
  controls({ action: 'save' });
  assertEqual([element('climb-title').textContent, isShown('grade-chips', 'data-grade="6" aria-pressed="true"')], ['New climb', true]);
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

test('projects open from the climb card, not the history, and close once one is picked', () => {
  openClimb();
  startFresh('9');
  change('climb-name', 'Slab');
  log('attempt');
  const { climb } = last();
  controls({ action: 'new-climb' });
  assertEqual([isShown('climb-history', 'Work on Slab'), element('climb-projects-toggle').hidden, element('climb-projects').hidden],
    [false, false, true], 'closed');
  controls({ action: 'toggle-projects' });
  assertEqual([element('climb-projects').hidden, isShown('climb-projects', 'Work on Slab')], [false, true], 'open');
  controls({ action: 'pick', climb });
  assertEqual([climbPlace().selected, element('climb-projects').hidden], [climb, true], 'picked');
});

test('removing a project from the card clears its name, so it leaves the projects', () => {
  openClimb();
  startFresh('9');
  change('climb-name', 'Roof crack');
  log('attempt');
  const { climb } = last();
  const isProject = () => openProjects(climbs.getEntries(), GYM, 'boulder').some((project) => project.id === climb);
  assertEqual(isProject(), true, 'named');
  controls({ action: 'toggle-projects' });
  controls({ action: 'remove-project', climb });
  controls({ action: 'confirm-remove-project', climb });
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
  element('gym-custom').value = ' Yellow, Green,,Blue\nGreen , ?, Red|';
  submit('gym-form');
  assertEqual(element('grade-chips').innerHTML.match(/data-grade="[^"]+"/g), ['data-grade="Yellow"', 'data-grade="Green"', 'data-grade="Blue"', 'data-grade="Red"', 'data-grade="?"']);
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

test('the session report shows the latest session, steps back, and edits a climb on Climb', () => {
  openClimb();
  startFresh('4');
  log('attempt');
  const { climb } = last();
  enterClimbSession();
  renderClimbSession();
  assertEqual(isShown('climb-session-body', 'Attempts by grade'), true, 'report');
  assertEqual(element('climb-session-next').disabled, true, 'latest');
  click('climb-session-steps', { action: 'step', step: '-1' });
  const previous = climbingSessions(climbs.getEntries()).at(-2);
  assertEqual(location.hash, `#climb-session/${previous.id}`, 'stepped back');
  click('climb-session-body', { action: 'edit-climb', climb });
  assertEqual([location.hash, element('climb-log-buttons').hidden], ['#climb', true], 'editing on Climb');
  controls({ action: 'cancel-edit' });
});

test('the calendar marks days with a session and steps through months', () => {
  openClimb();
  const now = new Date();
  enterClimbCalendar(monthValue(now));
  renderClimbCalendar();
  assertEqual(isShown('climb-calendar-grid', 'has-entry'), true, 'marked');
  click('climb-calendar-steps', { action: 'step', step: '-1' });
  assertEqual(location.hash, `#climb-calendar/${monthValue(new Date(now.getFullYear(), now.getMonth() - 1, 1))}`, 'stepped back');
  click('climb-calendar-steps', { action: 'today' });
  assertEqual(location.hash, `#climb-calendar/${monthValue(now)}`, 'today');
});

test('analysis shows the chosen discipline at the current gym', () => {
  openClimb();
  startFresh('6');
  log('top');
  enterClimbAnalysis();
  renderClimbAnalysis();
  assertEqual([element('climb-analysis-title').textContent, isShown('climb-analysis-body', 'Pyramid')], [GYM, true], 'boulders');
  click('climb-analysis-kinds', { action: 'kind', kind: 'rope' });
  assertEqual(isShown('climb-analysis-body', '6b'), true, 'routes');
});

test('the history lists each session at the gym under its date, which opens the session report', () => {
  openClimb();
  startFresh('3');
  log('attempt');
  const session = climbingSessions(climbs.getEntries()).at(-1);
  assertEqual(isShown('climb-history', `data-action="session" data-id="${session.id}"`), true, 'date button');
  click('climb-history', { action: 'session', id: session.id });
  assertEqual(location.hash, `#climb-session/${session.id}`, 'opened');
});

test('a send harder than every earlier session at the gym is marked PR', () => {
  openClimb();
  const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();
  const send = (days, grade) => climbs.add({ timestamp: daysAgo(days), gym: 'Record wall', style: 'boulder', grade, climb: `record${days}`, result: 'top' });
  saveGym(null, 'Record wall', numberGrades(9));
  send(30, '6');
  send(20, '5');
  send(10, '7');
  pickGym('Record wall');
  assertEqual(element('climb-history').innerHTML.match(/set-record/g)?.length, 1);
  pickGym(GYM);
});

test('the Sets calendar lists logged days and links each to its day', () => {
  openClimb();
  enterDayCalendar(monthValue(new Date()));
  renderDayCalendar();
  assertEqual(isShown('calendar-list', `#day/${formatIsoDate(new Date())}`), true, 'today listed');
  assertEqual(isShown('calendar-grid', 'has-entry'), true, 'marked');
});
