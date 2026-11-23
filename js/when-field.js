import { formatDateTimeSecondsValue, formatDateTimeValue, parseDateTimeValue } from './format.js';

function readChosen(timestamp, value, format) {
  if (!value || value === format(new Date(timestamp))) return timestamp;
  return new Date(Math.min(parseDateTimeValue(value).getTime(), Date.now())).toISOString();
}

export function showWhen(input, timestamp) {
  input.value = formatDateTimeValue(new Date(timestamp));
  input.max = formatDateTimeValue(new Date());
}

export const readWhen = (input, timestamp) => readChosen(timestamp, input.value, formatDateTimeValue);

export const readSecondsValue = (timestamp, value) => readChosen(timestamp, value, formatDateTimeSecondsValue);
