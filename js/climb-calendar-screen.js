import { monthValue } from './calendar.js';
import { climbingSessions, hardestGrade, isSend, isTop, sessionFocus, stylesText } from './climbing.js';
import { countText, formatLength } from './format.js';
import { gradesAt } from './gyms.js';
import { createMonthCalendar } from './month-calendar.js';
import { climbs } from './store.js';

const sessions = () => climbingSessions(climbs.getEntries());

function sessionEntry(session) {
  const { kind, attempts } = sessionFocus(session);
  const hardest = hardestGrade(attempts.filter(isSend), gradesAt(session.gym, kind));
  const meta = [
    formatLength(session.endAt - session.startAt),
    countText(session.attempts.length, 'attempt'),
    countText(session.attempts.filter(isTop).length, 'top'),
    hardest ? `hardest ${hardest}` : '',
  ];
  return {
    date: new Date(session.startAt),
    href: `#climb-session/${session.id}`,
    title: `${session.gym} · ${stylesText(session.attempts)}`,
    meta: meta.filter(Boolean).join(' · '),
  };
}

const calendar = createMonthCalendar('climb-calendar', {
  entriesIn: (month) => sessions()
    .filter((session) => monthValue(new Date(session.startAt)) === monthValue(month))
    .map(sessionEntry),
  latestDate: () => {
    const latest = sessions().at(-1);
    return latest ? new Date(latest.startAt) : null;
  },
  summary: (entries) => (entries.length ? countText(entries.length, 'session') : 'No sessions'),
});

export const initClimbCalendar = calendar.init;
export const enterClimbCalendar = calendar.enter;
export const renderClimbCalendar = calendar.render;
