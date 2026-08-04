import type { OilTankRow } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from './createSingleRecordsStore';

export const OIL_TANK_RECORD_TARGET = {
  entity: 'oil-tank',
  uniqueField: 'code',
} as const;

export const useOilTankStore = createSingleRecordsStore<OilTankRow>({
  ...OIL_TANK_RECORD_TARGET,

  cacheKey: 'otk.5c8e2b',
  cacheTTL: 10 * ONE_MINUTE,
});
