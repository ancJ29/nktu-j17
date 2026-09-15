import { appConfig } from '@/config';
import type { CMngtAppConfig } from '@/config/schema';

export const VENDOR_V2_LIST_COLUMNS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'vendorType', label: 'Type' },
  { key: 'contact', label: 'Contact' },
  { key: 'status', label: 'Status' },
];

export const vendorV2ListColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.vendorsV2?.listColumns ?? [];

export const vendorV2HiddenColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.vendorsV2?.hiddenColumns ?? [];
