const DAYS_IN_WEEK = 7;

export const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const addMonths = (month, count) => new Date(month.getFullYear(), month.getMonth() + count, 1);

export const monthValue = (month) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

export function parseMonthValue(value) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function calendarWeeks(month) {
  const year = month.getFullYear();
  const index = month.getMonth();
  const leadingBlanks = (new Date(year, index, 1).getDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK;
  const dayCount = new Date(year, index + 1, 0).getDate();
  const cells = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: dayCount }, (_, i) => new Date(year, index, i + 1)),
  ];
  const trailingBlanks = (DAYS_IN_WEEK - (cells.length % DAYS_IN_WEEK)) % DAYS_IN_WEEK;
  const padded = [...cells, ...Array(trailingBlanks).fill(null)];
  return Array.from({ length: padded.length / DAYS_IN_WEEK }, (_, week) => padded.slice(week * DAYS_IN_WEEK, (week + 1) * DAYS_IN_WEEK));
}
