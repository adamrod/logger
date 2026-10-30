import { dailySeries, defaultMetric, repRecords } from './analysis.js';
import { entriesInRange, markPressed } from './chart-controls.js';
import { entryDate } from './entry-log.js';
import { onAction } from './events.js';
import { allVariants } from './exercises.js';
import { describeSet, escapeHtml, formatChange, formatDay, roundValue } from './format.js';
import { createLineChart } from './line-chart.js';
import { currentExercise, currentVariant } from './log-screen.js';
import { sets } from './store.js';

const HEADINGS = { weight: 'Max weight', reps: 'Max reps', volume: 'Volume' };
const MIN_STEPS = { weight: 0, reps: 1, volume: 1 };

const screen = document.getElementById('screen-analysis');
const titleEl = document.getElementById('analysis-title');
const summaryEl = document.getElementById('analysis-summary');
const rangeGroup = document.getElementById('analysis-ranges');
const variantsEl = document.getElementById('analysis-variants');
const emptyEl = document.getElementById('analysis-empty');
const chartsEl = document.getElementById('analysis-charts');
const dayHeading = document.getElementById('day-heading');
const metricGroup = document.getElementById('day-metrics');
const dayValue = document.getElementById('day-value');
const dayDate = document.getElementById('day-date');
const dayChange = document.getElementById('day-change');
const barsEl = document.getElementById('rep-max-bars');
const barValue = document.getElementById('rep-max-value');
const barDate = document.getElementById('rep-max-date');
const chart = createLineChart(document.getElementById('day-plot'), showDay);

let range = 'All';
let variant = '';
let metric = null;
let followed = {};
let records = [];
let selectedWeight = null;

const actions = {
  range: ({ range: name }) => { range = name; renderAnalysis(); },
  variant: ({ name }) => { variant = name; renderAnalysis(); },
  metric: ({ metric: name }) => { metric = name; renderAnalysis(); },
  bar: ({ index }) => showRecord(Number(index)),
};

export function initAnalysis() {
  onAction([screen], actions);
  window.addEventListener('resize', renderAnalysis);
}

export function renderAnalysis() {
  followSets();
  const exercise = currentExercise();
  const variants = allVariants(exercise);
  const shown = entriesInRange(sets.getEntries().filter((set) => set.exercise === exercise && (!variant || set.variant === variant)), range);
  const shownMetric = metric ?? defaultMetric(shown);
  const days = dailySeries(shown, shownMetric);
  titleEl.textContent = exercise ?? '';
  summaryEl.textContent = `${countText(days.length, 'day')} · ${countText(shown.length, 'set')}`;
  markPressed(rangeGroup, 'range', range);
  variantsEl.hidden = variants.length === 0;
  variantsEl.innerHTML = ['', ...variants].map(chipHtml).join('');
  emptyEl.hidden = shown.length > 0;
  chartsEl.hidden = shown.length === 0;
  if (!shown.length) return;
  renderDays(days, shownMetric);
  renderRecords(shown);
}

function followSets() {
  const exercise = currentExercise();
  const setsVariant = currentVariant();
  if (exercise === followed.exercise && setsVariant === followed.variant) return;
  followed = { exercise, variant: setsVariant };
  variant = setsVariant;
  metric = null;
  selectedWeight = null;
  barsEl.scrollLeft = 0;
}

function renderDays(days, shownMetric) {
  markPressed(metricGroup, 'metric', shownMetric);
  dayHeading.textContent = HEADINGS[shownMetric];
  dayChange.textContent = days.length < 2 ? '' : formatChange(days.at(-1).value - days[0].value, days[0].date);
  chart.draw(days, { minStep: MIN_STEPS[shownMetric] });
}

function showDay(point) {
  dayValue.textContent = point ? dayText(point) : '';
  dayDate.textContent = point ? formatDay(point.date) : '';
}

const dayText = ({ set, value }) => (set ? describeSet(set) : value);

function renderRecords(shown) {
  records = repRecords(shown);
  const mostReps = Math.max(...records.map((record) => record.reps));
  barsEl.innerHTML = records.map((record, index) => barHtml(record, index, mostReps)).join('');
  showRecord(Math.max(0, records.findIndex((record) => record.weight === selectedWeight)));
}

function showRecord(index) {
  const record = records[index];
  selectedWeight = record.weight;
  barsEl.querySelectorAll('.bar').forEach((bar, i) => bar.setAttribute('aria-pressed', i === index));
  barValue.textContent = describeSet(record);
  barDate.textContent = formatDay(entryDate(record));
}

function barHtml({ reps, weight }, index, mostReps) {
  const shownWeight = roundValue(weight);
  return `
    <button type="button" class="bar" data-action="bar" data-index="${index}" aria-label="${shownWeight}: ${reps} reps"
      style="--share: ${reps / mostReps}">
      <span class="bar-reps">${reps}</span><span class="bar-fill"></span><span class="bar-weight">${shownWeight}</span>
    </button>`;
}

function chipHtml(name) {
  const value = escapeHtml(name);
  return `<button type="button" class="chip" data-action="variant" data-name="${value}"
    aria-pressed="${name === variant}">${value || 'All'}</button>`;
}

const countText = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;
