import type { TransportOrder } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createPartitionedRecordsStore } from './createPartitionedRecordsStore';

export const transportOrderBundle = createPartitionedRecordsStore<TransportOrder>({
  entity: 'transport-orders',
  partitionLocate: 'creation:day',
  
  
  uniqueField: 'orderNumber',
  
  
  cacheKey: 'to2.9c14be', 
  cacheTTL: ONE_MINUTE,
  staleTime: ONE_MINUTE,
  defaultRangeDays: 14,
});

export const useTransportOrderStore = transportOrderBundle.useStore;

export const setTransportOrderQueryRange = transportOrderBundle.setRange;

export const getTransportOrderQueryRange = transportOrderBundle.getRange;
