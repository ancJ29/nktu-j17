import type { Crop } from '@/types';

export function dateRangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom <= bTo && bFrom <= aTo;
}

export function findOverlappingCrop(
  crops: Crop[],
  greenhouseCode: string,
  fromDate: string,
  toDate: string,
  excludeId?: string,
): Crop | undefined {
  return crops.find((c) => {
    if (c.id === excludeId) return false;
    if (c.greenhouseCode !== greenhouseCode) return false;
    const f = c.extra?.fromDate;
    const to = c.extra?.toDate;
    if (!f || !to) return false;
    return dateRangesOverlap(fromDate, toDate, f, to);
  });
}

export function findGrowingCropInGreenhouse(
  crops: Crop[],
  greenhouseCode: string,
  excludeId?: string,
): Crop | undefined {
  return crops.find(
    (c) => c.id !== excludeId && c.greenhouseCode === greenhouseCode && c.status === 'growing',
  );
}

export function formatPlannedDate(value: string | null | undefined): string {
  if (!value || value.length < 10) return '—';
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

function dayToUtc(value: string): number {
  if (value.length < 10) return Number.NaN;
  return Date.UTC(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)) - 1,
    Number(value.slice(8, 10)),
  );
}

export function windowEndDate(
  fromDate: string | null | undefined,
  totalDays: number | null | undefined,
): string | null {
  if (!fromDate || fromDate.length < 10) return null;
  if (typeof totalDays !== 'number' || !Number.isFinite(totalDays) || totalDays < 1) return null;
  const from = dayToUtc(fromDate);
  if (Number.isNaN(from)) return null;
  return new Date(from + (Math.floor(totalDays) - 1) * 86_400_000).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string | null {
  const base = dayToUtc(date);
  if (Number.isNaN(base)) return null;
  return new Date(base + Math.trunc(days) * 86_400_000).toISOString().slice(0, 10);
}

export function windowDayCount(
  fromDate: string | null | undefined,
  toDate: string | null | undefined,
): number | null {
  if (!fromDate || !toDate) return null;
  const from = dayToUtc(fromDate);
  const to = dayToUtc(toDate);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return null;
  return Math.round((to - from) / 86_400_000) + 1;
}
