import { FONT_GRADES, gradesFor } from './climbing.js';
import { climbs, gyms } from './store.js';
import { undoable } from './undo.js';

const gymEntryOf = (name) => gyms.getEntries().find((entry) => entry.gym === name);

export const allGyms = () => [...new Set([...gyms.getEntries(), ...climbs.getEntries()].map((entry) => entry.gym))]
  .sort((a, b) => a.localeCompare(b));

export const gymGrades = (name) => gymEntryOf(name)?.grades.split('|') ?? FONT_GRADES;

export const gradesAt = (name, kind) => gradesFor(gymGrades(name), kind);

export const isOtherGym = (name, original) => allGyms()
  .some((gym) => gym !== original && gym.toLowerCase() === name.toLowerCase());

export function saveGym(original, name, grades) {
  undoable(() => {
    const entry = original === null ? null : gymEntryOf(original);
    const fields = { gym: name, grades: grades.join('|') };
    if (entry) gyms.update(entry.timestamp, fields);
    else gyms.add(fields);
    if (original !== null) climbs.updateWhere((attempt) => attempt.gym === original, { gym: name });
  });
}
