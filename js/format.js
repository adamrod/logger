const LOCALE = 'en-GB';
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
  const pad = (number) => String(number).padStart(2, '0');
  const isoDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const weekday = date.toLocaleDateString(LOCALE, { weekday: 'short' });
  return `${isoDate} ${weekday}`;
}

export const dayKey = (date) => startOfDay(date).getTime();

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
