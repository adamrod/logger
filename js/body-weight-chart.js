import { createRangePicker } from './chart-controls.js';
import { entryDate } from './entry-log.js';
import { onAction } from './events.js';
import { formatChange, formatDay, roundValue } from './format.js';
import { createLineChart } from './line-chart.js';
import { bodyWeights } from './store.js';

const section = document.getElementById('chart');
const valueEl = document.getElementById('chart-value');
const dateEl = document.getElementById('chart-date');
const changeEl = document.getElementById('chart-change');
const extremesEl = document.getElementById('chart-extremes');
const minEl = document.getElementById('chart-min');
const maxEl = document.getElementById('chart-max');
const chart = createLineChart(document.getElementById('chart-plot'), showPoint);

let rangePicker;
let extremes = { min: 0, max: 0 };

export function initChart() {
  rangePicker = createRangePicker('chart', renderChart);
  onAction([extremesEl], { min: () => chart.selectAt(extremes.min), max: () => chart.selectAt(extremes.max) });
}

export function renderChart() {
  const all = bodyWeights.getEntries();
  section.hidden = all.length === 0;
  rangePicker.show();
  const entries = rangePicker.filter(all);
  changeEl.textContent = changeText(entries);
  showExtremes(entries);
  chart.draw(entries.map((entry) => ({ date: entryDate(entry), value: entry.weight })));
}

function changeText(entries) {
  if (entries.length < 2) return '';
  return formatChange(entries.at(-1).weight - entries[0].weight, entryDate(entries[0]));
}

function showExtremes(entries) {
  extremesEl.hidden = entries.length === 0;
  if (!entries.length) return;
  const weights = entries.map((entry) => entry.weight);
  extremes = { min: weights.indexOf(Math.min(...weights)), max: weights.indexOf(Math.max(...weights)) };
  minEl.textContent = roundValue(weights[extremes.min]);
  maxEl.textContent = roundValue(weights[extremes.max]);
}

function showPoint(point) {
  valueEl.textContent = point ? roundValue(point.value) : '';
  dateEl.textContent = point ? formatDay(point.date) : 'No weights in this range.';
}
