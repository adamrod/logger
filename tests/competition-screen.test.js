import { hasLiveCompetition, initCompetition, renderCompetition } from '../js/competition-screen.js';
import { onChange } from '../js/events.js';
import { formatDateTimeValue } from '../js/format.js';
import { competitionAttempts, competitions } from '../js/store.js';
import { nextUndo } from '../js/undo.js';
import { assertEqual, test } from './harness.js';
import { element } from './setup.js';

const MINUTE = 60000;
const NEXT_YEAR = new Date().getFullYear() + 1;

let isOpen = false;

function openCompetitions() {
  if (isOpen) return;
  isOpen = true;
  element('competition-form').hidden = true;
  initCompetition();
  onChange(renderCompetition);
  renderCompetition();
}

const click = (containerId, dataset) => element(containerId).dispatch('click', { target: { closest: () => ({ dataset }) } });

const controls = (dataset) => click('competition-controls', dataset);

const form = (dataset) => click('competition-form', dataset);

const submit = () => element('competition-form').dispatch('submit', { preventDefault: () => {} });

const named = (name) => competitions.getEntries().find((competition) => competition.name === name);

const attemptsOf = (name) => competitionAttempts.getEntries().filter((attempt) => attempt.competition === named(name).timestamp);

const resultsOf = (name) => attemptsOf(name).map((attempt) => [attempt.boulder, attempt.result]);

const isShown = (id, text) => element(id).innerHTML.includes(text);

const tileIs = (boulder, state) => isShown('competition-board', `class="boulder is-${state}" data-action="boulder" data-boulder="${boulder}"`);

function addCompetition(name, fields = {}) {
  click('competition-picker', { action: 'add', name });
  fillForm({ start: `${NEXT_YEAR}-03-07T10:00`, end: `${NEXT_YEAR}-03-07T12:00`, ...fields });
  submit();
}

function change(id, value) {
  element(id).value = value;
  element(id).dispatch('change', {});
}

const when = (minutesFromNow) => formatDateTimeValue(new Date(Date.now() + minutesFromNow * MINUTE));

function fillForm(fields) {
  Object.entries(fields).forEach(([field, value]) => { element(`competition-${field}`).value = value; });
}

function logOn(boulder, results) {
  controls({ action: 'boulder', boulder: String(boulder) });
  [...results].forEach((letter) => controls({ action: 'log', result: { A: 'attempt', Z: 'zone', T: 'top' }[letter] }));
}

test('with no competition yet the form opens, and saving it shows a board of its boulders', () => {
  openCompetitions();
  assertEqual([element('competition-form').hidden, element('competition-controls').hidden], [false, true], 'form shown first');
  fillForm({ name: ' Spring Open ', start: `${NEXT_YEAR}-03-01T14:00`, end: `${NEXT_YEAR}-03-01T16:30`, first: '11', last: '40' });
  submit();
  const { name, start, end, first, last, topPoints, zonePoints } = named('Spring Open');
  assertEqual([name, first, last, topPoints, zonePoints], ['Spring Open', 11, 40, 10, 1], 'saved');
  assertEqual([start, end].map((time) => formatDateTimeValue(new Date(time))), [`${NEXT_YEAR}-03-01T14:00`, `${NEXT_YEAR}-03-01T16:30`], 'times');
  assertEqual([element('competition-form').hidden, element('competition-controls').hidden], [true, false], 'board shown');
  assertEqual([tileIs(11, 'untouched'), tileIs(40, 'untouched'), isShown('competition-board', 'data-boulder="41"')], [true, true, false], 'tiles');
});

test('the log buttons wait for a boulder to be picked', () => {
  openCompetitions();
  addCompetition('Waiting Open');
  assertEqual(element('competition-log-top').disabled, true, 'nothing picked');
  controls({ action: 'boulder', boulder: '3' });
  assertEqual([element('competition-log-top').disabled, element('competition-boulder-title').textContent], [false, 'Boulder 3'], 'picked');
});

