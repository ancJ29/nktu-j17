import { appConfig } from '@/config';

const features = appConfig?.features;

export const featureFlags = {
  employees: {
    enabled: features?.employees?.enabled ?? true,
    selfManage: features?.employees?.selfManage ?? false,
  },
  products: {
    enabled: features?.products?.enabled ?? false,
  },
  materials: {
    enabled: features?.materials?.enabled ?? false,
  },
  customers: {
    enabled: features?.customers?.enabled ?? false,
  },
  vendors: {
    enabled: features?.vendors?.enabled ?? false,
  },
  salesOrders: {
    enabled: features?.salesOrders?.enabled ?? false,
  },
  deliveryRequests: {
    enabled: features?.deliveryRequests?.enabled ?? false,
  },
  goodsReceipts: {
    enabled: features?.goodsReceipts?.enabled ?? false,
  },
  warehouseReceipts: {
    enabled: features?.warehouseReceipts?.enabled ?? false,
  },
  warehouseDeliveryNotes: {
    enabled: features?.warehouseDeliveryNotes?.enabled ?? false,
  },
  transportOrders: {
    enabled: features?.transportOrders?.enabled ?? false,
  },
  locations: {
    enabled: features?.locations?.enabled ?? false,
  },
  productInventory: {
    enabled: features?.productInventory?.enabled ?? false,
  },
  materialInventory: {
    enabled: features?.materialInventory?.enabled ?? false,
  },
  lookups: {
    enabled: features?.lookups?.enabled ?? false,
  },
  lookupV2: {
    enabled: features?.lookupV2?.enabled ?? false,
  },
  trucks: {
    enabled: features?.trucks?.enabled ?? false,
  },
  farm: {
    enabled: features?.farm?.enabled ?? false,
  },
};
