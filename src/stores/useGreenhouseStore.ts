import type { Greenhouse } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from './createSingleRecordsStore';

export const GREENHOUSE_RECORD_TARGET = { entity: 'greenhouse', uniqueField: 'code' } as const;

export const useGreenhouseStore = createSingleRecordsStore<Greenhouse>({
  ...GREENHOUSE_RECORD_TARGET,
  
  cacheKey: 'grnh.a7f3c1',
  cacheTTL: 10 * ONE_MINUTE,
});
