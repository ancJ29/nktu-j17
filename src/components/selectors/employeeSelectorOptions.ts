export function employeeSelectorOptions<E extends { id: string }>(
  employees: readonly E[],
  filter: (e: E) => boolean,
  value: string | null,
  optionLabel: (e: E) => string,
): { value: string; label: string }[] {
  const filtered = employees.filter(filter);
  if (value && !filtered.some((e) => e.id === value)) {
    const current = employees.find((e) => e.id === value);
    if (current) filtered.push(current);
  }
  return filtered.map((e) => ({ value: e.id, label: optionLabel(e) }));
}
