export type ColumnFilterSelectionState = 'all' | 'some' | 'none';

export type ColumnFilterSelection = {
  readonly selected: readonly string[];

  readonly cleared: boolean;
};

export type ColumnFilterSelectionResult = {
  selected: string[];
  cleared: boolean;
};

export function columnFilterSelectionState({
  selected,
  cleared,
}: ColumnFilterSelection): ColumnFilterSelectionState {
  if (selected.length > 0) return 'some';
  return cleared ? 'none' : 'all';
}

export function toggleColumnFilterValue(
  { selected, cleared }: ColumnFilterSelection,
  options: readonly string[],
  value: string,
): ColumnFilterSelectionResult {
  const state = columnFilterSelectionState({ selected, cleared });
  if (state === 'none') return normalise([value], options);

  const base = state === 'some' ? [...selected] : [...options];
  const next = base.includes(value)
    ? base.filter((current) => current !== value)
    : [...base, value];
  return normalise(next, options);
}

export function toggleColumnFilterAll(current: ColumnFilterSelection): ColumnFilterSelectionResult {
  return columnFilterSelectionState(current) === 'all'
    ? { selected: [], cleared: true }
    : { selected: [], cleared: false };
}

function normalise(next: string[], options: readonly string[]): ColumnFilterSelectionResult {
  if (next.length === 0) return { selected: [], cleared: true };
  if (next.length === options.length) return { selected: [], cleared: false };
  return { selected: next, cleared: false };
}
