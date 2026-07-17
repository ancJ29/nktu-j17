import type { CMngtProductInventory } from '@credo/connectors/types';
import type { Product } from './product';
import type { InventorySecondaryStatus } from './inventoryStatus';

export type ProductInventoryExtra = {
  isDeleted?: boolean;
  
  lastNote?: string;
  
  unit?: string;
  
  onHandByUnit?: Record<string, number>;
  
  reservedByUnit?: Record<string, number>;
  
  reservedBySalesOrder?: Record<string, { orderNumber: string; byUnit: Record<string, number> }>;
  
  receivedByGoodsReceipt?: Record<
    string,
    { receiptNumber: string; byUnit: Record<string, number> }
  >;
  
  expectedFromGoodsReceipt?: Record<
    string,
    { receiptNumber: string; byUnit: Record<string, number> }
  >;
  
  beginOfPeriod?: Record<string, number>;
  [key: string]: unknown;
};

export type ProductInventoryRow = CMngtProductInventory<ProductInventoryExtra>;

export type ProductInventorySummary = {
  
  readonly id: string;
  readonly product: Product;
  readonly rows: ProductInventoryRow[];
  readonly totalOnHand: number;
  readonly totalByUnit: Record<string, number>;
  
  readonly totalReserved: number;
  
  readonly reservedByUnit: Record<string, number>;
  
  readonly totalAvailable: number;
  
  readonly totalBeginOfPeriod: number;
  
  readonly hasBeginOfPeriod: boolean;
  
  readonly secondaryStatus: InventorySecondaryStatus;
  readonly lastUpdatedAt: string | null;
};
