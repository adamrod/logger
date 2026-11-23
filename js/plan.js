import { formatIsoDate } from './format.js';

export function weekPath(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
  return `plans/${formatIsoDate(monday)}.md`;
}

export function dayPlan(text, date) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(`## ${formatIsoDate(date)}`));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return rest.slice(0, end === -1 ? undefined : end).join('\n').trim();
}
