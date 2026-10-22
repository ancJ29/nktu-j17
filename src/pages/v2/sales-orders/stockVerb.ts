export function salesOrderStockVerb(state: {
  readonly pending: boolean;

  readonly holdsStock: boolean;

  readonly nothingLeft: boolean;
}): 'lock' | 'release' | null {
  if (state.pending) return null;
  if (state.holdsStock) return 'release';
  return state.nothingLeft ? null : 'lock';
}
