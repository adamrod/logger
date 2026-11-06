import { isTop } from './climbing.js';
import { entryDate } from './entry-log.js';
import { escapeHtml, formatShortDay, formatTime } from './format.js';

const WIDTH = 350;
const HEIGHT = 160;
const PLOT = { left: 40, right: 8, top: 10, bottom: 24 };
const MAX_GRADE_LINES = 7;
const LABEL_OFFSET = 4;

const round = (value) => Math.round(value * 10) / 10;

function gradeAxis(ranks, grades) {
  const low = Math.min(...ranks);
  const high = Math.max(...ranks);
  const bottom = HEIGHT - PLOT.bottom;
  const y = (rank) => (high === low ? (PLOT.top + bottom) / 2 : PLOT.top + ((high - rank) / (high - low)) * (bottom - PLOT.top));
  const step = Math.ceil((high - low + 1) / MAX_GRADE_LINES);
  const lines = [];
  for (let rank = high; rank >= low; rank -= step) {
    const lineY = round(y(rank));
    lines.push(`<line class="grid" x1="${PLOT.left}" x2="${WIDTH - PLOT.right}" y1="${lineY}" y2="${lineY}"/>
      <text class="axis-label" x="${PLOT.left - 10}" y="${lineY + LABEL_OFFSET}" text-anchor="end">${escapeHtml(grades[rank])}</text>`);
  }
  return { y, html: lines.join('') };
}

function timeAxis(from, to) {
  const right = WIDTH - PLOT.right;
  return (time) => round(to === from ? (PLOT.left + right) / 2 : PLOT.left + ((time - from) / (to - from)) * (right - PLOT.left));
}

function edgeLabels(first, last) {
  const y = HEIGHT - 6;
  return `<text class="axis-label" x="${PLOT.left}" y="${y}">${first}</text>
    <text class="axis-label" x="${WIDTH - PLOT.right}" y="${y}" text-anchor="end">${last}</text>`;
}

const svg = (label, content) => `<svg class="climb-chart" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeHtml(label)}">${content}</svg>`;

export function attemptTimelineSvg(attempts, grades) {
  const ranked = attempts.filter((attempt) => grades.includes(attempt.grade));
  if (!ranked.length) return '';
  const times = ranked.map((attempt) => entryDate(attempt).getTime());
  const axis = gradeAxis(ranked.map((attempt) => grades.indexOf(attempt.grade)), grades);
  const x = timeAxis(times[0], times.at(-1));
  const dots = ranked.map((attempt, i) => `<circle class="${isTop(attempt) ? 'dot-top' : 'dot-attempt'}"
    cx="${x(times[i])}" cy="${round(axis.y(grades.indexOf(attempt.grade)))}" r="4.5"/>`).join('');
  const label = `Attempts by grade from ${formatTime(new Date(times[0]))} to ${formatTime(new Date(times.at(-1)))}`;
  return svg(label, axis.html + dots + edgeLabels(formatTime(new Date(times[0])), formatTime(new Date(times.at(-1)))));
}

export function sessionHighsSvg(highs, grades) {
  const ranks = highs.flatMap(({ send, flash }) => [send, flash]).filter(Boolean).map((grade) => grades.indexOf(grade));
  if (!ranks.length) return '';
  const axis = gradeAxis(ranks, grades);
  const times = highs.map(({ date }) => date.getTime());
  const x = timeAxis(times[0], times.at(-1));
  const pointsOf = (key) => highs
    .map((high, i) => (high[key] ? [x(times[i]), round(axis.y(grades.indexOf(high[key])))] : null))
    .filter(Boolean);
  const line = (points, className) => `<polyline class="${className}" points="${points.map((point) => point.join(',')).join(' ')}"/>`;
  const dots = (points, className) => points.map(([cx, cy]) => `<circle class="${className}" cx="${cx}" cy="${cy}" r="4"/>`).join('');
  const sends = pointsOf('send');
  const flashes = pointsOf('flash');
  const content = axis.html
    + line(flashes, 'line-flash') + line(sends, 'line-send')
    + dots(flashes, 'dot-attempt') + dots(sends, 'dot-top')
    + edgeLabels(formatShortDay(highs[0].date), formatShortDay(highs.at(-1).date));
  return svg(`Hardest send and flash in ${highs.length} sessions`, content);
}
