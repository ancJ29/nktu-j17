import { appConfig } from '@/config';
import type { CMngtAppConfig } from '@/config/schema';

export const CUSTOMER_V2_LIST_COLUMNS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'customerType', label: 'Type' },
  { key: 'contact', label: 'Contact' },
  { key: 'address', label: 'Address' },
  { key: 'status', label: 'Status' },
];

export const customerV2ListColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.customersV2?.listColumns ?? [];

export const customerV2HiddenColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.customersV2?.hiddenColumns ?? [];
