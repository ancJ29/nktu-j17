import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type FuelNormRow = SingleRecordRow & {
  truckType: string;

  litersPer100km: number;
  createdAt: number;
  updatedAt: number;
  extra?: FuelNormExtra;
};

export type FuelNormExtra = {
  isDeleted?: boolean;

  updatedById?: string;
  updatedByName?: string;
  [key: string]: unknown;
};

export type FuelPriceRow = SingleRecordRow & {
  price: number;

  effectiveDate: string;
  createdAt: number;
  updatedAt: number;
  extra?: FuelPriceExtra;
};

export type FuelPriceExtra = {
  isDeleted?: boolean;

  updatedById?: string;
  updatedByName?: string;

  notes?: string;
  [key: string]: unknown;
};
