import { bestDayIndex, dailySeries, defaultMetric, isEstimable, repRecords } from './analysis.js';
import { createRangePicker, markPressed } from './chart-controls.js';
import { revealPressedChip } from './chip-row.js';
import { entryDate } from './entry-log.js';
import { onAction } from './events.js';
import { allVariants } from './exercises.js';
import { countText, escapeHtml, formatChange, formatDay, formatSet, roundValue } from './format.js';
import { createLineChart } from './line-chart.js';
import { currentExercise, currentVariant } from './log-screen.js';
import { bodyWeights, sets } from './store.js';

const MIN_STEPS = { weight: 0, relative: 1, reps: 1, volume: 1, estimated: 0 };

const titleEl = document.getElementById('analysis-title');
const summaryEl = document.getElementById('analysis-summary');
const variantsEl = document.getElementById('analysis-variants');
const emptyEl = document.getElementById('analysis-empty');
const chartsEl = document.getElementById('analysis-charts');
const metricGroup = document.getElementById('daily-metrics');
const relativeToggle = document.getElementById('relative-toggle');
const estimatedToggle = document.getElementById('estimated-toggle');
const dailyValue = document.getElementById('daily-value');
const dailyDetail = document.getElementById('daily-detail');
const dailyDate = document.getElementById('daily-date');
const dailyChange = document.getElementById('daily-change');
const dailyMax = document.getElementById('daily-max');
const dailyMaxValue = document.getElementById('daily-max-value');
const barsEl = document.getElementById('rep-max-bars');
const recordValue = document.getElementById('rep-max-value');
const recordDate = document.getElementById('rep-max-date');
const dailyChart = createLineChart(document.getElementById('daily-plot'), showDaily);

let rangePicker;
let exercise;
let variant = '';
let chosenMetric = null;
let records = [];
let bestDay = 0;
let selectedWeight = null;
let isVariantPicked = false;

const actions = {
  variant: ({ name }) => { variant = name; isVariantPicked = true; renderAnalysis(); },
  metric: ({ metric: name }) => { chosenMetric = name; renderAnalysis(); },
  bar: ({ index }) => showRecord(Number(index)),
  max: () => dailyChart.selectAt(bestDay),
};

export function initAnalysis() {
  rangePicker = createRangePicker('analysis', renderAnalysis);
  onAction([variantsEl, metricGroup, dailyMax, barsEl], actions);
}

export function enterAnalysis() {
  exercise = currentExercise();
  variant = currentVariant();
  isVariantPicked = true;
  chosenMetric = null;
  selectedWeight = null;
  barsEl.scrollLeft = 0;
}

export function renderAnalysis() {
  const variants = allVariants(exercise);
  const exerciseSets = sets.getEntries().filter((set) => set.exercise === exercise && (!variant || set.variant === variant));
  const shownSets = rangePicker.filter(exerciseSets);
  const weighIns = bodyWeights.getEntries();
  const available = { relative: weighIns.length > 0, estimated: shownSets.some(isEstimable) };
  const metric = shownMetric(shownSets, available);
  const daily = dailySeries(shownSets, metric, weighIns);
  titleEl.textContent = exercise ?? '';
  summaryEl.textContent = `${countText(daily.length, 'day')} · ${countText(shownSets.length, 'set')}`;
  rangePicker.show();
  variantsEl.hidden = variants.length === 0;
  variantsEl.innerHTML = ['', ...variants].map(chipHtml).join('');
  if (isVariantPicked) revealPressedChip(variantsEl);
  isVariantPicked = false;
  emptyEl.hidden = shownSets.length > 0;
  chartsEl.hidden = shownSets.length === 0;
  relativeToggle.hidden = !available.relative;
  estimatedToggle.hidden = !available.estimated;
  if (!shownSets.length) return;
  renderDaily(daily, metric);
  renderRecords(shownSets);
}

function shownMetric(shownSets, available) {
  if (!chosenMetric || available[chosenMetric] === false) return defaultMetric(shownSets);
  return chosenMetric;
}

function renderDaily(daily, metric) {
  markPressed(metricGroup, 'metric', metric);
  dailyChange.textContent = daily.length < 2 ? '' : formatChange(daily.at(-1).value - daily[0].value, daily[0].date);
  bestDay = bestDayIndex(daily, metric);
  dailyMax.hidden = daily.length < 2;
  dailyMaxValue.textContent = valueText(daily[bestDay]);
  dailyChart.draw(daily, { minStep: MIN_STEPS[metric] });
}

function showDaily(point) {
  dailyValue.textContent = point ? valueText(point) : '';
  dailyDetail.textContent = point ? detailText(point) : '';
  dailyDate.textContent = point ? whenText(point.date, point.set) : '';
}

function valueText(point) {
  if (point.bodyWeight) return `${point.value}%`;
  return point.set && !point.isEstimate ? formatSet(point.set) : point.value;
}

function detailText(point) {
  if (point.bodyWeight) return `${formatSet(point.set)} · BW ${point.bodyWeight}`;
  return point.isEstimate ? formatSet(point.set) : '';
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
  recordValue.textContent = formatSet(record);
  recordDate.textContent = whenText(entryDate(record), record);
}

function barHtml({ reps, weight }, index, mostReps) {
  const shownWeight = roundValue(weight);
  return `
    <button type="button" class="bar" data-action="bar" data-index="${index}" aria-label="${shownWeight}: ${countText(reps, 'rep')}"
      style="--share: ${reps / mostReps}">
      <span class="bar-reps">${reps}</span><span class="bar-fill"></span><span class="bar-weight">${shownWeight}</span>
    </button>`;
}

function chipHtml(name) {
  const value = escapeHtml(name);
  return `<button type="button" class="chip" data-action="variant" data-name="${value}"
    aria-pressed="${name === variant}">${value || 'All'}</button>`;
}

const whenText = (date, set) => [formatDay(date), !variant && set?.variant].filter(Boolean).join(' · ');
