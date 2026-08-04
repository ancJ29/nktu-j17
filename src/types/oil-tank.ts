import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type OilTankExtra = {
  capacity?: number;

  currentLevel?: number;

  openingLevel?: number;

  openingDate?: string;

  fuelType?: string;

  location?: string;

  note?: string;

  isDeleted?: boolean;
  [key: string]: unknown;
};

export type OilTankRow = SingleRecordRow & {
  code: string;
  name: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  extra?: OilTankExtra;
};
