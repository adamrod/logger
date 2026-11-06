import { climbPlace, initClimb, renderClimb, revealClimbs } from '../js/climb-screen.js';
import { numberGrades, openProjects } from '../js/climbing.js';
import { onChange } from '../js/events.js';
import { saveGym } from '../js/gyms.js';
import { climbs } from '../js/store.js';
import { nextUndo, trackPlace } from '../js/undo.js';
import { assertEqual, test } from './harness.js';
import { element } from './setup.js';

let isOpen = false;

function openClimb() {
  if (isOpen) return;
  isOpen = true;
  saveGym(null, 'Boulder hall', numberGrades(9));
  initClimb();
  onChange(renderClimb);
  renderClimb();
}

const click = (containerId, dataset) => element(containerId).dispatch('click', { target: { closest: () => ({ dataset }) } });

const controls = (dataset) => click('climb-controls', dataset);

const log = (result) => controls({ action: 'log', result });

const last = () => climbs.getEntries().at(-1);

const attemptsOf = (climb) => climbs.getEntries().filter((attempt) => attempt.climb === climb);

function startFresh(grade) {
  controls({ action: 'new-climb' });
  controls({ action: 'grade', grade });
}

test('an attempt keeps the climb chosen, a top starts a new climb at the same grade', () => {
  openClimb();
  startFresh('5');
  log('attempt');
  const { climb } = last();
  log('top');
  assertEqual([last().climb, last().grade, last().result], [climb, '5', 'top'], 'top on the same climb');
  log('attempt');
  assertEqual([last().climb !== climb, last().grade], [true, '5'], 'next climb');
});

test('tapping another grade starts a new climb, tapping its own grade keeps it', () => {
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
});

test('a name and tags given before the first attempt go with the new climb', () => {
  openClimb();
  startFresh('4');
  element('climb-name').value = ' Blue slab ';
  element('climb-name').dispatch('change', {});
  controls({ action: 'tag', tag: 'Slab' });
  log('attempt');
  assertEqual([last().name, last().tags], ['Blue slab', 'Slab']);
});

test('editing an attempt changes its result and moves every attempt of the climb to the new grade', () => {
  openClimb();
  startFresh('3');
  log('attempt');
  log('attempt');
  const { climb, timestamp } = last();
  click('climb-history', { action: 'edit', id: timestamp });
  assertEqual(element('climb-log-buttons').hidden, true, 'log buttons while editing');
  controls({ action: 'grade', grade: '8' });
  controls({ action: 'edit-result', result: 'top' });
  controls({ action: 'save' });
  assertEqual(attemptsOf(climb).map((attempt) => [attempt.grade, attempt.result]), [['8', 'attempt'], ['8', 'top']]);
  assertEqual(element('climb-log-buttons').hidden, false, 'log buttons after saving');
});

test('undoing a top brings its climb back as the current climb', async () => {
  openClimb();
  trackPlace(() => ({ screen: 'climb', ...climbPlace() }));
  startFresh('2');
  log('attempt');
  const { climb } = last();
  log('top');
  await revealClimbs(nextUndo());
  log('attempt');
  assertEqual([attemptsOf(climb).length, last().climb], [2, climb]);
  trackPlace(() => null);
});

test('removing a project clears its name, so it leaves the projects', () => {
  openClimb();
  startFresh('9');
  element('climb-name').value = 'Roof crack';
  element('climb-name').dispatch('change', {});
  log('attempt');
  const { climb } = last();
  const isProject = () => openProjects(climbs.getEntries(), 'Boulder hall', 'boulder').some((project) => project.id === climb);
  assertEqual(isProject(), true, 'named');
  click('climb-history', { action: 'confirm-remove-project', climb });
  assertEqual([isProject(), last().name], [false, ''], 'removed');
});

test('renaming a gym moves its climbs and keeps it chosen', () => {
  openClimb();
  startFresh('5');
  log('attempt');
  saveGym('Boulder hall', 'North wall', numberGrades(9));
  assertEqual([last().gym, climbPlace().gym], ['North wall', 'North wall']);
  saveGym('North wall', 'Boulder hall', numberGrades(9));
});
