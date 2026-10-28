const LOCALE = 'en-GB';
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

export const roundValue = (value) => Math.round(value * 100) / 100;

export const describeSet = ({ variant, reps, weight }) => [variant, `${reps} × ${roundValue(weight)} kg`].filter(Boolean).join(' · ');

export function formatWhen(date) {
  const year = date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric';
  const day = date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year });
  const time = date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}
