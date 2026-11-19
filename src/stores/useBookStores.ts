import type { BookEntry } from '@/types';
import { createPartitionedRecordsStore } from './createPartitionedRecordsStore';

export const cashBookBundle = createPartitionedRecordsStore<BookEntry>({
  entity: 'nktu-cash-book',
  partitionLocate: 'explicit',

  cacheKey: 'cbk1.5d2e81',
  keysForRange: () => [],
});

export const productStockLogBundle = createPartitionedRecordsStore<BookEntry>({
  entity: 'product-stock-log',
  partitionLocate: 'explicit',

  cacheKey: 'psl1.9a4c63',
  keysForRange: () => [],
});
