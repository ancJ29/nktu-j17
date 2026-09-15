import { appConfig } from '@/config';

const features = appConfig?.features;

export const featureFlags = {
  employees: {
    enabled: features?.employees?.enabled ?? true,
    selfManage: features?.employees?.selfManage ?? false,

    v2: features?.employees?.v2 ?? false,
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
  vendorsV2: {
    enabled: features?.vendorsV2?.enabled ?? false,

    simpleMode: features?.vendorsV2?.simpleMode ?? true,
  },
  customersV2: {
    enabled: features?.customersV2?.enabled ?? false,
    simpleMode: features?.customersV2?.simpleMode ?? true,
  },
  productsV2: {
    enabled: features?.productsV2?.enabled ?? false,
    simpleMode: features?.productsV2?.simpleMode ?? true,

    priceManagement: features?.productsV2?.priceManagement ?? false,
    productPhoto: features?.productsV2?.productPhoto ?? false,
    inventory: features?.productsV2?.inventory ?? false,
    incomingColumn: features?.productsV2?.incomingColumn ?? false,
    incomingReceipts: features?.productsV2?.incomingReceipts ?? false,
    outgoingOrders: features?.productsV2?.outgoingOrders ?? false,
  },
  materialsV2: {
    enabled: features?.materialsV2?.enabled ?? false,
    simpleMode: features?.materialsV2?.simpleMode ?? true,
    unitCategory: features?.materialsV2?.unitCategory ?? 'material-unit',
    inventory: features?.materialsV2?.inventory ?? false,
  },
  goodsReceiptsV2: {
    enabled: features?.goodsReceiptsV2?.enabled ?? false,
    defaultRangeDays: features?.goodsReceiptsV2?.defaultRangeDays ?? 14,
  },
  salesOrdersV2: {
    enabled: features?.salesOrdersV2?.enabled ?? false,
    defaultRangeDays: features?.salesOrdersV2?.defaultRangeDays ?? 14,
    paymentTracking: features?.salesOrdersV2?.paymentTracking ?? false,
  },
  deliveryNotesV2: {
    enabled: features?.deliveryNotesV2?.enabled ?? false,
    defaultRangeDays: features?.deliveryNotesV2?.defaultRangeDays ?? 14,
    deliveryPhotoRequired: features?.deliveryNotesV2?.deliveryPhotoRequired ?? true,
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
  lookupV2: {
    enabled: features?.lookupV2?.enabled ?? false,
  },
  trucks: {
    enabled: features?.trucks?.enabled ?? false,
  },
  oilTanks: {
    enabled: features?.oilTanks?.enabled ?? false,
  },
  farm: {
    enabled: features?.farm?.enabled ?? false,
  },
};
