import { createRangePicker, markPressed } from './chart-controls.js';
import { sessionHighsSvg } from './climb-charts.js';
import {
  CELLS_LEGEND, flashRateText, pyramidHtml, sectionHtml, statTilesHtml, tagBarsHtml, topsDetail,
} from './climb-report.js';
import { currentGym, currentKind } from './climb-screen.js';
import { climbStats, climbingSessions, gradePyramid, kindOf, sessionHighs, tagCounts } from './climbing.js';
import { onAction } from './events.js';
import { countText } from './format.js';
import { gradesAt } from './gyms.js';
import { climbs } from './store.js';

const LEGEND = '<span class="legend"><span class="dot is-top"></span>send<span class="dot"></span>flash</span>';

const kindsGroup = document.getElementById('climb-analysis-kinds');
const titleEl = document.getElementById('climb-analysis-title');
const summaryEl = document.getElementById('climb-analysis-summary');
const bodyEl = document.getElementById('climb-analysis-body');

let rangePicker;
let kind = 'boulder';

export function initClimbAnalysis() {
  rangePicker = createRangePicker('climb-analysis', renderClimbAnalysis);
  onAction([kindsGroup], { kind: ({ kind: chosen }) => { kind = chosen; renderClimbAnalysis(); } });
}

export function enterClimbAnalysis() {
  kind = currentKind();
}

export function renderClimbAnalysis() {
  const gym = currentGym();
  const all = climbs.getEntries();
  const atGym = all.filter((attempt) => attempt.gym === gym && kindOf(attempt.style) === kind);
  const attempts = rangePicker.filter(atGym);
  const sessions = climbingSessions(attempts);
  rangePicker.show();
  markPressed(kindsGroup, 'kind', kind);
  titleEl.textContent = gym ?? 'Analysis';
  summaryEl.textContent = `${countText(sessions.length, 'session')} · ${countText(attempts.length, 'attempt')}`;
  bodyEl.innerHTML = attempts.length
    ? analysisHtml(attempts, sessions, all, gradesAt(gym, kind))
    : '<p class="empty analysis-empty">Nothing logged in this range.</p>';
}

function analysisHtml(attempts, sessions, all, grades) {
  const stats = climbStats(attempts, all, grades);
  const tiles = statTilesHtml([
    ['Sessions', String(sessions.length)],
    ['Attempts', String(stats.attempts)],
    ['Tops', String(stats.tops), topsDetail(stats.tops, stats.attempts)],
    ['Hardest send', stats.hardestSend],
    ['Hardest flash', stats.hardestFlash],
    ['Flash rate', flashRateText(stats.flashRate)],
  ]);
  return `
    <div class="climb-section">${tiles}</div>
    ${sectionHtml('Hardest per session', sessionHighsSvg(sessionHighs(sessions, all, grades), grades), LEGEND)}
    ${sectionHtml('Pyramid', pyramidHtml(gradePyramid(attempts, all, grades)), CELLS_LEGEND)}
    ${sectionHtml('Sends by tag', tagBarsHtml(tagCounts(attempts, all)))}`;
}
