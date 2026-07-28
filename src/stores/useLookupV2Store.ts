import type { LookupV2Row } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from './createSingleRecordsStore';

export const useLookupV2Store = createSingleRecordsStore<LookupV2Row>({
  entity: 'lookup',
  uniqueField: ['category', 'value'],

  cacheKey: 'lkpv2.6a8be4',
  cacheTTL: 10 * ONE_MINUTE,
});
