import type { FuelPriceRow } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from './createSingleRecordsStore';

const FUEL_PRICE_RECORD_TARGET = {
  entity: 'fuel-price',
} as const;

export const useFuelPriceStore = createSingleRecordsStore<FuelPriceRow>({
  ...FUEL_PRICE_RECORD_TARGET,

  cacheKey: 'fpr.2e77b0',
  cacheTTL: 10 * ONE_MINUTE,
});
