import { formatDateTimeValue, parseDateTimeValue } from './format.js';

export function showWhen(input, timestamp) {
  input.value = formatDateTimeValue(new Date(timestamp));
  input.max = formatDateTimeValue(new Date());
}

export function readWhen(input, timestamp) {
  if (!input.value || input.value === formatDateTimeValue(new Date(timestamp))) return timestamp;
  const chosen = parseDateTimeValue(input.value).getTime();
  return new Date(Math.min(chosen, Date.now())).toISOString();
}
