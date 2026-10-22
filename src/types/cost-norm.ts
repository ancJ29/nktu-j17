import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';
import type { CostNormAuditStamp } from '@/pages/cost-norms/updatedBy';

export type FuelNormRow = SingleRecordRow & {
  truckType: string;

  litersPer100km: number;
  createdAt: number;
  updatedAt: number;
  extra?: FuelNormExtra;
};

export type FuelNormExtra = CostNormAuditStamp & {
  isDeleted?: boolean;
  [key: string]: unknown;
};

export type FuelPriceRow = SingleRecordRow & {
  price: number;

  effectiveDate: string;
  createdAt: number;
  updatedAt: number;
  extra?: FuelPriceExtra;
};

export type FuelPriceExtra = CostNormAuditStamp & {
  isDeleted?: boolean;

  notes?: string;

  affectedRouteCodes?: string[];
  [key: string]: unknown;
};