test('each try is logged on the picked boulder and the board and score follow', () => {
  openCompetitions();
  addCompetition('Autumn Open');
  logOn(14, 'AZ');
  logOn(2, 'T');
  logOn(7, 'A');
  assertEqual(resultsOf('Autumn Open'), [[14, 'attempt'], [14, 'zone'], [2, 'top'], [7, 'attempt']], 'logged');
  assertEqual([tileIs(14, 'zone'), tileIs(2, 'top'), tileIs(7, 'tried'), tileIs(1, 'untouched')], [true, true, true, true], 'tiles');
  assertEqual(isShown('competition-score', '<span class="stat-value">11</span>'), true, 'points');
  controls({ action: 'boulder', boulder: '14' });
  assertEqual(element('competition-boulder-meta').textContent, '2 attempts · zone', 'picked boulder');
});

test('a logged try can be changed to another result or removed', () => {
  openCompetitions();
  addCompetition('Fix Open');
  logOn(5, 'AA');
  const [first, second] = attemptsOf('Fix Open');
  controls({ action: 'toggle-attempts' });
  assertEqual(isShown('competition-attempts', `data-id="${first.timestamp}"`), true, 'tries listed');
  controls({ action: 'next-result', id: second.timestamp, result: second.result });
  controls({ action: 'remove-attempt', id: first.timestamp });
  assertEqual(resultsOf('Fix Open'), [[5, 'zone']], 'changed');
  assertEqual(tileIs(5, 'zone'), true, 'tile');
});

test('two competitions cannot share a name', () => {
  openCompetitions();
  addCompetition('Twin Open');
  addCompetition('twin open');
  assertEqual(element('competition-error').hidden, false, 'refused');
  form({ action: 'cancel' });
  assertEqual(competitions.getEntries().filter((competition) => competition.name.toLowerCase() === 'twin open').length, 1, 'kept one');
});

test('moving the start moves the end with it, and an end before the start is refused', () => {
  openCompetitions();
  addCompetition('Late Open');
  click('competition-actions', { action: 'edit' });
  change('competition-start', `${NEXT_YEAR}-03-08T10:30`);
  assertEqual(element('competition-end').value, `${NEXT_YEAR}-03-08T12:30`, 'end moved');
  fillForm({ end: `${NEXT_YEAR}-03-08T10:30` });
  submit();
  assertEqual(element('competition-error').hidden, false, 'refused');
  fillForm({ end: `${NEXT_YEAR}-03-08T13:00` });
  submit();
  assertEqual(formatDateTimeValue(new Date(named('Late Open').end)), `${NEXT_YEAR}-03-08T13:00`, 'saved');
});

test('editing a competition keeps the tries logged in it', () => {
  openCompetitions();
  addCompetition('Edit Open');
  logOn(9, 'T');
  click('competition-actions', { action: 'edit' });
  fillForm({ name: 'Edited Open', last: '20' });
  submit();
  assertEqual([named('Edited Open').last, resultsOf('Edited Open')], [20, [[9, 'top']]], 'saved');
  assertEqual([tileIs(9, 'top'), isShown('competition-board', 'data-boulder="21"')], [true, false], 'board');
});

test('deleting a competition takes its tries with it, and undo brings both back', () => {
  openCompetitions();
  addCompetition('Gone Open');
  logOn(1, 'AT');
  const { timestamp } = named('Gone Open');
  click('competition-actions', { action: 'edit' });
  form({ action: 'delete' });
  form({ action: 'confirm-delete' });
  const left = () => competitionAttempts.getEntries().filter((attempt) => attempt.competition === timestamp).length;
  assertEqual([named('Gone Open') ?? null, left()], [null, 0], 'deleted');
  nextUndo().apply();
  assertEqual([named('Gone Open').timestamp, left()], [timestamp, 2], 'restored');
});

test('a running competition shows the time left and counts as live', () => {
  openCompetitions();
  assertEqual(hasLiveCompetition(), false, 'none running');
  assertEqual([element('competition-meta').hidden, element('competition-main-label').textContent], [false, 'Starts in'], 'before the start');
  addCompetition('Live Open', { start: when(-30), end: when(90) });
  assertEqual(hasLiveCompetition(), true, 'running');
  assertEqual([element('competition-meta').hidden, element('competition-main-label').textContent], [true, 'Left'], 'clock');
});
