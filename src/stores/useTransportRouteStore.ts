import type { TransportRouteRow } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from './createSingleRecordsStore';

export const TRANSPORT_ROUTE_RECORD_TARGET = {
  entity: 'transport-route',
  uniqueField: 'code',
} as const;

export const useTransportRouteStore = createSingleRecordsStore<TransportRouteRow>({
  ...TRANSPORT_ROUTE_RECORD_TARGET,

  cacheKey: 'trt.4b7e21',
  cacheTTL: 10 * ONE_MINUTE,
});
