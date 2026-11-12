import type { DateRangeValue } from '@/types/date-range';
import { ONE_DAY } from '@credo/kits/time';

export const FETCH_MARGIN_DAYS = 30;

export function fetchWindowForPick(
  base: DateRangeValue,
  picks: readonly DateRangeValue[],
  marginDays: number = FETCH_MARGIN_DAYS,
): DateRangeValue {
  if (!base.from || !base.to) return base;
  const baseFrom = base.from.getTime();
  let earliest = Infinity;
  for (const p of picks) {
    const t = p.from?.getTime();
    if (t !== undefined && !Number.isNaN(t) && t < earliest) earliest = t;
  }

  if (earliest >= baseFrom - ONE_DAY) return base;
  return { from: new Date(earliest - marginDays * ONE_DAY), to: base.to, preset: 'custom' };
}
