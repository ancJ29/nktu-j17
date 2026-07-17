
import { CallApiError } from '@credo/connectors/connector';
import type {
  TransportOrderExtra,
  TransportOrderFee,
  TransportOrderRoute,
  TransportOrderTrip,
  TransportOrderContainerSize,
  TransportOrderShipmentType,
} from '@/types';
import { computeTransportOrderTotals, readFeeLines } from './transportOrderPricing';

export type TransportOrderWriteFields = {
  isMultiTrip: boolean;
  trips: TransportOrderTrip[];
  entryDate: string;
  truckId: string;
  truckPlate: string;
  driverId: string;
  driverName: string;
  billNumber: string;
  containerNumber: string;
  containerSize: TransportOrderContainerSize;
  shipmentType: TransportOrderShipmentType;
  route: TransportOrderRoute;
  
  fees: TransportOrderFee[];
  
  advanceAmount: number;
  vatRate: number;
  transportContractNo: string;
  customerCode?: string | undefined;
  customerName?: string | undefined;
  status: string;
  notes: string;
  extra: TransportOrderExtra;
};

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
    route: { pickup: first.departure, stuffing: '', dropoff: last.destination },
  };
}

export function buildTransportOrderWrite(
  fields: TransportOrderWriteFields,
): Record<string, unknown> {
  
  
  
  
  const fees = readFeeLines({ fees: fields.fees });
  const { subtotal } = computeTransportOrderTotals(fees, fields.vatRate);
  
  
  
  const trips = fields.isMultiTrip ? fields.trips : [];
  return {
    ...fields,
    ...(fields.isMultiTrip ? deriveFromTrips(trips) : {}),
    fees,
    trips,
    
    
    
    
    disbursements: [],
    totalAmount: subtotal,
  };
}

export const MAX_ORDER_NUMBER_RETRIES = 50;

export function isDuplicateOrderNumberError(err: unknown): boolean {
  if (!(err instanceof CallApiError) || err.status !== 400) return false;
  const payload = err.payload;
  if (typeof payload !== 'object' || payload === null || !('fields' in payload)) return false;
  const fields = (payload as { fields?: unknown }).fields;
  return typeof fields === 'object' && fields !== null && 'orderNumber' in fields;
}
