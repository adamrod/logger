import { entryDate } from './entry-log.js';
import { onAction } from './events.js';
import { formatDay, formatShortDay, roundValue } from './format.js';
import { bodyWeights } from './store.js';

const DAY_MS = 86400000;
const RANGE_DAYS = { '1M': 30, '3M': 91, '1Y': 365, All: Infinity };
const HEIGHT = 160;
const PLOT = { top: 8, right: 40, bottom: 20 };
const NICE_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
const MAX_TICK_INTERVALS = 10;
const SIGNS = { '-1': '−', 0: '±', 1: '+' };

const section = document.getElementById('chart');
const rangeGroup = document.getElementById('chart-ranges');
const valueEl = document.getElementById('chart-value');
const dateEl = document.getElementById('chart-date');
const changeEl = document.getElementById('chart-change');
const extremesEl = document.getElementById('chart-extremes');
const plot = document.getElementById('chart-plot');

let range = '3M';
let points = [];
let selectedId = null;

export function initChart() {
  onAction([rangeGroup], { range: ({ range: name }) => { range = name; renderChart(); } });
  plot.addEventListener('pointerdown', selectNearest);
  plot.addEventListener('pointermove', selectNearest);
  window.addEventListener('resize', renderChart);
}

export function renderChart() {
  const all = bodyWeights.getEntries();
  section.hidden = all.length === 0;
  rangeGroup.querySelectorAll('button').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.range === range);
  });
  const width = plot.clientWidth;
  if (!width) return;

  const entries = entriesInRange(all);
  const scale = entries.length ? createScale(entries, width) : null;
  points = entries.map((entry) => toPoint(entry, scale));
  selectedId = null;
  plot.setAttribute('viewBox', `0 0 ${width} ${HEIGHT}`);
  plot.innerHTML = scale ? plotHtml(scale) : '';
  changeEl.textContent = changeText(entries);
  extremesEl.textContent = extremesText(entries);
  drawSelection();
}

function entriesInRange(entries) {
  const since = Date.now() - RANGE_DAYS[range] * DAY_MS;
  return entries.filter((entry) => entryDate(entry).getTime() >= since);
}

function createScale(entries, width) {
  const ticks = yTicks(entries.map((entry) => entry.weight));
  const first = entryDate(entries[0]).getTime();
  const span = entryDate(entries.at(-1)).getTime() - first;
  const right = width - PLOT.right;
  const bottom = HEIGHT - PLOT.bottom;
  const low = ticks[0];
  const high = ticks.at(-1);
  return {
    ticks,
    right,
    x: (time) => (span ? ((time - first) / span) * right : right / 2),
    y: (weight) => bottom - ((weight - low) / (high - low)) * (bottom - PLOT.top),
  };
}

function yTicks(weights) {
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const lowIndex = (step) => Math.floor(roundValue(min / step));
  const highIndex = (step) => Math.max(Math.ceil(roundValue(max / step)), lowIndex(step) + 1);
  const step = NICE_STEPS.find((candidate) => highIndex(candidate) - lowIndex(candidate) <= MAX_TICK_INTERVALS)
    ?? NICE_STEPS.at(-1);
  const low = lowIndex(step);
  return Array.from({ length: highIndex(step) - low + 1 }, (_, i) => roundValue((low + i) * step));
}

function toPoint(entry, scale) {
  const date = entryDate(entry);
  return { id: entry.timestamp, weight: entry.weight, date, x: round(scale.x(date.getTime())), y: round(scale.y(entry.weight)) };
}

function plotHtml(scale) {
  const line = points.map(({ x, y }, i) => `${i ? 'L' : 'M'}${x},${y}`).join('');
  const dots = points.map(({ x, y }) => `M${x},${y}h0`).join('');
  return `${gridHtml(scale)}${dateLabelsHtml(scale)}<path class="line" d="${line}"/><path class="points" d="${dots}"/>
    <g class="selection"></g>`;
}

function gridHtml({ ticks, right, y }) {
  return ticks.map((tick) => {
    const top = round(y(tick));
    return `<line class="grid" x1="0" x2="${right}" y1="${top}" y2="${top}"/>
      <text class="axis-label" x="${right + 8}" y="${top}" dy="0.35em">${tick}</text>`;
  }).join('');
}

function dateLabelsHtml({ right }) {
  const first = points[0];
  if (points.length === 1) return axisDateHtml(first.x, first.date, 'middle');
  return axisDateHtml(0, first.date, 'start') + axisDateHtml(right, points.at(-1).date, 'end');
}

function axisDateHtml(x, date, anchor) {
  return `<text class="axis-label" x="${x}" y="${HEIGHT - 4}" text-anchor="${anchor}">${formatShortDay(date)}</text>`;
}

function changeText(entries) {
  if (entries.length < 2) return '';
  const delta = roundValue(entries.at(-1).weight - entries[0].weight);
  return `${SIGNS[Math.sign(delta)]}${Math.abs(delta)} since ${formatShortDay(entryDate(entries[0]))}`;
}

function extremesText(entries) {
  if (!entries.length) return '';
  const weights = entries.map((entry) => entry.weight);
  return `Min ${roundValue(Math.min(...weights))} · Max ${roundValue(Math.max(...weights))}`;
}

function selectNearest(event) {
  if (!points.length) return;
  const x = event.clientX - plot.getBoundingClientRect().left;
  const nearest = points.reduce((best, point) => (Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best));
  selectedId = nearest.id;
  drawSelection();
}

function drawSelection() {
  const point = points.find((p) => p.id === selectedId) ?? points.at(-1);
  valueEl.textContent = point ? roundValue(point.weight) : '';
  dateEl.textContent = point ? formatDay(point.date) : 'No weights in this range.';
  const selection = plot.querySelector('.selection');
  if (selection) {
    selection.innerHTML = `
      <line class="crosshair" x1="${point.x}" x2="${point.x}" y1="${PLOT.top}" y2="${HEIGHT - PLOT.bottom}"/>
      <circle class="marker" cx="${point.x}" cy="${point.y}" r="4"/>`;
  }
}

const round = (value) => Math.round(value * 10) / 10;
