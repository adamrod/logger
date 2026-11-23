import { formatIsoDate, formatShortDay } from './format.js';

export const weekStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));

export const addWeeks = (monday, count) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7 * count);

export function formatWeek(monday, today) {
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const range = monday.getMonth() === sunday.getMonth()
    ? `${monday.getDate()}–${formatShortDay(sunday)}`
    : `${formatShortDay(monday)} – ${formatShortDay(sunday)}`;
  return sunday.getFullYear() === today.getFullYear() ? range : `${range} ${sunday.getFullYear()}`;
}

export const weekPath = (date) => `plans/${formatIsoDate(weekStart(date))}.md`;

export function dayPlan(text, date) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(`## ${formatIsoDate(date)}`));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return rest.slice(0, end === -1 ? undefined : end).join('\n').trim();
}
