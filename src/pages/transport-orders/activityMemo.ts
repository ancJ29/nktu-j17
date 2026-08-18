import type { TransportOrder, TransportOrderExtra } from '@/types';
import { orderTotals, orderTripLaborTotal, readFeeLines } from './transportOrderPricing';
import { isExternalTruck } from './externalTruck';

export type TransportOrderFieldDelta = {
  from?: string | number;
  to?: string | number;
};

export type TransportOrderFields = {
  entryDate?: TransportOrderFieldDelta;
  truckId?: TransportOrderFieldDelta;
  driverId?: TransportOrderFieldDelta;
  customerCode?: TransportOrderFieldDelta;
  billNumber?: TransportOrderFieldDelta;
  declarationNumber?: TransportOrderFieldDelta;
  containerNumber?: TransportOrderFieldDelta;
  containerSize?: TransportOrderFieldDelta;
  shipmentType?: TransportOrderFieldDelta;
  route?: TransportOrderFieldDelta;
  vatRate?: TransportOrderFieldDelta;
  totalAmount?: TransportOrderFieldDelta;
  feeCount?: TransportOrderFieldDelta;
  advanceAmount?: TransportOrderFieldDelta;
  transportContractNo?: TransportOrderFieldDelta;

  tripCount?: TransportOrderFieldDelta;
  tripLaborTotal?: TransportOrderFieldDelta;
  notes?: { changed: true };

  scheduleChanged?: { changed: true };
};

export type TransportOrderCreateMemo = {
  orderNumber: string;
  truckId: string;
  driverId: string;

  externalTruck?: string;
  externalDriver?: string;
  customerCode?: string;
  route: string;
  containerNumber?: string;
  containerSize: string;
  shipmentType: string;

  feeCount: number;
  totalAmount: number;
  grandTotal: number;

  advanceAmount?: number;

  tripCount?: number;
  tripLaborTotal?: number;
};

export function routeMemo(order: Pick<TransportOrder, 'route'>): string {
  const r = order.route;
  return [r?.pickup, r?.stuffing, r?.dropoff].filter(Boolean).join(' → ');
}

function scheduleKey(order: Pick<TransportOrder, 'route' | 'trips'>): string {
  const r = order.route;
  return [
    r?.pickupAt,
    r?.stuffingAt,
    r?.dropoffAt,
    ...(order.trips ?? []).flatMap((trip) => [trip.loadingAt, trip.unloadingAt]),
  ]
    .map((v) => (v ? String(v) : ''))
    .join('|');
}

export function createMemo(order: TransportOrder): TransportOrderCreateMemo {
  const totals = orderTotals(order);
  return {
    orderNumber: order.orderNumber,
    truckId: order.truckId,
    driverId: order.driverId,

    ...(isExternalTruck(order)
      ? {
          ...(order.truckPlate?.trim() ? { externalTruck: order.truckPlate.trim() } : {}),
          ...(order.driverName?.trim() ? { externalDriver: order.driverName.trim() } : {}),
        }
      : {}),
    ...(order.customerCode ? { customerCode: order.customerCode } : {}),
    route: routeMemo(order),
    ...(order.containerNumber ? { containerNumber: order.containerNumber } : {}),
    containerSize: order.containerSize,
    shipmentType: order.shipmentType,
    feeCount: readFeeLines(order).length,
    totalAmount: totals.subtotal,
    grandTotal: totals.grandTotal,
    ...(totals.advanceAmount > 0 ? { advanceAmount: totals.advanceAmount } : {}),
    ...(order.isMultiTrip
      ? {
          tripCount: (order.trips ?? []).length,
          tripLaborTotal: orderTripLaborTotal(order),
        }
      : {}),
  };
}

function vehicleKey(order: Pick<TransportOrder, 'truckId' | 'truckPlate'>): string {
  return order.truckId || (order.truckPlate ?? '').trim();
}

function driverKey(order: Pick<TransportOrder, 'driverId' | 'driverName'>): string {
  return order.driverId || (order.driverName ?? '').trim();
}

function delta(
  from: string | number | undefined,
  to: string | number | undefined,
): TransportOrderFieldDelta | undefined {
  const a = from === '' ? undefined : from;
  const b = to === '' ? undefined : to;
  if (a === b) return undefined;
  return {
    ...(a !== undefined ? { from: a } : {}),
    ...(b !== undefined ? { to: b } : {}),
  };
}

export function diffTransportOrder(
  before: TransportOrder,
  after: TransportOrder,
): TransportOrderFields {
  const fields: TransportOrderFields = {};
  const set = <K extends keyof TransportOrderFields>(
    key: K,
    d: TransportOrderFieldDelta | undefined,
  ) => {
    if (d) fields[key] = d as TransportOrderFields[K];
  };

  set('entryDate', delta(String(before.entryDate ?? ''), String(after.entryDate ?? '')));

  set('truckId', delta(vehicleKey(before), vehicleKey(after)));
  set('driverId', delta(driverKey(before), driverKey(after)));
  set('customerCode', delta(before.customerCode, after.customerCode));
  set('billNumber', delta(before.billNumber, after.billNumber));
  set('declarationNumber', delta(before.declarationNumber, after.declarationNumber));
  set('containerNumber', delta(before.containerNumber, after.containerNumber));
  set('containerSize', delta(before.containerSize, after.containerSize));
  set('shipmentType', delta(before.shipmentType, after.shipmentType));
  set('route', delta(routeMemo(before), routeMemo(after)));
  set('vatRate', delta(before.vatRate, after.vatRate));

  const beforeTotals = orderTotals(before);
  const afterTotals = orderTotals(after);
  set('totalAmount', delta(beforeTotals.subtotal, afterTotals.subtotal));
  set('feeCount', delta(readFeeLines(before).length, readFeeLines(after).length));
  set('advanceAmount', delta(beforeTotals.advanceAmount, afterTotals.advanceAmount));
  set('transportContractNo', delta(before.transportContractNo, after.transportContractNo));

  set('tripCount', delta((before.trips ?? []).length, (after.trips ?? []).length));
  set('tripLaborTotal', delta(orderTripLaborTotal(before), orderTripLaborTotal(after)));

  if ((before.notes ?? '') !== (after.notes ?? '')) fields.notes = { changed: true };
  if (scheduleKey(before) !== scheduleKey(after)) fields.scheduleChanged = { changed: true };

  return fields;
}

export function isEmptyDiff(fields: TransportOrderFields): boolean {
  return Object.keys(fields).length === 0;
}

export function appendTimelineEntry(
  extra: TransportOrderExtra,
  entry: {
    action: 'created' | 'status_change' | 'cancellation_set';
    toStatus?: string;
    fromStatus?: string;
    userId?: string;
    userName?: string;
    note?: string;
  },
): TransportOrderExtra['activityLog'] {
  return [
    ...(extra.activityLog ?? []),
    {
      timestamp: Date.now(),
      action: entry.action,
      ...(entry.fromStatus ? { fromStatus: entry.fromStatus } : {}),
      ...(entry.toStatus ? { toStatus: entry.toStatus } : {}),
      ...(entry.userId ? { userId: entry.userId } : {}),
      ...(entry.userName ? { userName: entry.userName } : {}),
      ...(entry.note ? { note: entry.note } : {}),
    },
  ];
}
