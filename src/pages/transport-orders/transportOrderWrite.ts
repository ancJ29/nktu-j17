import { isDuplicateUniqueFieldError } from '@/utils/code';
import type {
  TransportOrderExtra,
  TransportOrderFee,
  TransportOrderMultiDrop,
  TransportOrderRoute,
  TransportOrderTrip,
  TransportOrderTruckingSize,
  TransportOrderShipmentType,
  TransportOrderType5Specific,
} from '@/types';
import { computeTransportOrderTotals, readFeeLines } from './transportOrderPricing';
import { routeFromMultiDrop } from './multiDrop';

export type TransportOrderWriteFields = {
  isMultiTrip: boolean;
  trips: TransportOrderTrip[];
  entryDate: string;
  truckId: string;
  truckPlate: string;
  driverId: string;
  driverName: string;

  truckType: string;

  customerOrderNumber: string;

  type5Specific: {
    requestedPickupDate: string;
    dropoffDate: string;
    moocStorageDays: number | null;
  };
  billNumber: string;

  declarationNumber: string;
  containerNumber: string;
  truckingSize: TransportOrderTruckingSize;
  shipmentType: TransportOrderShipmentType;
  route: TransportOrderRoute;

  fees: TransportOrderFee[];

  advanceAmount: number;

  laborCost: number;
  vatRate: number;

  roundDown: boolean;
  transportContractNo: string;
  customerCode?: string | undefined;
  customerName?: string | undefined;
  status: string;
  notes: string;
  extra: TransportOrderExtra;

  multiDrop?: TransportOrderMultiDrop | undefined;
};

const OWNED_EXTRA_KEYS: ReadonlySet<string> = new Set([
  'truckType',
  'customerOrderNumber',
  'type5Specific',
  'multiDrop',
]);

function compactType5Specific({
  requestedPickupDate,
  dropoffDate,
  moocStorageDays,
}: TransportOrderWriteFields['type5Specific']): TransportOrderType5Specific | undefined {
  const group: TransportOrderType5Specific = {
    ...(requestedPickupDate ? { requestedPickupDate } : {}),
    ...(dropoffDate ? { dropoffDate } : {}),
    ...(moocStorageDays !== null ? { moocStorageDays } : {}),
  };
  return Object.keys(group).length > 0 ? group : undefined;
}

type MirroredTripFields = Pick<
  TransportOrderWriteFields,
  'entryDate' | 'truckId' | 'truckPlate' | 'driverId' | 'driverName' | 'route'
>;

function deriveFromTrips(trips: TransportOrderTrip[]): Partial<MirroredTripFields> {
  const first = trips[0];
  const last = trips[trips.length - 1];
  if (!first || !last) return {};
  return {
    entryDate: String(first.date),
    truckId: first.truckId,
    truckPlate: first.truckPlate,
    driverId: first.driverId,
    driverName: first.driverName,
    route: {
      pickup: first.departure,
      stuffing: '',
      dropoff: last.destination,

      ...(first.loadingAt ? { pickupAt: first.loadingAt } : {}),
      ...(last.unloadingAt ? { dropoffAt: last.unloadingAt } : {}),
    },
  };
}

export function buildTransportOrderWrite(
  fields: TransportOrderWriteFields,
): Record<string, unknown> {
  const fees = readFeeLines({ fees: fields.fees });

  const { subtotal } = computeTransportOrderTotals(fees, fields.vatRate);

  const trips = fields.isMultiTrip ? fields.trips : [];

  const { truckType, customerOrderNumber, type5Specific, multiDrop, extra, ...rest } = fields;
  const carried = Object.fromEntries(
    Object.entries(extra).filter(([key]) => !OWNED_EXTRA_KEYS.has(key)),
  ) as TransportOrderExtra;
  const type5Group = compactType5Specific(type5Specific);
  return {
    ...rest,
    extra: {
      ...carried,
      ...(truckType ? { truckType } : {}),
      ...(customerOrderNumber ? { customerOrderNumber } : {}),
      ...(type5Group ? { type5Specific: type5Group } : {}),
      ...(multiDrop ? { multiDrop } : {}),
    },
    ...(fields.isMultiTrip ? deriveFromTrips(trips) : {}),
    ...(multiDrop ? { route: routeFromMultiDrop(multiDrop) } : {}),
    fees,
    trips,

    laborCost: fields.isMultiTrip ? 0 : fields.laborCost,

    disbursements: [],
    totalAmount: subtotal,
  };
}

export const MAX_ORDER_NUMBER_RETRIES = 50;

export function isDuplicateOrderNumberError(err: unknown): boolean {
  return isDuplicateUniqueFieldError(err, 'orderNumber');
}
