const LOCALE = 'en-GB';
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const DAY_MS = 86400000;
const SIGNS = { '-1': '−', 0: '±', 1: '+' };

const dateFormat = (options) => new Intl.DateTimeFormat(LOCALE, options);
const TIME = dateFormat({ hour: '2-digit', minute: '2-digit' });
const DAY_MONTH = dateFormat({ day: 'numeric', month: 'short' });
const DAY_MONTH_YEAR = dateFormat({ day: 'numeric', month: 'short', year: 'numeric' });
const MONTH = dateFormat({ month: 'short' });
const MONTH_YEAR = dateFormat({ month: 'long', year: 'numeric' });
const WEEKDAY = dateFormat({ weekday: 'short' });
const LONG_DAY = dateFormat({ weekday: 'long', day: 'numeric', month: 'long' });
const LONG_DAY_YEAR = dateFormat({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const pad = (number) => String(number).padStart(2, '0');

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

export const roundValue = (value) => Math.round(value * 100) / 100;

export const formatSet = ({ reps, weight }) => `${reps} × ${roundValue(weight)}`;

export const describeSet = (set) => [set.variant, formatSet(set)].filter(Boolean).join(' · ');

export const formatTime = (date) => TIME.format(date);

export const formatClock = (date) => [date.getHours(), date.getMinutes(), date.getSeconds()].map(pad).join(':');

export function formatWhen(date) {
  const day = date.getFullYear() === new Date().getFullYear() ? DAY_MONTH : DAY_MONTH_YEAR;
  return `${day.format(date)} · ${formatTime(date)}`;
}

export const formatShortDay = (date) => DAY_MONTH.format(date);

export const formatLongDay = (date) => (date.getFullYear() === new Date().getFullYear() ? LONG_DAY : LONG_DAY_YEAR).format(date);

export const countText = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

export const formatMonth = (date) => (date.getMonth() === 0 ? String(date.getFullYear()) : MONTH.format(date));

export function formatDelta(delta) {
  const rounded = roundValue(delta);
  return `${SIGNS[Math.sign(rounded)]}${Math.abs(rounded)}`;
}

export const formatChange = (delta, since) => `${formatDelta(delta)} since ${formatShortDay(since)}`;

export function formatDay(date) {
  const weekday = WEEKDAY.format(date).slice(0, 2);
  return `${formatIsoDate(date)} ${weekday}`;
}

export function formatShortWhen(date) {
  return isToday(date) ? formatTime(date) : `${formatIsoDate(date)} ${formatTime(date)}`;
}

export const dayKey = (date) => startOfDay(date).getTime();

export const isToday = (date) => dayKey(date) === dayKey(new Date());

export const daysBetween = (from, to) => Math.round((dayKey(to) - dayKey(from)) / DAY_MS);

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secondsText = pad(seconds % 60);
  return minutes < 60 ? `${minutes}:${secondsText}` : `${Math.floor(minutes / 60)}:${pad(minutes % 60)}:${secondsText}`;
}

export function formatLength(ms) {
  const minutes = Math.round(ms / 60000);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}

export function ordinal(number) {
  const tens = number % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[number % 10] ?? 'th';
  return `${number}${suffix}`;
}

export const formatMonthYear = (date) => MONTH_YEAR.format(date);

export const formatWeekday = (date) => WEEKDAY.format(date);

export function parseDateValue(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export const formatDateTimeValue = (date) => `${formatIsoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function parseDateTimeValue(value) {
  const [year, month, day, hours, minutes] = value.split(/\D/).map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

export function formatIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
