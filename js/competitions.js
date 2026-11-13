import { attemptsIn } from './competition.js';
import { competitionAttempts, competitions } from './store.js';
import { undoable } from './undo.js';

const newestFirst = (a, b) => b.start.localeCompare(a.start);

export const allCompetitions = () => competitions.getEntries().toSorted(newestFirst);

export const competitionById = (id) => competitions.getEntries().find((competition) => competition.timestamp === id) ?? null;

export const competitionNamed = (name) => competitions.getEntries().find((competition) => competition.name === name) ?? null;

export const isOtherCompetition = (name, original) => competitions.getEntries()
  .some((competition) => competition.timestamp !== original?.timestamp && competition.name.toLowerCase() === name.toLowerCase());

export function saveCompetition(original, fields) {
  if (original) competitions.update(original.timestamp, fields);
  else competitions.add(fields);
}

export function deleteCompetition(competition) {
  undoable(() => {
    attemptsIn(competitionAttempts.getEntries(), competition).forEach(({ timestamp }) => competitionAttempts.remove(timestamp));
    competitions.remove(competition.timestamp);
  });
}
