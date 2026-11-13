import { formatDateTimeSecondsValue, formatDateTimeValue, parseDateTimeValue } from './format.js';

export function showWhen(input, timestamp) {
  input.value = formatDateTimeValue(new Date(timestamp));
  input.max = formatDateTimeValue(new Date());
}

export function readWhen(input, timestamp) {
  if (!input.value || input.value === formatDateTimeValue(new Date(timestamp))) return timestamp;
  const chosen = parseDateTimeValue(input.value).getTime();
  return new Date(Math.min(chosen, Date.now())).toISOString();
}

export function readSecondsValue(timestamp, value) {
  if (!value || value === formatDateTimeSecondsValue(new Date(timestamp))) return timestamp;
  return new Date(Math.min(parseDateTimeValue(value).getTime(), Date.now())).toISOString();
}
