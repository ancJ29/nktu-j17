import type { DateTimeInput } from '@credo/kits/types';
import type { TransportOrder } from '@/types';

export type ScheduleSubject = 'truck' | 'driver';

export const WHOLE_ORDER = -1;

export type ScheduleSlot = {
  tripIndex: number;
  truckId: string;
  driverId: string;

  start: number;
  end: number;
};

export type ScheduleConflict = {
  tripIndex: number;
  subject: ScheduleSubject;

  orderId: string;
  orderNumber: string;
  otherTripIndex: number;

  start: number;
  end: number;
};

function epoch(value: DateTimeInput | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function scheduleWindow(
  times: ReadonlyArray<DateTimeInput | null | undefined>,
): { start: number; end: number } | null {
  const stamps = times.map(epoch).filter((ms): ms is number => ms !== null);
  if (stamps.length === 0) return null;
  return { start: Math.min(...stamps), end: Math.max(...stamps) };
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start <= b.end && b.start <= a.end;
}

export function orderScheduleSlots(order: TransportOrder): ScheduleSlot[] {
  if (order.isMultiTrip && order.trips?.length) {
    return order.trips.flatMap((trip, i) => {
      const window = scheduleWindow([trip.loadingAt, trip.unloadingAt]);
      return window
        ? [{ tripIndex: i, truckId: trip.truckId, driverId: trip.driverId, ...window }]
        : [];
    });
  }
  const window = scheduleWindow([
    order.route?.pickupAt,
    order.route?.stuffingAt,
    order.route?.dropoffAt,
  ]);
  return window
    ? [{ tripIndex: WHOLE_ORDER, truckId: order.truckId, driverId: order.driverId, ...window }]
    : [];
}

const SUBJECTS: ScheduleSubject[] = ['truck', 'driver'];

function idOf(slot: ScheduleSlot, subject: ScheduleSubject): string {
  return subject === 'truck' ? slot.truckId : slot.driverId;
}

export function findScheduleConflicts(
  draft: ReadonlyArray<ScheduleSlot>,
  orders: ReadonlyArray<TransportOrder>,
  options: { excludeOrderId?: string } = {},
): ScheduleConflict[] {
  const scheduled = draft.filter((slot) => slot.truckId || slot.driverId);
  if (scheduled.length === 0) return [];

  const byKey = new Map<string, ScheduleConflict>();

  for (const order of orders) {
    if (order.id === options.excludeOrderId) continue;
    if (order.extra?.isDeleted || order.extra?.cancellation) continue;

    for (const other of orderScheduleSlots(order)) {
      for (const slot of scheduled) {
        if (!overlaps(slot, other)) continue;
        for (const subject of SUBJECTS) {
          const id = idOf(slot, subject);
          if (!id || id !== idOf(other, subject)) continue;
          const key = `${slot.tripIndex}|${subject}|${order.id}`;
          const existing = byKey.get(key);
          if (existing && existing.start <= other.start) continue;
          byKey.set(key, {
            tripIndex: slot.tripIndex,
            subject,
            orderId: order.id,
            orderNumber: order.orderNumber,
            otherTripIndex: other.tripIndex,
            start: other.start,
            end: other.end,
          });
        }
      }
    }
  }

  return [...byKey.values()].sort(
    (a, b) =>
      a.tripIndex - b.tripIndex ||
      SUBJECTS.indexOf(a.subject) - SUBJECTS.indexOf(b.subject) ||
      a.orderNumber.localeCompare(b.orderNumber),
  );
}
