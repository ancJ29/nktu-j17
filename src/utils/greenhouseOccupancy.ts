import { findGrowingCropInGreenhouse, windowDayCount } from './cropSchedule';
import type { Crop } from '@/types';

export type GreenhouseOccupancyState =
  | 'free'
  /** No crop growing yet, but one is scheduled. */
  | 'planned'
  /** A crop is in the ground. */
  | 'growing';

export type GreenhouseOccupancy = {
  state: GreenhouseOccupancyState;

  crop?: Crop;

  dayOfCycle: number | null;

  totalDays: number | null;

  isOverdue: boolean;

  daysUntilStart: number | null;
};

export type GreenhouseOccupancyFilter = 'all' | GreenhouseOccupancyState | 'overdue';

const FREE: GreenhouseOccupancy = {
  state: 'free',
  dayOfCycle: null,
  totalDays: null,
  isOverdue: false,
  daysUntilStart: null,
};

function signedDayGap(from: string, to: string): number | null {
  const forward = windowDayCount(from, to);
  if (forward !== null) return forward - 1;
  const backward = windowDayCount(to, from);
  return backward === null ? null : -(backward - 1);
}

function soonestPlanned(crops: Crop[], greenhouseCode: string): Crop | undefined {
  let best: Crop | undefined;
  for (const crop of crops) {
    if (crop.greenhouseCode !== greenhouseCode || crop.status !== 'planned') continue;
    if (!best) {
      best = crop;
      continue;
    }
    const from = crop.extra?.fromDate;
    const bestFrom = best.extra?.fromDate;
    if (!from) continue;
    if (!bestFrom || from < bestFrom) best = crop;
  }
  return best;
}

export function resolveGreenhouseOccupancy(
  crops: Crop[],
  greenhouseCode: string,
  today: string,
): GreenhouseOccupancy {
  const growing = findGrowingCropInGreenhouse(crops, greenhouseCode);
  if (growing) {
    const from = growing.extra?.fromDate;
    const to = growing.extra?.toDate;
    return {
      state: 'growing',
      crop: growing,
      dayOfCycle: from ? windowDayCount(from, today) : null,
      totalDays: windowDayCount(from, to),
      isOverdue: !!to && today > to,
      daysUntilStart: null,
    };
  }

  const planned = soonestPlanned(crops, greenhouseCode);
  if (planned) {
    const from = planned.extra?.fromDate;
    return {
      state: 'planned',
      crop: planned,
      dayOfCycle: null,
      totalDays: windowDayCount(from, planned.extra?.toDate),
      isOverdue: false,
      daysUntilStart: from ? signedDayGap(today, from) : null,
    };
  }

  return FREE;
}

export function matchesOccupancyFilter(
  occupancy: GreenhouseOccupancy,
  filter: GreenhouseOccupancyFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'overdue':
      return occupancy.isOverdue;
    default:
      return occupancy.state === filter;
  }
}

export function buildOccupancyMap(crops: Crop[], today: string): Map<string, GreenhouseOccupancy> {
  const map = new Map<string, GreenhouseOccupancy>();
  for (const crop of crops) {
    if (map.has(crop.greenhouseCode)) continue;
    map.set(crop.greenhouseCode, resolveGreenhouseOccupancy(crops, crop.greenhouseCode, today));
  }
  return map;
}

export const FREE_OCCUPANCY = FREE;
