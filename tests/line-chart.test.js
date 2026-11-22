import { createLineChart } from '../js/line-chart.js';
import { assertEqual, test } from './harness.js';
import { element } from './setup.js';

function dateLabels(first, last) {
  const plot = element(`chart-${first.getTime()}-${last.getTime()}`);
  plot.clientWidth = 375;
  createLineChart(plot, () => {}).draw([{ date: first, value: 60 }, { date: last, value: 62 }]);
  return [...plot.innerHTML.matchAll(/text-anchor="\w+">([^<]+)</g)].map(([, label]) => label);
}

test('a month-long chart labels a day each week', () => {
  assertEqual(dateLabels(new Date(2026, 9, 1), new Date(2026, 9, 31)), ['1 Oct', '8 Oct', '15 Oct', '22 Oct', '29 Oct']);
});

test('a years-long chart labels every other year', () => {
  assertEqual(dateLabels(new Date(2019, 10, 26), new Date(2026, 9, 31)), ['2020', '2022', '2024', '2026']);
});

function lineEnd(values) {
  const plot = element(`chart-end-${values.join('-')}`);
  plot.clientWidth = 375;
  const dates = [new Date(2026, 9, 1), new Date(2026, 9, 31)];
  createLineChart(plot, () => {}).draw(values.map((value, i) => ({ date: dates[i], value })));
  return Number(plot.innerHTML.match(/class="line" d="[^"]*L([\d.]+),/)[1]);
}

test('the line reaches the label column fitted to whole-number labels', () => {
  assertEqual(lineEnd([60, 70]), 375 - 8 - 2 * 7);
});

test('the line leaves room for wider decimal labels', () => {
  assertEqual(lineEnd([60, 62]), 375 - 8 - 4 * 7);
});

test('a goal band stretches the scale to show its dashed edges beside the weights', () => {
  const plot = element('chart-band');
  plot.clientWidth = 375;
  const dates = [new Date(2026, 9, 1), new Date(2026, 9, 31)];
  createLineChart(plot, () => {}).draw(dates.map((date, i) => ({ date, value: 66 + i })), { band: { low: 62, high: 64 } });
  const edges = [...plot.innerHTML.matchAll(/class="band-edge"[^>]*y1="([\d.]+)"/g)].map(([, y]) => Number(y));
  const labels = [...plot.innerHTML.matchAll(/dy="0.35em">([\d.]+)</g)].map(([, label]) => Number(label));
  assertEqual([labels[0], labels.at(-1)], [62, 67], 'scale');
  assertEqual(edges, [8 + (3 / 5) * 132, 140], 'edges');
});
