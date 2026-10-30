const LOCALE = 'en-GB';
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const DAY_MS = 86400000;
const SIGNS = { '-1': '−', 0: '±', 1: '+' };

const pad = (number) => String(number).padStart(2, '0');

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

export const formatMonth = (date) => (date.getMonth() === 0
  ? String(date.getFullYear())
  : date.toLocaleDateString(LOCALE, { month: 'short' }));

export function formatDelta(delta) {
  const rounded = roundValue(delta);
  return `${SIGNS[Math.sign(rounded)]}${Math.abs(rounded)}`;
}

export const formatChange = (delta, since) => `${formatDelta(delta)} since ${formatShortDay(since)}`;

export function formatDay(date) {
  const weekday = date.toLocaleDateString(LOCALE, { weekday: 'short' });
  return `${formatIsoDate(date)} ${weekday}`;
}

export function formatShortWhen(date) {
  const isToday = dayKey(date) === dayKey(new Date());
  return isToday ? formatTime(date) : `${formatIsoDate(date)} ${formatTime(date)}`;
}

export const dayKey = (date) => startOfDay(date).getTime();

export const daysBetween = (from, to) => Math.round((dayKey(to) - dayKey(from)) / DAY_MS);

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${pad(seconds % 60)}`;
}

export const formatDateTimeValue = (date) => `${formatIsoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function parseDateTimeValue(value) {
  const [year, month, day, hours, minutes] = value.split(/\D/).map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

function formatIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
