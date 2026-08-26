import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type TransportRouteLeg = {
  departure: string;

  destination: string;

  laborCost: number;
};

export type TransportRouteStops = {
  pickup: string;

  stuffing?: string;

  dropoff: string;
};

export type TransportRouteSegment = {
  from: string;

  to: string;

  distanceKm: number;
};

export type TransportRouteCostItem = {
  name: string;

  unit: string;

  quantity: number;

  amount: number;

  note?: string;
};

export type TransportRouteExtra = {
  isDeleted?: boolean;

  notes?: string;
  [key: string]: unknown;
};

export type TransportRouteRow = SingleRecordRow & {
  code: string;

  name?: string;

  isActive: boolean;

  isMultiTrip?: boolean;

  route?: TransportRouteStops;

  trips?: TransportRouteLeg[];

  truckType?: string;

  containerSize?: string;

  freightAmount: number;

  basePay?: number;

  allowance?: number;

  laborCost?: number;

  segments?: TransportRouteSegment[];

  costItems?: TransportRouteCostItem[];

  markupPercent?: number;
  createdAt: number;
  updatedAt: number;
  extra?: TransportRouteExtra;
};
