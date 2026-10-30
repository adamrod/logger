const LOCALE = 'en-GB';
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const SIGNS = { '-1': '−', 0: '±', 1: '+' };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

export const roundValue = (value) => Math.round(value * 100) / 100;

export const formatSet = ({ reps, weight }) => `${reps} × ${roundValue(weight)}`;

export const describeSet = (set) => [set.variant, formatSet(set)].filter(Boolean).join(' · ');

export const formatTime = (date) => date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });

export function formatWhen(date) {
  const year = date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric';
  const day = date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year });
  return `${day} · ${formatTime(date)}`;
}

export const formatShortDay = (date) => date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });

export function formatChange(delta, since) {
  const rounded = roundValue(delta);
  return `${SIGNS[Math.sign(rounded)]}${Math.abs(rounded)} since ${formatShortDay(since)}`;
}

export function formatDay(date) {
  const weekday = date.toLocaleDateString(LOCALE, { weekday: 'short' });
  return `${formatIsoDate(date)} ${weekday}`;
}

export function formatShortWhen(date) {
  const isToday = dayKey(date) === dayKey(new Date());
  return isToday ? formatTime(date) : `${formatIsoDate(date)} ${formatTime(date)}`;
}

export const dayKey = (date) => startOfDay(date).getTime();

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

function formatIsoDate(date) {
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
