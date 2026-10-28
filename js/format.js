const LOCALE = 'en-GB';
const DAY_MS = 24 * 60 * 60 * 1000;
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

export const roundValue = (value) => Math.round(value * 100) / 100;

export const describeSet = ({ variant, reps, weight }) => [variant, `${reps} × ${roundValue(weight)}`].filter(Boolean).join(' · ');

export const formatTime = (date) => date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });

export function formatWhen(date) {
  const year = date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric';
  const day = date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year });
  return `${day} · ${formatTime(date)}`;
}

export function formatDay(date) {
  const daysAgo = Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY_MS);
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  const year = date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric';
  return date.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', year });
}

export const dayKey = (date) => startOfDay(date).getTime();

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
