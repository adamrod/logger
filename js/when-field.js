import { formatDateTimeValue, formatTime, parseDateTimeValue } from './format.js';

export function showWhen(input, timestamp) {
  input.value = formatDateTimeValue(new Date(timestamp));
  input.max = formatDateTimeValue(new Date());
}

export function readWhen(input, timestamp) {
  if (!input.value || input.value === formatDateTimeValue(new Date(timestamp))) return timestamp;
  const chosen = parseDateTimeValue(input.value).getTime();
  return new Date(Math.min(chosen, Date.now())).toISOString();
}

export function readTime(timestamp, value) {
  const date = new Date(timestamp);
  if (!value || value === formatTime(date)) return timestamp;
  const [hours, minutes] = value.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return new Date(Math.min(date.getTime(), Date.now())).toISOString();
}
