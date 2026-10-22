export function shouldEncodeStatusSelection(
  selection: readonly string[] | undefined,
  defaultSelection: readonly string[],
): boolean {
  return !!selection && (selection.length > 0 || defaultSelection.length > 0);
}

export function isDefaultStatusSelection(
  selection: readonly string[],
  defaultSelection: readonly string[],
): boolean {
  return (
    selection.length === defaultSelection.length &&
    selection.every((v) => defaultSelection.includes(v))
  );
}
