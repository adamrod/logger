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
