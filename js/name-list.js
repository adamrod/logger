export function visibleNames({ added, removed }, logged) {
  return [...new Set([...added, ...logged])]
    .filter((name) => !removed.includes(name))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function withName(list, logged, name) {
  const visible = visibleNames(list, logged);
  const known = [...visible, ...list.removed].find((existing) => existing.toLowerCase() === name.toLowerCase()) ?? name;
  if (visible.includes(known)) return { name: known, list };
  return { name: known, list: { added: [...list.added, known], removed: list.removed.filter((existing) => existing !== known) } };
}

export const forgetName = ({ added, removed }, name) => ({
  added: added.filter((existing) => existing !== name),
  removed: removed.filter((existing) => existing !== name),
});

export function withoutName(list, name) {
  const { added, removed } = forgetName(list, name);
  return { added, removed: [...removed, name] };
}

export function mergeLists(target, source) {
  const added = [...new Set([...target.added, ...source.added])];
  const removed = [...new Set([...target.removed, ...source.removed])].filter((name) => !added.includes(name));
  return { added, removed };
}
