import { isTop } from './climbing.js';
import { escapeHtml } from './format.js';

const percent = (part, whole) => `${Math.round((part / whole) * 100)}%`;

export const sectionHtml = (title, content, legend = '') => (content ? `
  <section class="analysis-section">
    <div class="section-head"><h2 class="label">${escapeHtml(title)}</h2>${legend}</div>
    ${content}
  </section>` : '');

export function statTilesHtml(tiles) {
  const tileHtml = ([label, value, detail = '']) => `
    <div class="stat">
      <span class="stat-value">${escapeHtml(value ?? '—')}${detail ? ` <span class="stat-detail">${escapeHtml(detail)}</span>` : ''}</span>
      <span class="stat-label">${escapeHtml(label)}</span>
    </div>`;
  return `<div class="stats">${tiles.map(tileHtml).join('')}</div>`;
}

export const topsDetail = (tops, attempts) => (attempts ? percent(tops, attempts) : '');

export const flashRateText = (rate) => (rate === null ? null : percent(rate, 1));

export const DOTS_LEGEND = '<span class="legend"><span class="dot is-top"></span>top<span class="dot"></span>attempt</span>';

export const CELLS_LEGEND = '<span class="legend"><span class="cell is-sent"></span>sent<span class="cell"></span>not yet</span>';

const dotsHtml = (attempts) => `<span class="dots">${attempts.map((attempt) => `<span class="dot${isTop(attempt) ? ' is-top' : ''}"></span>`).join('')}</span>`;

export function attemptRowsHtml(byGrade) {
  const rowHtml = ({ grade, attempts }) => `
    <li class="grade-row">
      <span class="climb-grade">${escapeHtml(grade)}</span>${dotsHtml(attempts)}
      <span class="grade-count">${attempts.filter(isTop).length}/${attempts.length}</span>
    </li>`;
  return byGrade.length ? `<ul class="grade-rows">${byGrade.map(rowHtml).join('')}</ul>` : '';
}

export function pyramidHtml(pyramid) {
  const cells = (sent, total) => Array.from({ length: total }, (_, i) => `<span class="cell${i < sent ? ' is-sent' : ''}"></span>`).join('');
  const rowHtml = ({ grade, sent, total }) => `
    <li class="grade-row">
      <span class="climb-grade">${escapeHtml(grade)}</span><span class="cells">${cells(sent, total)}</span>
      <span class="grade-count">${sent} of ${total}</span>
    </li>`;
  return pyramid.length ? `<ul class="grade-rows">${pyramid.map(rowHtml).join('')}</ul>` : '';
}

export function tagBarsHtml(counts) {
  const rowHtml = ({ tag, sent, total }) => `
    <li class="tag-bar">
      <span class="tag-name">${escapeHtml(tag)}</span>
      <span class="tag-track"><span class="tag-fill" style="width: ${percent(sent, total)}"></span></span>
      <span class="grade-count">${sent} of ${total}</span>
    </li>`;
  return counts.length ? `<ul class="tag-bars">${counts.map(rowHtml).join('')}</ul>` : '';
}
