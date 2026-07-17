import type { Vendor } from '@/types';
import { cMngtConnector } from '@credo/connectors/connector';
import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from './createSingleRecordsStore';

export const VENDOR_RECORD_TARGET = { entity: 'vendors', uniqueField: 'code' } as const;

export const useVendorStore = createSingleRecordsStore<Vendor>({
  ...VENDOR_RECORD_TARGET,
  
  
  cacheKey: 'vnd2.a41c7e', 
  cacheTTL: 10 * ONE_MINUTE,
});

export async function fetchVendorById(id: string): Promise<Vendor> {
  const res = await cMngtConnector.getSingleRecordById(VENDOR_RECORD_TARGET, { id });
  return res.item as Vendor;
}
