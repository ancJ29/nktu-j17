import { appConfig } from '@/config';
import type { CMngtAppConfig } from '@/config/schema';

export const MATERIAL_V2_LIST_COLUMNS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'onHand', label: 'Stock on hand' },
  { key: 'status', label: 'Status' },
];

export const materialV2ListColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.materialsV2?.listColumns ?? [];

export const materialV2HiddenColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.materialsV2?.hiddenColumns ?? [];
