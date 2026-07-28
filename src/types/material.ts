import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';
import type { UnitConversion } from './product';

export type MaterialExtra = {
  isDeleted?: boolean;

  units?: string[];

  category?: string;

  unitConversions?: UnitConversion[];

  description?: string;

  specification?: string;

  memo?: string;

  costPrice?: number;

  tags?: string[];

  attributes?: Array<{ key: string; value: string }>;

  images?: Array<{ url: string }>;

  minimumStock?: number;
  [key: string]: unknown;
};

export type Material = SingleRecordRow & {
  code: string;
  name: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  extra?: MaterialExtra;
};
