import { goalEta, trendSeries, trendText, weeklyRate } from '../js/body-weight-trend.js';
import { formatIsoDate } from '../js/format.js';
import { assertEqual, test } from './harness.js';

const DAY_MS = 86400000;
const start = new Date(2026, 9, 1, 7).getTime();
const weighIn = (day, weight) => ({ timestamp: new Date(start + day * DAY_MS).toISOString(), weight });
const point = (day, value) => ({ date: new Date(start + day * DAY_MS), value });
const tenth = (value) => Math.round(value * 10) / 10;

test('the trend starts at the first weigh-in and moves a tenth of the way to a weigh-in a day later', () => {
  assertEqual(trendSeries([weighIn(0, 70), weighIn(1, 60)]).map(({ value }) => tenth(value)), [70, 69]);
});

test('the trend moves further towards a weigh-in after a longer gap', () => {
  assertEqual(tenth(trendSeries([weighIn(0, 70), weighIn(7, 60)]).at(-1).value), 64.8);
});

test('the weekly rate is the slope of the last four weeks of the trend', () => {
  const trend = Array.from({ length: 60 }, (_, day) => point(day, day < 32 ? 70 : 70 - (day - 32) * 0.1));
  assertEqual(tenth(weeklyRate(trend)), -0.7);
});

test('there is no weekly rate before two weeks of trend', () => {
  assertEqual(weeklyRate([point(0, 70), point(13, 69)]), null);
});

test('the goal date is when the rate brings the trend to the nearer bound of the goal', () => {
  const goal = { low: 62, high: 64 };
  assertEqual(formatIsoDate(goalEta(point(0, 65), -0.5, goal)), '2026-10-15', 'losing');
  assertEqual([goalEta(point(0, 65), 0.5, goal), goalEta(point(0, 63), -0.5, goal), goalEta(point(0, 80), -0.1, goal)],
    [null, null, null], 'moving away, on goal, over a year away');
});

test('the trend line reads the trend, the weekly rate and the goal date when each is known', () => {
  const trend = Array.from({ length: 29 }, (_, day) => point(day, 66 - day * 0.1));
  assertEqual(trendText(trend, { low: 62, high: 64 }), 'Trend 63.2 · −0.7/week');
  assertEqual(trendText(trend, { low: 60, high: 62 }), 'Trend 63.2 · −0.7/week · goal 2026-11-10');
  assertEqual(trendText([point(0, 66)], null), 'Trend 66');
});
