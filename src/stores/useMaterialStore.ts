import type { Material } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from './createSingleRecordsStore';

export const MATERIAL_RECORD_TARGET = { entity: 'materials', uniqueField: 'code' } as const;

export const useMaterialStore = createSingleRecordsStore<Material>({
  ...MATERIAL_RECORD_TARGET,
  
  cacheKey: 'mat2.bee51a', 
  cacheTTL: 10 * ONE_MINUTE,
});
