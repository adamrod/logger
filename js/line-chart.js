import { formatShortDay, roundValue } from './format.js';

const HEIGHT = 160;
const PLOT = { top: 8, right: 40, bottom: 20 };
const NICE_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
const MAX_TICK_INTERVALS = 10;

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

function dateLabelsHtml(points, { right }) {
  const first = points[0];
  if (points.length === 1) return axisDateHtml(first.x, first.date, 'middle');
  return axisDateHtml(0, first.date, 'start') + axisDateHtml(right, points.at(-1).date, 'end');
}

function axisDateHtml(x, date, anchor) {
  return `<text class="axis-label" x="${x}" y="${HEIGHT - 4}" text-anchor="${anchor}">${formatShortDay(date)}</text>`;
}

const selectionHtml = ({ x, y }) => `
  <line class="crosshair" x1="${x}" x2="${x}" y1="${PLOT.top}" y2="${HEIGHT - PLOT.bottom}"/>
  <circle class="marker" cx="${x}" cy="${y}" r="4"/>`;

const round = (value) => Math.round(value * 10) / 10;
