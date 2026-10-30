import { entriesInRange, markPressed } from './chart-controls.js';
import { entryDate } from './entry-log.js';
import { onAction } from './events.js';
import { formatChange, formatDay, roundValue } from './format.js';
import { createLineChart } from './line-chart.js';
import { bodyWeights } from './store.js';

const section = document.getElementById('chart');
const rangeGroup = document.getElementById('chart-ranges');
const valueEl = document.getElementById('chart-value');
const dateEl = document.getElementById('chart-date');
const changeEl = document.getElementById('chart-change');
const extremesEl = document.getElementById('chart-extremes');
const chart = createLineChart(document.getElementById('chart-plot'), showPoint);

let range = 'All';

export function initChart() {
  onAction([rangeGroup], { range: ({ range: name }) => { range = name; renderChart(); } });
}

export function renderChart() {
  const all = bodyWeights.getEntries();
  section.hidden = all.length === 0;
  markPressed(rangeGroup, 'range', range);
  const entries = entriesInRange(all, range);
  changeEl.textContent = changeText(entries);
  extremesEl.textContent = extremesText(entries);
  chart.draw(entries.map((entry) => ({ date: entryDate(entry), value: entry.weight })));
}

function changeText(entries) {
  if (entries.length < 2) return '';
  return formatChange(entries.at(-1).weight - entries[0].weight, entryDate(entries[0]));
}

function extremesText(entries) {
  if (!entries.length) return '';
  const weights = entries.map((entry) => entry.weight);
  return `Min ${roundValue(Math.min(...weights))} · Max ${roundValue(Math.max(...weights))}`;
}

function showPoint(point) {
  valueEl.textContent = point ? roundValue(point.value) : '';
  dateEl.textContent = point ? formatDay(point.date) : 'No weights in this range.';
}
