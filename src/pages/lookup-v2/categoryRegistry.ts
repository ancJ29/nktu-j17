

import { appConfig } from '@/config';

export type LookupV2CategoryId =
  | 'unit'
  | 'material-unit'
  | 'product-unit'
  | 'material-category'
  | 'product-category'
  | 'truck-type'
  | 'truck-maintenance-type';

export type LookupV2Category = {
  id: LookupV2CategoryId;
  
  labelKey: string;
  
  defaultSortOrder: number;
};

export const LOOKUP_V2_CATEGORIES: LookupV2Category[] = [
  { id: 'unit', labelKey: 'lookups.categories.unit', defaultSortOrder: 1 },
  { id: 'material-unit', labelKey: 'lookups.categories.materialUnit', defaultSortOrder: 1 },
  { id: 'product-unit', labelKey: 'lookups.categories.productUnit', defaultSortOrder: 1 },
  {
    id: 'material-category',
    labelKey: 'lookups.categories.materialCategory',
    defaultSortOrder: 1,
  },
  { id: 'product-category', labelKey: 'lookups.categories.productCategory', defaultSortOrder: 1 },
  
  
  { id: 'truck-type', labelKey: 'lookups.categories.truckType', defaultSortOrder: 1 },
  
  
  {
    id: 'truck-maintenance-type',
    labelKey: 'lookups.categories.maintenanceType',
    defaultSortOrder: 1,
  },
];

const FLEET_ONLY_CATEGORIES: LookupV2CategoryId[] = ['truck-type', 'truck-maintenance-type'];

export function getEnabledLookupV2Categories(): LookupV2Category[] {
  const cfg = appConfig.features?.lookupV2;
  
  
  
  const trucksOn = appConfig.features?.trucks?.enabled ?? false;
  const available = trucksOn
    ? LOOKUP_V2_CATEGORIES
    : LOOKUP_V2_CATEGORIES.filter((c) => !FLEET_ONLY_CATEGORIES.includes(c.id));
  if (!cfg?.enabledCategories?.length) return available;
  return available.filter((c) => cfg.enabledCategories.includes(c.id));
}

export function getLookupV2Category(id: string): LookupV2Category | undefined {
  return getEnabledLookupV2Categories().find((c) => c.id === id);
}
