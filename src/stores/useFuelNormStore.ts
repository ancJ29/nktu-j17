import type { FuelNormRow } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from './createSingleRecordsStore';

const FUEL_NORM_RECORD_TARGET = {
  entity: 'fuel-norm',
  uniqueField: 'truckType',
} as const;

export const useFuelNormStore = createSingleRecordsStore<FuelNormRow>({
  ...FUEL_NORM_RECORD_TARGET,

  cacheKey: 'fnm.9c1d43',
  cacheTTL: 10 * ONE_MINUTE,
});
