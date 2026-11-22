import { goalGap } from './body-weight-goal.js';
import { entryDate } from './entry-log.js';
import { formatDelta, formatIsoDate } from './format.js';

const DAY_MS = 86400000;
const DAILY_SHARE_KEPT = 0.9;
const RATE_DAYS = 28;
const MIN_RATE_SPAN_DAYS = 14;
const MAX_ETA_DAYS = 365;

const toTenth = (value) => Math.round(value * 10) / 10;

const sum = (values) => values.reduce((total, value) => total + value, 0);

const mean = (values) => sum(values) / values.length;

const daysBetween = (from, to) => (to.getTime() - from.getTime()) / DAY_MS;

export function trendSeries(entries) {
  const trend = [];
  entries.forEach((entry) => {
    const date = entryDate(entry);
    const previous = trend.at(-1);
    const share = previous ? 1 - DAILY_SHARE_KEPT ** daysBetween(previous.date, date) : 1;
    trend.push({ date, value: previous ? previous.value + share * (entry.weight - previous.value) : entry.weight });
  });
  return trend;
}

export function weeklyRate(trend) {
  const end = trend.at(-1)?.date;
  const recent = trend.filter((point) => daysBetween(point.date, end) < RATE_DAYS);
  if (!recent.length || daysBetween(recent[0].date, end) < MIN_RATE_SPAN_DAYS) return null;
  return slopePerDay(recent) * 7;
}

export function goalEta(latest, rate, goal) {
  const gap = goalGap(latest.value, goal);
  if (!gap || !rate || Math.sign(rate) === Math.sign(gap)) return null;
  const days = (-gap / rate) * 7;
  return days <= MAX_ETA_DAYS ? new Date(latest.date.getTime() + days * DAY_MS) : null;
}

export function trendText(trend, goal) {
  const latest = trend.at(-1);
  const rate = weeklyRate(trend);
  const eta = goal && rate !== null ? goalEta(latest, rate, goal) : null;
  return [
    `Trend ${toTenth(latest.value)}`,
    rate !== null && `${formatDelta(toTenth(rate))}/week`,
    eta && `goal ${formatIsoDate(eta)}`,
  ].filter(Boolean).join(' · ');
}

function slopePerDay(points) {
  const days = points.map((point) => daysBetween(points[0].date, point.date));
  const meanDay = mean(days);
  const meanValue = mean(points.map((point) => point.value));
  const covariance = sum(points.map((point, i) => (days[i] - meanDay) * (point.value - meanValue)));
  return covariance / sum(days.map((day) => (day - meanDay) ** 2));
}
