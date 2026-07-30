import { addDays } from '@/utils/cropSchedule';
import type { GreenhouseOccupancy } from '@/utils/greenhouseOccupancy';

export function freeFromDate(occupancy: GreenhouseOccupancy): string | null {
  if (occupancy.state !== 'growing' || occupancy.isOverdue) return null;
  const to = occupancy.crop?.extra?.toDate;
  return to ? addDays(to, 1) : null;
}

export type OccupancyDetail = {
  key:
    | 'greenhouses.occupancy.dayOfCycle'
    | 'greenhouses.occupancy.dayOpen'
    | 'greenhouses.occupancy.startsToday'
    | 'greenhouses.occupancy.startsIn'
    | 'greenhouses.occupancy.startLate';
  values?: Record<string, number>;
};

export function occupancyDetail(occupancy: GreenhouseOccupancy): OccupancyDetail | null {
  if (occupancy.state === 'growing') {
    if (occupancy.dayOfCycle === null) return null;
    return occupancy.totalDays === null
      ? { key: 'greenhouses.occupancy.dayOpen', values: { day: occupancy.dayOfCycle } }
      : {
          key: 'greenhouses.occupancy.dayOfCycle',
          values: { day: occupancy.dayOfCycle, total: occupancy.totalDays },
        };
  }
  if (occupancy.state === 'planned') {
    const days = occupancy.daysUntilStart;
    if (days === null) return null;
    if (days === 0) return { key: 'greenhouses.occupancy.startsToday' };
    return days > 0
      ? { key: 'greenhouses.occupancy.startsIn', values: { days } }
      : { key: 'greenhouses.occupancy.startLate', values: { days: -days } };
  }
  return null;
}

const TONE: Record<'free' | 'planned' | 'growing' | 'overdue', string> = {
  free: 'gray',
  planned: 'blue',
  growing: 'green',
  overdue: 'orange',
};

function toneKey(occupancy: GreenhouseOccupancy) {
  return occupancy.isOverdue ? 'overdue' : occupancy.state;
}

export function occupancyTone(occupancy: GreenhouseOccupancy): string {
  return TONE[toneKey(occupancy)];
}
