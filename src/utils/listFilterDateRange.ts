

import type { DateTimeInput } from '@credo/kits/types';
import { type DateRangePreset, type DateRangeValue, EMPTY_DATE_RANGE } from '@/types/date-range';
import { formatDate } from '@/utils/dateFormat';
import { ONE_DAY } from '@credo/kits/time';

export const DEFAULT_RANGE_DAYS = 30;

export function getPresetRange(preset: DateRangePreset): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = today.getDay(); 
  const mondayOffset = day === 0 ? -6 : 1 - day;

  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday':
      return {
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
        to: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
      };
    case 'tomorrow':
      return {
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        to: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      };
    case 'thisWeek': {
      const mon = new Date(today);
      mon.setDate(today.getDate() + mondayOffset);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: mon, to: sun };
    }
    case 'lastWeek': {
      const mon = new Date(today);
      mon.setDate(today.getDate() + mondayOffset - 7);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: mon, to: sun };
    }
    case 'nextWeek': {
      const mon = new Date(today);
      mon.setDate(today.getDate() + mondayOffset + 7);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: mon, to: sun };
    }
    case 'thisMonth':
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: new Date(today.getFullYear(), today.getMonth() + 1, 0),
      };
    case 'lastMonth':
      return {
        from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        to: new Date(today.getFullYear(), today.getMonth(), 0),
      };
    case 'nextMonth':
      return {
        from: new Date(today.getFullYear(), today.getMonth() + 1, 1),
        to: new Date(today.getFullYear(), today.getMonth() + 2, 0),
      };
    case 'custom':
      return { from: today, to: today };
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function defaultLastNDaysRange(days = DEFAULT_RANGE_DAYS): DateRangeValue {
  const to = new Date(startOfToday().getTime() + ONE_DAY);
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from, to, preset: 'custom' };
}

export type SerializedDateRange = {
  from?: string | null;
  to?: string | null;
  preset?: string | null;
};

export function restoreDateRange(
  cached: SerializedDateRange | undefined,
  fallback: DateRangeValue,
): DateRangeValue {
  if (!cached?.preset) return fallback;
  return {
    from: cached.from ? new Date(cached.from) : null,
    to: cached.to ? new Date(cached.to) : null,
    preset: cached.preset as DateRangePreset,
  };
}

export function serializeDateRange(r: DateRangeValue): SerializedDateRange | undefined {
  if (!r.preset) return undefined;
  return {
    from: r.from ? new Date(r.from).toISOString() : null,
    to: r.to ? new Date(r.to).toISOString() : null,
    preset: r.preset,
  };
}

export function isInDateRange(
  datetime: DateTimeInput | undefined | null,
  range: DateRangeValue,
): boolean {
  
  if (!range.preset) return true;
  
  if (!datetime) return false;
  const d = new Date(datetime);
  d.setHours(0, 0, 0, 0);
  if (range.from && d < range.from) return false;
  if (range.to) {
    const toEnd = new Date(range.to);
    toEnd.setHours(23, 59, 59, 999);
    if (d > toEnd) return false;
  }
  return true;
}

export function ensureValidDateRange(
  next: DateRangeValue,
  fallback: DateRangeValue = defaultLastNDaysRange(),
): DateRangeValue {
  return next.preset && next.from && next.to ? next : fallback;
}

export function isDefaultLastNDaysRange(range: DateRangeValue, days = DEFAULT_RANGE_DAYS): boolean {
  if (range.preset !== 'custom' || !range.from || !range.to) return false;
  const diffDays = Math.round((range.to.getTime() - range.from.getTime()) / 86400000);
  return diffDays === days;
}

export function formatDateRangeLabel(
  range: DateRangeValue,
  presetLabels: Record<string, string>,
): string {
  if (range.preset === 'custom') {
    const from = range.from ? formatDate(range.from) : '?';
    const to = range.to ? formatDate(range.to) : '?';
    return `${from} – ${to}`;
  }
  return range.preset ? (presetLabels[range.preset] ?? range.preset) : '-';
}

export { EMPTY_DATE_RANGE };
