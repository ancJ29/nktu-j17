import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type ProductV2Extra = {
  isDeleted?: boolean;

  category?: string;

  minimumInventory?: { value: number; unit?: string };

  ignoreStockAlert?: boolean;

  attributes?: ProductV2Attribute[];

  images?: ProductV2ImageEntry[];
  [key: string]: unknown;
};

export type ProductV2ImageEntry = { url: string };

export type ProductV2Attribute = { key: string; value: string };

export type ProductV2Row = SingleRecordRow & {
  code: string;
  name: string;

  unit?: string;

  price?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  extra?: ProductV2Extra;
};
