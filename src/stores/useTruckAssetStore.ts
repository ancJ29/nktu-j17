import type { TruckAssetRow } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from './createSingleRecordsStore';

export const TRUCK_ASSET_RECORD_TARGET = {
  entity: 'truck-asset',
  uniqueField: 'code',
} as const;

export const useTruckAssetStore = createSingleRecordsStore<TruckAssetRow>({
  ...TRUCK_ASSET_RECORD_TARGET,
  
  cacheKey: 'tav2.9f3c1d',
  cacheTTL: 10 * ONE_MINUTE,
});
