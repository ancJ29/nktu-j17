import type { OdometerFuelPayment, OdometerFuelReset } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createPartitionedRecordsStore } from './createPartitionedRecordsStore';
import { createSingleRecordsStore } from './createSingleRecordsStore';

export const odometerFuelPaymentBundle = createPartitionedRecordsStore<OdometerFuelPayment>({
  entity: 'odometer-fuel-payments',
  partitionLocate: 'explicit',
  
  
  cacheKey: 'ofp1.7f07b1', 
  cacheTTL: ONE_MINUTE,
  staleTime: ONE_MINUTE,
  defaultRangeDays: 31,
});

export const useOdometerFuelResetStore = createSingleRecordsStore<OdometerFuelReset>({
  entity: 'odometer-fuel-resets',
  
  
  cacheKey: 'ofr1.31b8eb', 
  cacheTTL: ONE_MINUTE,
  staleTime: ONE_MINUTE,
});
