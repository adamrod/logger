import { bestDayIndex, dailySeries, defaultMetric, repRecords } from './analysis.js';
import { entriesInRange, markPressed } from './chart-controls.js';
import { revealPressedChip } from './chip-row.js';
import { entryDate } from './entry-log.js';
import { onAction } from './events.js';
import { allVariants } from './exercises.js';
import { escapeHtml, formatChange, formatDay, formatSet, roundValue } from './format.js';
import { createLineChart } from './line-chart.js';
import { currentExercise, currentVariant } from './log-screen.js';
import { bodyWeights, sets } from './store.js';

const HEADINGS = { weight: 'Max weight', relative: 'Max %BW', reps: 'Max reps', volume: 'Volume' };
const MIN_STEPS = { weight: 0, relative: 1, reps: 1, volume: 1 };

const titleEl = document.getElementById('analysis-title');
const summaryEl = document.getElementById('analysis-summary');
const rangeGroup = document.getElementById('analysis-ranges');
const variantsEl = document.getElementById('analysis-variants');
const emptyEl = document.getElementById('analysis-empty');
const chartsEl = document.getElementById('analysis-charts');
const dailyHeading = document.getElementById('daily-heading');
const metricGroup = document.getElementById('daily-metrics');
const relativeToggle = document.getElementById('relative-toggle');
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

let range = 'All';
let exercise;
let variant = '';
let chosenMetric = null;
let records = [];
let bestDay = 0;
let selectedWeight = null;
let isVariantPicked = false;

const actions = {
  range: ({ range: name }) => { range = name; renderAnalysis(); },
  variant: ({ name }) => { variant = name; isVariantPicked = true; renderAnalysis(); },
  metric: ({ metric: name }) => { chosenMetric = name; renderAnalysis(); },
  bar: ({ index }) => showRecord(Number(index)),
  max: () => dailyChart.selectAt(bestDay),
};

export function initAnalysis() {
  onAction([rangeGroup, variantsEl, metricGroup, dailyMax, barsEl], actions);
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
  const shownSets = entriesInRange(exerciseSets, range);
  const weighIns = bodyWeights.getEntries();
  const metric = shownMetric(shownSets, weighIns);
  const daily = dailySeries(shownSets, metric, weighIns);
  titleEl.textContent = exercise ?? '';
  summaryEl.textContent = `${countText(daily.length, 'day')} · ${countText(shownSets.length, 'set')}`;
  markPressed(rangeGroup, 'range', range);
  variantsEl.hidden = variants.length === 0;
  variantsEl.innerHTML = ['', ...variants].map(chipHtml).join('');
  if (isVariantPicked) revealPressedChip(variantsEl);
  isVariantPicked = false;
  emptyEl.hidden = shownSets.length > 0;
  chartsEl.hidden = shownSets.length === 0;
  relativeToggle.hidden = weighIns.length === 0;
  if (!shownSets.length) return;
  renderDaily(daily, metric);
  renderRecords(shownSets);
}

function shownMetric(shownSets, weighIns) {
  if (!chosenMetric || (chosenMetric === 'relative' && !weighIns.length)) return defaultMetric(shownSets);
  return chosenMetric;
}

function renderDaily(daily, metric) {
  markPressed(metricGroup, 'metric', metric);
  dailyHeading.textContent = HEADINGS[metric];
  dailyChange.textContent = daily.length < 2 ? '' : formatChange(daily.at(-1).value - daily[0].value, daily[0].date);
  bestDay = bestDayIndex(daily, metric);
  dailyMax.hidden = daily.length < 2;
  dailyMaxValue.textContent = valueText(daily[bestDay]);
  dailyChart.draw(daily, { minStep: MIN_STEPS[metric] });
}

function showDaily(point) {
  dailyValue.textContent = point ? valueText(point) : '';
  dailyDetail.textContent = point?.bodyWeight ? `${formatSet(point.set)} · BW ${point.bodyWeight}` : '';
  dailyDate.textContent = point ? whenText(point.date, point.set) : '';
}

function valueText(point) {
  if (point.bodyWeight) return `${point.value}%`;
  return point.set ? formatSet(point.set) : point.value;
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

const countText = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;
