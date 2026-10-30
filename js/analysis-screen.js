import { dailySeries, defaultMetric, repRecords } from './analysis.js';
import { entriesInRange, markPressed } from './chart-controls.js';
import { entryDate } from './entry-log.js';
import { onAction } from './events.js';
import { allExercises, allVariants } from './exercises.js';
import { describeSet, escapeHtml, formatChange, formatDay, formatSet, roundValue } from './format.js';
import { createLineChart } from './line-chart.js';
import { currentExercise, currentVariant } from './log-screen.js';
import { sets } from './store.js';

const HEADINGS = { weight: 'Max weight', reps: 'Max reps', volume: 'Volume' };
const MIN_STEPS = { weight: 0, reps: 1, volume: 1 };

const screen = document.getElementById('screen-analysis');
const titleEl = document.getElementById('analysis-title');
const exerciseSelect = document.getElementById('analysis-exercise');
const summaryEl = document.getElementById('analysis-summary');
const rangeGroup = document.getElementById('analysis-ranges');
const variantsEl = document.getElementById('analysis-variants');
const emptyEl = document.getElementById('analysis-empty');
const chartsEl = document.getElementById('analysis-charts');
const dailyHeading = document.getElementById('daily-heading');
const metricGroup = document.getElementById('daily-metrics');
const dailyValue = document.getElementById('daily-value');
const dailyDate = document.getElementById('daily-date');
const dailyChange = document.getElementById('daily-change');
const barsEl = document.getElementById('rep-max-bars');
const recordValue = document.getElementById('rep-max-value');
const recordDate = document.getElementById('rep-max-date');
const dailyChart = createLineChart(document.getElementById('daily-plot'), showDaily);

let range = 'All';
let exercise;
let variant = '';
let chosenMetric = null;
let records = [];
let selectedWeight = null;

const actions = {
  range: ({ range: name }) => { range = name; renderAnalysis(); },
  variant: ({ name }) => { variant = name; renderAnalysis(); },
  metric: ({ metric: name }) => { chosenMetric = name; renderAnalysis(); },
  bar: ({ index }) => showRecord(Number(index)),
};

export function initAnalysis() {
  onAction([screen], actions);
  exerciseSelect.addEventListener('change', () => { showExercise(exerciseSelect.value, ''); renderAnalysis(); });
  window.addEventListener('resize', renderAnalysis);
}

export function enterAnalysis() {
  showExercise(currentExercise(), currentVariant());
}

export function renderAnalysis() {
  const variants = allVariants(exercise);
  const exerciseSets = sets.getEntries().filter((set) => set.exercise === exercise && (!variant || set.variant === variant));
  const shownSets = entriesInRange(exerciseSets, range);
  const metric = chosenMetric ?? defaultMetric(shownSets);
  const daily = dailySeries(shownSets, metric);
  titleEl.textContent = exercise ?? '';
  exerciseSelect.innerHTML = loggedExercises().map(optionHtml).join('');
  summaryEl.textContent = `${countText(daily.length, 'day')} · ${countText(shownSets.length, 'set')}`;
  markPressed(rangeGroup, 'range', range);
  variantsEl.hidden = variants.length === 0;
  variantsEl.innerHTML = ['', ...variants].map(chipHtml).join('');
  emptyEl.hidden = shownSets.length > 0;
  chartsEl.hidden = shownSets.length === 0;
  if (!shownSets.length) return;
  renderDaily(daily, metric);
  renderRecords(shownSets);
}

function showExercise(name, variantName) {
  exercise = name;
  variant = variantName;
  chosenMetric = null;
  selectedWeight = null;
  barsEl.scrollLeft = 0;
}

function renderDaily(daily, metric) {
  markPressed(metricGroup, 'metric', metric);
  dailyHeading.textContent = HEADINGS[metric];
  dailyChange.textContent = daily.length < 2 ? '' : formatChange(daily.at(-1).value - daily[0].value, daily[0].date);
  dailyChart.draw(daily, { minStep: MIN_STEPS[metric] });
}

function showDaily(point) {
  dailyValue.textContent = point ? (point.set ? setText(point.set) : point.value) : '';
  dailyDate.textContent = point ? formatDay(point.date) : '';
}

function renderRecords(shownSets) {
  records = repRecords(shownSets);
  const mostReps = Math.max(...records.map((record) => record.reps));
  barsEl.innerHTML = records.map((record, index) => barHtml(record, index, mostReps)).join('');
  showRecord(Math.max(0, records.findIndex((record) => record.weight === selectedWeight)));
}

function showRecord(index) {
  const record = records[index];
  selectedWeight = record.weight;
  barsEl.querySelectorAll('.bar').forEach((bar, i) => bar.setAttribute('aria-pressed', i === index));
  recordValue.textContent = setText(record);
  recordDate.textContent = formatDay(entryDate(record));
}

function barHtml({ reps, weight }, index, mostReps) {
  const shownWeight = roundValue(weight);
  return `
    <button type="button" class="bar" data-action="bar" data-index="${index}" aria-label="${shownWeight}: ${countText(reps, 'rep')}"
      style="--share: ${reps / mostReps}">
      <span class="bar-reps">${reps}</span><span class="bar-fill"></span><span class="bar-weight">${shownWeight}</span>
    </button>`;
}

function optionHtml(name) {
  const value = escapeHtml(name);
  return `<option value="${value}"${name === exercise ? ' selected' : ''}>${value}</option>`;
}

function chipHtml(name) {
  const value = escapeHtml(name);
  return `<button type="button" class="chip" data-action="variant" data-name="${value}"
    aria-pressed="${name === variant}">${value || 'All'}</button>`;
}

const loggedExercises = () => allExercises().filter((name) => name === exercise || sets.getEntries().some((set) => set.exercise === name));

const setText = (set) => (variant ? formatSet(set) : describeSet(set));

const countText = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;
