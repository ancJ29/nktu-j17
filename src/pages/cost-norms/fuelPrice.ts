import type { FuelPriceRow } from '@/types';
import { isoToVnDateString } from '@/utils/dateTimeField';

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

export function resolveFuelPriceAt(
  rows: readonly FuelPriceRow[],
  atMs: number,
): FuelPriceRow | undefined {
  const day = isoToVnDateString(atMs);
  return day ? resolveCurrentFuelPrice(rows, day) : undefined;
}

export function isScheduledFuelPrice(row: FuelPriceRow, today: string): boolean {
  return row.effectiveDate > today;
}

export const FUEL_PRICE_ALERT_WINDOW_MS = 24 * 60 * 60 * 1000;

function startOfVnDay(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return 0;

  return Date.UTC(y, m - 1, d) - 7 * 60 * 60 * 1000;
}

export function fuelPriceBecameCurrentAt(
  row: Pick<FuelPriceRow, 'createdAt' | 'effectiveDate'>,
): number {
  return Math.max(row.createdAt ?? 0, startOfVnDay(row.effectiveDate));
}

export function isRecentFuelPriceChange(
  row: Pick<FuelPriceRow, 'createdAt' | 'effectiveDate'> | undefined,
  nowMs: number,
  windowMs: number = FUEL_PRICE_ALERT_WINDOW_MS,
): boolean {
  if (!row) return false;
  const from = fuelPriceBecameCurrentAt(row);
  return from <= nowMs && nowMs - from < windowMs;
}
