import type { OperationLog } from '@/types';

export const OIL_TANK_REFILL_LOG_TYPE = 'oil-tank-refill';
export const OIL_TANK_ISSUE_LOG_TYPE = 'oil-tank-issue';

export const OIL_TANK_MOVEMENT_TYPES: readonly string[] = [
  OIL_TANK_REFILL_LOG_TYPE,
  OIL_TANK_ISSUE_LOG_TYPE,
];

export function signedLitres(log: Pick<OperationLog, 'logType' | 'extra'>): number {
  const litres = log.extra?.litres;
  if (typeof litres !== 'number' || !Number.isFinite(litres)) return 0;
  if (log.logType === OIL_TANK_REFILL_LOG_TYPE) return litres;
  if (log.logType === OIL_TANK_ISSUE_LOG_TYPE) return -litres;
  return 0;
}

export function sumMovements(logs: readonly Pick<OperationLog, 'logType' | 'extra'>[]): number {
  return logs.reduce((total, log) => total + signedLitres(log), 0);
}

export function movementDelta(
  previous: Pick<OperationLog, 'logType' | 'extra'> | null,
  next: Pick<OperationLog, 'logType' | 'extra'> | null,
): number {
  return (next ? signedLitres(next) : 0) - (previous ? signedLitres(previous) : 0);
}

export function movementYears(fromYear: number, toYear: number): number[] {
  if (!Number.isFinite(fromYear) || !Number.isFinite(toYear)) return [toYear];
  if (fromYear > toYear) return [toYear];
  const years: number[] = [];
  for (let y = fromYear; y <= toYear; y++) years.push(y);
  return years;
}

export function replayBalance(
  openingLevel: number,
  logs: readonly Pick<OperationLog, 'logType' | 'extra'>[],
): number {
  const opening = Number.isFinite(openingLevel) ? openingLevel : 0;

  return Math.round((opening + sumMovements(logs)) * 100) / 100;
}
