import type { MaterialInventoryRow } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from './createSingleRecordsStore';

export const useMaterialInventoryStore = createSingleRecordsStore<MaterialInventoryRow>({
  entity: 'material-inventory',
  uniqueField: 'itemCode',
  
  
  cacheKey: 'matinv.298186', 
  cacheTTL: ONE_MINUTE,
  staleTime: ONE_MINUTE,
});
