import type { PurchaseOrder } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createPartitionedRecordsStore } from './createPartitionedRecordsStore';

export const PURCHASE_ORDER_RANGE_DAYS = 90;

export const purchaseOrderBundle = createPartitionedRecordsStore<PurchaseOrder>({
  entity: 'purchase-orders',
  partitionLocate: 'creation:day',
  uniqueField: 'orderNumber',

  cacheKey: 'po2.194fe3',
  cacheTTL: ONE_MINUTE,
  staleTime: ONE_MINUTE,
  defaultRangeDays: PURCHASE_ORDER_RANGE_DAYS,
});

export const usePurchaseOrderStore = purchaseOrderBundle.useStore;

export const setPurchaseOrderQueryRange = purchaseOrderBundle.setRange;
