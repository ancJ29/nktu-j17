import type { CMngtProduct } from '@credo/connectors/types';

export type ProductImageEntry = {
  url: string;
};

export type UnitConversion = {
  unit: string;
  quantity: number;
  baseUnit: string;
};

export type ProductSetItem = {
  productCode: string;
  quantity: number;
  unit: string;
};

export type ProductMinimumInventory = {
  value: number;
  unit: string;
  configBy: 'system' | 'user';

  updatedAt: number;

  updatedBy: string;
};

export type ProductExtra = {
  units?: string[];
  alternativeNames?: string[];
  isDeleted?: boolean;
  images?: ProductImageEntry[];

  sku?: string;

  barcode?: string;

  basePrice?: number;

  suggestedPrice?: number;

  category?: string;

  attributes?: Array<{ key: string; value: string }>;

  minimumInventory?: ProductMinimumInventory;

  noInventory?: boolean;

  hiddenFromInventoryList?: boolean;

  unitConversions?: UnitConversion[];

  techSpecs?: Array<{ key: string; value: string }>;

  setItems?: ProductSetItem[];

  setMode?: 'bundle' | 'breakdown';

  [key: string]: unknown;
};

export type Product = CMngtProduct<ProductExtra>;
