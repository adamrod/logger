export function visibleNames({ added, removed }, logged) {
  return [...new Set([...added, ...logged])].filter((name) => !removed.includes(name));
}

export function withName(list, logged, name) {
  const visible = visibleNames(list, logged);
  const known = [...visible, ...list.removed].find((existing) => existing.toLowerCase() === name.toLowerCase()) ?? name;
  if (visible.includes(known)) return { name: known, list };
  return { name: known, list: { added: [...list.added, known], removed: list.removed.filter((existing) => existing !== known) } };
}

export function withoutName({ added, removed }, name) {
  return { added: added.filter((existing) => existing !== name), removed: [...removed, name] };
}
