export type StockEntryMode = 'delta' | 'snapshot';

export type StockEntryError = 'valueRequired' | 'deltaRequired';

export type StockEntry = {
  readonly next: number;

  readonly variance: number;

  readonly hasValue: boolean;
  readonly error: StockEntryError | null;
};

export function resolveStockEntry(params: {
  readonly mode: StockEntryMode;

  readonly current: number;

  readonly value: number | string;
}): StockEntry {
  const { mode, current, value } = params;
  const entered = typeof value === 'number' ? value : Number(value);
  const hasValue = value !== '' && Number.isFinite(entered);

  const next = mode === 'delta' ? current + entered : entered;
  const variance = next - current;

  const error: StockEntryError | null = !hasValue
    ? 'valueRequired'
    : mode === 'delta' && entered === 0
      ? 'deltaRequired'
      : null;

  return { next, variance, hasValue, error };
}
