import type { WarehouseDocRow } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createPartitionedRecordsStore } from './createPartitionedRecordsStore';

type Bundle = ReturnType<typeof createPartitionedRecordsStore<WarehouseDocRow>>;

const warehouseReceipt: Bundle = createPartitionedRecordsStore<WarehouseDocRow>({
  entity: 'warehouse-receipts',
  partitionLocate: 'explicit',
  uniqueField: 'extra.code',

  cacheKey: 'whr2.e421aa',
  cacheTTL: ONE_MINUTE,
  staleTime: ONE_MINUTE,
});

const warehouseDeliveryNote: Bundle = createPartitionedRecordsStore<WarehouseDocRow>({
  entity: 'warehouse-delivery-notes',
  partitionLocate: 'explicit',
  uniqueField: 'extra.code',

  cacheKey: 'whdn2.5b9d41',
  cacheTTL: ONE_MINUTE,
  staleTime: ONE_MINUTE,
});

export const warehouseDocBundles = {
  'warehouse-receipts': warehouseReceipt,
  'warehouse-delivery-notes': warehouseDeliveryNote,
} as const;

export type WarehouseDocEntity = keyof typeof warehouseDocBundles;
