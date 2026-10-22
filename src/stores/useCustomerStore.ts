import type { Customer } from '@/types';
import { cMngtConnector } from '@credo/connectors/connector';
import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from './createSingleRecordsStore';

export const CUSTOMER_RECORD_TARGET = { entity: 'customers', uniqueField: 'code' } as const;

export const useCustomerStore = createSingleRecordsStore<Customer>({
  ...CUSTOMER_RECORD_TARGET,

  cacheKey: 'cst2.5f3e91',
  cacheTTL: 10 * ONE_MINUTE,
});

export async function fetchCustomerById(id: string): Promise<Customer> {
  const res = await cMngtConnector.getSingleRecordById(CUSTOMER_RECORD_TARGET, { id });
  return res.item as Customer;
}
