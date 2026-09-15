import { appConfig } from '@/config';

export type LookupV2CategoryId =
  | 'unit'
  | 'material-unit'
  | 'product-unit'
  | 'material-category'
  | 'product-category'
  | 'truck-type'
  | 'truck-maintenance-type'
  | 'trucking-size'
  | 'shipment-type'
  | 'fee-name'
  | 'vendor-type'
  | 'customer-type';

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

  { id: 'trucking-size', labelKey: 'lookups.categories.truckingSize', defaultSortOrder: 1 },

  { id: 'shipment-type', labelKey: 'lookups.categories.shipmentType', defaultSortOrder: 1 },

  { id: 'fee-name', labelKey: 'lookups.categories.feeName', defaultSortOrder: 1 },

  { id: 'vendor-type', labelKey: 'lookups.categories.vendorType', defaultSortOrder: 1 },

  { id: 'customer-type', labelKey: 'lookups.categories.customerType', defaultSortOrder: 1 },
  // No `product-type`: `product-category` and `product-unit` above already
  // serve both the v1 pages and products-v2. A third product category would
  // split one operator's curation across two lists.
];

const FLEET_ONLY_CATEGORIES: LookupV2CategoryId[] = ['truck-type', 'truck-maintenance-type'];

const TRANSPORT_ORDER_ONLY_CATEGORIES: LookupV2CategoryId[] = [
  'trucking-size',
  'shipment-type',
  'fee-name',
];

export function getEnabledLookupV2Categories(): LookupV2Category[] {
  const cfg = appConfig.features?.lookupV2;

  const trucksOn = appConfig.features?.trucks?.enabled ?? false;
  const transportOrdersOn = appConfig.features?.transportOrders?.enabled ?? false;
  const available = LOOKUP_V2_CATEGORIES.filter((c) => {
    if (!trucksOn && FLEET_ONLY_CATEGORIES.includes(c.id)) return false;
    if (!transportOrdersOn && TRANSPORT_ORDER_ONLY_CATEGORIES.includes(c.id)) return false;
    return true;
  });
  if (!cfg?.enabledCategories?.length) return available;
  return available.filter((c) => cfg.enabledCategories.includes(c.id));
}

export function getLookupV2Category(id: string): LookupV2Category | undefined {
  return getEnabledLookupV2Categories().find((c) => c.id === id);
}
