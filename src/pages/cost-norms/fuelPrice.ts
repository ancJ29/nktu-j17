import type { FuelPriceRow } from '@/types';

function isLive(row: FuelPriceRow): boolean {
  return !row.extra?.isDeleted;
}

function byEffectiveDesc(a: FuelPriceRow, b: FuelPriceRow): number {
  if (a.effectiveDate !== b.effectiveDate) return a.effectiveDate < b.effectiveDate ? 1 : -1;
  return (b.createdAt ?? 0) - (a.createdAt ?? 0);
}

export function sortFuelPriceHistory(rows: readonly FuelPriceRow[]): FuelPriceRow[] {
  return rows.filter(isLive).sort(byEffectiveDesc);
}

export function resolveCurrentFuelPrice(
  rows: readonly FuelPriceRow[],
  today: string,
): FuelPriceRow | undefined {
  return sortFuelPriceHistory(rows).find((row) => row.effectiveDate <= today);
}

export function isScheduledFuelPrice(row: FuelPriceRow, today: string): boolean {
  return row.effectiveDate > today;
}
