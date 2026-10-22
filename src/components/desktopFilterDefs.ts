export function summarizeSelection(
  selected: readonly string[],
  options: ReadonlyArray<{ value: string; label: string }>,
  emptyLabel: string,
  countLabel: string,
): string {
  if (selected.length === 0) return emptyLabel;
  if (selected.length > 1) return countLabel;
  const only = selected[0]!;
  return options.find((option) => option.value === only)?.label ?? only;
}
