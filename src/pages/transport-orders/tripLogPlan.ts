import type { TransportOrder, TransportOrderTripLogRef, TripLogExtra } from '@/types';

export const WHOLE_ORDER_TRIP_INDEX = -1;

export type PlannedTripLog = {
  tripIndex: number;

  targetId: string;

  targetCode: string;

  logDate: string;
  extra: TripLogExtra;
};

function dateOnly(value: unknown): string {
  return String(value ?? '').slice(0, 10);
}

export function periodOf(logDate: string): string {
  return logDate.slice(0, 4);
}

function routeLabel(from: string | undefined, to: string | undefined): string {
  const a = (from ?? '').trim();
  const b = (to ?? '').trim();
  if (a && b) return `${a} → ${b}`;
  return a || b;
}

export function planTripLogs(order: TransportOrder): PlannedTripLog[] {
  if (order.extra?.isDeleted || order.extra?.cancellation) return [];

  const base = (
    tripIndex: number,
  ): Pick<TripLogExtra, 'transportOrderId' | 'transportOrderNumber' | 'tripIndex'> => ({
    transportOrderId: order.id,
    transportOrderNumber: order.orderNumber,
    tripIndex,
  });

  if (order.isMultiTrip) {
    return (order.trips ?? [])
      .map((leg, i) => ({ leg, i }))
      .filter(({ leg }) => Boolean(leg.truckId))
      .map(({ leg, i }) => ({
        tripIndex: i,
        targetId: leg.truckId,
        targetCode: leg.truckPlate ?? '',
        logDate: dateOnly(leg.date),
        extra: {
          ...base(i),
          destination: routeLabel(leg.departure, leg.destination),
          ...(leg.driverId ? { driverId: leg.driverId } : {}),
          ...(leg.driverName ? { driverName: leg.driverName } : {}),
        },
      }));
  }

  if (!order.truckId) return [];
  return [
    {
      tripIndex: WHOLE_ORDER_TRIP_INDEX,
      targetId: order.truckId,
      targetCode: order.truckPlate ?? '',
      logDate: dateOnly(order.entryDate),
      extra: {
        ...base(WHOLE_ORDER_TRIP_INDEX),
        destination: routeLabel(order.route?.pickup, order.route?.dropoff),
        ...(order.driverId ? { driverId: order.driverId } : {}),
        ...(order.driverName ? { driverName: order.driverName } : {}),
      },
    },
  ];
}

export function fingerprintTripLogs(plans: PlannedTripLog[]): string {
  return JSON.stringify(
    plans.map((p) => [
      p.tripIndex,
      p.targetId,
      p.targetCode,
      p.logDate,
      p.extra.destination ?? '',
      p.extra.driverId ?? '',
      p.extra.driverName ?? '',
    ]),
  );
}

export type TripLogOp =
  | { kind: 'create'; plan: PlannedTripLog }
  | { kind: 'update'; plan: PlannedTripLog; ref: TransportOrderTripLogRef }
  | { kind: 'delete'; ref: TransportOrderTripLogRef };

export function diffTripLogs(
  plans: PlannedTripLog[],
  refs: TransportOrderTripLogRef[],
): TripLogOp[] {
  const byIndex = new Map(refs.map((r) => [r.tripIndex, r]));
  const ops: TripLogOp[] = [];
  for (const plan of plans) {
    const ref = byIndex.get(plan.tripIndex);
    if (!ref) {
      ops.push({ kind: 'create', plan });
      continue;
    }
    byIndex.delete(plan.tripIndex);
    if (ref.targetId !== plan.targetId) {
      ops.push({ kind: 'delete', ref });
      ops.push({ kind: 'create', plan });
    } else {
      ops.push({ kind: 'update', plan, ref });
    }
  }

  for (const ref of byIndex.values()) ops.push({ kind: 'delete', ref });
  return ops;
}
