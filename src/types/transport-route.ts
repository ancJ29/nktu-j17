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

export type TransportRouteExtra = {
  isDeleted?: boolean;

  notes?: string;
  [key: string]: unknown;
};

export type TransportRouteRow = SingleRecordRow & {
  code: string;

  isActive: boolean;

  isMultiTrip?: boolean;

  route?: TransportRouteStops;

  trips?: TransportRouteLeg[];

  truckType?: string;

  containerSize?: string;

  freightAmount: number;

  laborCost?: number;
  createdAt: number;
  updatedAt: number;
  extra?: TransportRouteExtra;
};
