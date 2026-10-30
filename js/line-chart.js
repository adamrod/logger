import { formatMonth, formatShortDay, roundValue } from './format.js';

const HEIGHT = 160;
const PLOT = { top: 8, right: 40, bottom: 20 };
const NICE_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
const MAX_TICK_INTERVALS = 10;
const DAY_STEPS = [1, 2, 7, 14];
const MONTH_STEPS = [1, 2, 3, 6, 12, 24];
const MIN_DATE_GAP = 56;
const EDGE_ZONE = 24;
const TICK_LENGTH = 4;

export function createLineChart(plot, onSelect) {
  let points = [];

  function draw(series, { minStep = 0 } = {}) {
    const width = plot.clientWidth;
    if (!width) return;
    const scale = series.length ? createScale(series, width, minStep) : null;
    points = series.map((item) => ({ ...item, x: round(scale.x(item.date.getTime())), y: round(scale.y(item.value)) }));
    plot.setAttribute('viewBox', `0 0 ${width} ${HEIGHT}`);
    plot.innerHTML = scale ? plotHtml(points, scale) : '';
    select(points.at(-1));
  }

  function selectNearest(event) {
    if (!points.length) return;
    const x = event.clientX - plot.getBoundingClientRect().left;
    select(points.reduce((best, point) => (Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best)));
  }

  function select(point) {
    const selection = plot.querySelector('.selection');
    if (selection) selection.innerHTML = selectionHtml(point);
    onSelect(point);
  }

  plot.addEventListener('pointerdown', selectNearest);
  plot.addEventListener('pointermove', selectNearest);
  return { draw };
}

function createScale(series, width, minStep) {
  const ticks = yTicks(series.map((item) => item.value), minStep);
  const first = series[0].date.getTime();
  const span = series.at(-1).date.getTime() - first;
  const right = width - PLOT.right;
  const bottom = HEIGHT - PLOT.bottom;
  const low = ticks[0];
  const high = ticks.at(-1);
  return {
    ticks,
    right,
    x: (time) => (span ? ((time - first) / span) * right : right / 2),
    y: (value) => bottom - ((value - low) / (high - low)) * (bottom - PLOT.top),
  };
}

function yTicks(values, minStep) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const steps = NICE_STEPS.filter((step) => step >= minStep);
  const lowIndex = (step) => Math.floor(roundValue(min / step));
  const highIndex = (step) => Math.max(Math.ceil(roundValue(max / step)), lowIndex(step) + 1);
  const step = steps.find((candidate) => highIndex(candidate) - lowIndex(candidate) <= MAX_TICK_INTERVALS)
    ?? steps.at(-1);
  const low = lowIndex(step);
  return Array.from({ length: highIndex(step) - low + 1 }, (_, i) => roundValue((low + i) * step));
}

function plotHtml(points, scale) {
  const line = points.map(({ x, y }, i) => `${i ? 'L' : 'M'}${x},${y}`).join('');
  const dots = points.map(({ x, y }) => `M${x},${y}h0`).join('');
  return `${gridHtml(scale)}${dateLabelsHtml(points, scale)}<path class="line" d="${line}"/><path class="points" d="${dots}"/>
    <g class="selection"></g>`;
}

function gridHtml({ ticks, right, y }) {
  return ticks.map((tick) => {
    const top = round(y(tick));
    return `<line class="grid" x1="0" x2="${right}" y1="${top}" y2="${top}"/>
      <text class="axis-label" x="${right + 8}" y="${top}" dy="0.35em">${tick}</text>`;
  }).join('');
}

function dateLabelsHtml(points, scale) {
  const ticks = dateTicks(points[0].date, points.at(-1).date, Math.floor(scale.right / MIN_DATE_GAP));
  return ticks.length > 1 ? ticks.map((tick) => dateTickHtml(tick, scale)).join('') : edgeDatesHtml(points, scale);
}

function dateTicks(first, last, maxCount) {
  const fitting = (ticksFor, steps) => steps.map(ticksFor).find((ticks) => ticks.length <= maxCount);
  return fitting((step) => dayTicks(first, last, step), DAY_STEPS)
    ?? fitting((step) => monthTicks(first, last, step), MONTH_STEPS)
    ?? [];
}

function dayTicks(first, last, step) {
  const ticks = [];
  for (const date = nextMidnight(first); date <= last; date.setDate(date.getDate() + step)) {
    ticks.push({ date: new Date(date), label: formatShortDay(date) });
  }
  return ticks;
}

function monthTicks(first, last, step) {
  const ticks = [];
  for (let index = first.getFullYear() * 12 + first.getMonth(); ; index += 1) {
    const date = new Date(Math.floor(index / 12), index % 12, 1);
    if (date > last) return ticks;
    if (date >= first && index % step === 0) ticks.push({ date, label: formatMonth(date) });
  }
}

function nextMidnight(date) {
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (midnight < date) midnight.setDate(midnight.getDate() + 1);
  return midnight;
}

function dateTickHtml({ date, label }, { right, x }) {
  const left = round(x(date.getTime()));
  const bottom = HEIGHT - PLOT.bottom;
  return `<line class="date-tick" x1="${left}" x2="${left}" y1="${bottom}" y2="${bottom + TICK_LENGTH}"/>
    ${axisDateHtml(left, label, anchorAt(left, right))}`;
}

function anchorAt(x, right) {
  if (x < EDGE_ZONE) return 'start';
  return x > right - EDGE_ZONE ? 'end' : 'middle';
}

function edgeDatesHtml(points, { right }) {
  const first = points[0];
  if (points.length === 1) return axisDateHtml(first.x, formatShortDay(first.date), 'middle');
  return axisDateHtml(0, formatShortDay(first.date), 'start') + axisDateHtml(right, formatShortDay(points.at(-1).date), 'end');
}

function axisDateHtml(x, label, anchor) {
  return `<text class="axis-label" x="${x}" y="${HEIGHT - 4}" text-anchor="${anchor}">${label}</text>`;
}

const selectionHtml = ({ x, y }) => `
  <line class="crosshair" x1="${x}" x2="${x}" y1="${PLOT.top}" y2="${HEIGHT - PLOT.bottom}"/>
  <circle class="marker" cx="${x}" cy="${y}" r="4"/>`;

const round = (value) => Math.round(value * 10) / 10;
