import { monthValue } from './calendar.js';
import { allLoggedDays } from './day-screen.js';
import { daySummary, daySummaryText } from './day-summary.js';
import { countText, formatIsoDate } from './format.js';
import { createMonthCalendar } from './month-calendar.js';
import { bodyWeights, sets } from './store.js';

function dayEntry(day) {
  const summary = daySummary(day, sets.getEntries(), bodyWeights.getEntries());
  const names = summary.exercises.map(({ exercise }) => exercise);
  return {
    date: day,
    href: `#day/${formatIsoDate(day)}`,
    title: names.join(', ') || 'Body weight',
    meta: daySummaryText(summary),
  };
}

const calendar = createMonthCalendar('calendar', {
  entriesIn: (month) => allLoggedDays().filter((day) => monthValue(day) === monthValue(month)).map(dayEntry),
  latestDate: () => allLoggedDays().at(-1) ?? null,
  summary: (entries) => (entries.length ? countText(entries.length, 'day') : 'Nothing logged'),
});

export const initDayCalendar = calendar.init;
export const enterDayCalendar = calendar.enter;
export const renderDayCalendar = calendar.render;
