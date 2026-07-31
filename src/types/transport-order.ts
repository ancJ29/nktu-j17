import type { DateTimeInput } from '@credo/kits/types';
import type { PartitionedRecordRow } from '@/stores/createPartitionedRecordsStore';

export type TransportOrderContainerSize = string;

export type TransportOrderShipmentType = string;

export type TransportOrderRoute = {
  pickup: string;

  pickupAt?: DateTimeInput;

  stuffing: string;

  stuffingAt?: DateTimeInput;

  dropoff: string;

  dropoffAt?: DateTimeInput;
};

export type TransportOrderTrip = {
  departure: string;

  destination: string;

  date: DateTimeInput;

  loadingAt?: DateTimeInput;
  unloadingAt?: DateTimeInput;

  truckId: string;

  truckPlate: string;

  driverId: string;

  driverName: string;

  laborCost: number;
};

export type TransportOrderFeeKind = 'service' | 'passthrough';

export type TransportOrderFeePayer = 'company' | 'customer';

export type TransportOrderFee = {
  label: string;

  amount: number;

  vatable: boolean;
  kind: TransportOrderFeeKind;

  payer?: TransportOrderFeePayer;

  invoiceNo: string;

  memo?: string;
};

export type TransportOrderDisbursement = {
  name: string;

  amount: number;

  invoiceNo: string;
};

export type TransportOrderActivityEntry = {
  timestamp: DateTimeInput;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  userId?: string;
  userName?: string;
  note?: string;
};

export type TransportOrderCancellation = {
  at: DateTimeInput;
  by?: { id: string; name: string };
  reason?: string;
  fromStatus: string;
};

export type TransportOrderTripLogRef = {
  logId: string;
  targetId: string;
  period: string;

  tripIndex: number;
};

export type TransportOrderTripLogSync = {
  hash: string;
  refs: TransportOrderTripLogRef[];
};

export type TransportOrderExtra = {
  isDeleted?: boolean;
  cancellation?: TransportOrderCancellation;
  createdBy?: string;
  activityLog?: TransportOrderActivityEntry[];

  tripLogSync?: TransportOrderTripLogSync;
  [key: string]: unknown;
};

export type TransportOrder = PartitionedRecordRow & {
  orderNumber: string;

  isMultiTrip?: boolean;

  trips?: TransportOrderTrip[];

  entryDate: DateTimeInput;

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

  disbursements?: TransportOrderDisbursement[];

  advanceAmount?: number;

  vatRate: number;

  transportContractNo: string;

  customerCode?: string;
  customerName?: string;

  status: string;

  totalAmount: number;
  notes: string;
  extra: TransportOrderExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
};
