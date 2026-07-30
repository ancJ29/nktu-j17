import { addDays, windowDayCount } from './cropSchedule';
import type { Crop } from '@/types';

export type TimelineTick = {
  date: string;

  leftPct: number;
};

export type TimelineWindow = {
  start: string;
  end: string;

  days: number;
  ticks: TimelineTick[];
};

export type TimelineBar = {
  crop: Crop;
  leftPct: number;
  widthPct: number;

  clippedStart: boolean;

  clippedEnd: boolean;
};

export function buildTimelineWindow(start: string, weeks: number): TimelineWindow | null {
  if (!Number.isFinite(weeks) || weeks < 1) return null;
  const totalDays = Math.trunc(weeks) * 7;
  const end = addDays(start, totalDays - 1);
  if (!end) return null;

  const ticks: TimelineTick[] = [];
  for (let i = 0; i < Math.trunc(weeks); i++) {
    const date = addDays(start, i * 7);
    if (!date) return null;
    ticks.push({ date, leftPct: ((i * 7) / totalDays) * 100 });
  }
  return { start, end, days: totalDays, ticks };
}

export function spanGeometry(
  fromDate: string | undefined,
  toDate: string | undefined,
  window: TimelineWindow,
): Omit<TimelineBar, 'crop'> | null {
  if (!fromDate || !toDate) return null;
  if (windowDayCount(fromDate, toDate) === null) return null;

  if (toDate < window.start || fromDate > window.end) return null;

  const visibleStart = fromDate < window.start ? window.start : fromDate;
  const visibleEnd = toDate > window.end ? window.end : toDate;

  const offsetDays = windowDayCount(window.start, visibleStart);
  const spanDays = windowDayCount(visibleStart, visibleEnd);
  if (offsetDays === null || spanDays === null) return null;

  return {
    leftPct: ((offsetDays - 1) / window.days) * 100,
    widthPct: (spanDays / window.days) * 100,
    clippedStart: fromDate < window.start,
    clippedEnd: toDate > window.end,
  };
}

export function greenhouseBars(
  crops: Crop[],
  greenhouseCode: string,
  window: TimelineWindow,
): TimelineBar[] {
  const bars: TimelineBar[] = [];
  for (const crop of crops) {
    if (crop.greenhouseCode !== greenhouseCode) continue;
    const geometry = spanGeometry(crop.extra?.fromDate, crop.extra?.toDate, window);
    if (geometry) bars.push({ crop, ...geometry });
  }
  return bars.sort((a, b) => a.leftPct - b.leftPct);
}

export function todayMarkerPct(today: string, window: TimelineWindow): number | null {
  if (today < window.start || today > window.end) return null;
  const offsetDays = windowDayCount(window.start, today);
  if (offsetDays === null) return null;
  return ((offsetDays - 1) / window.days) * 100;
}
