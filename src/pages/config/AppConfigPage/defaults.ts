import { defaultAppConfig, type GoodsReceiptFeatures, type ProductFeatures } from '@/config/schema';
import type {
  AuthFeatures,
  CMngtActivityLogFeatures,
  CMngtAppConfig,
  CMngtCustomerFeatures,
  CMngtDeliveryRequestFeatures,
  CMngtTransportOrderFeatures,
  CMngtEmployeeFeatures,
  CMngtLayoutConfig,
  CMngtLocationFeatures,
  CMngtLookupFeatures,
  CMngtModuleFeatures,
  CMngtPermissionManagementFeatures,
  CMngtPricingFeatures,
  CMngtSalesOrderFeatures,
  CMngtVendorFeatures,
  CMngtWarehouseDocFeatures,
  ThemeConfig,
} from '@credo/kits/types';

export const SCHEMA_DEFAULT_AUTH: AuthFeatures = defaultAppConfig.auth;
export const SCHEMA_DEFAULT_THEME: ThemeConfig = defaultAppConfig.themeConfig;
export const SCHEMA_DEFAULT_EMPLOYEE_FEATURES: CMngtEmployeeFeatures =
  defaultAppConfig.features.employees;
export const SCHEMA_DEFAULT_PERM_MNGT_FEATURES: CMngtPermissionManagementFeatures =
  defaultAppConfig.features.permissionManagement;
export const SCHEMA_DEFAULT_ACTIVITY_LOG_FEATURES: CMngtActivityLogFeatures =
  defaultAppConfig.features.activityLog;
export const SCHEMA_DEFAULT_PRICING_FEATURES: CMngtPricingFeatures =
  defaultAppConfig.features.pricing;
export const SCHEMA_DEFAULT_MODULE_FEATURES: CMngtModuleFeatures = { enabled: false };

export const SCHEMA_DEFAULT_MATERIAL_FEATURES = defaultAppConfig.features.materials;

export const SCHEMA_DEFAULT_MATERIAL_INVENTORY_FEATURES =
  defaultAppConfig.features.materialInventory;

export const SCHEMA_DEFAULT_WAREHOUSE_RECEIPT_FEATURES: CMngtWarehouseDocFeatures =
  defaultAppConfig.features.warehouseReceipts;
export const SCHEMA_DEFAULT_WAREHOUSE_DELIVERY_NOTE_FEATURES: CMngtWarehouseDocFeatures =
  defaultAppConfig.features.warehouseDeliveryNotes;
export const SCHEMA_DEFAULT_LOOKUP_FEATURES: CMngtLookupFeatures = {
  enabled: false,
  enabledCategories: [],
};
export const SCHEMA_DEFAULT_PRODUCT_FEATURES: ProductFeatures = defaultAppConfig.features.products;
export const SCHEMA_DEFAULT_LOCATION_FEATURES: CMngtLocationFeatures =
  defaultAppConfig.features.locations;
export const SCHEMA_DEFAULT_CUSTOMER_FEATURES: CMngtCustomerFeatures =
  defaultAppConfig.features.customers;
export const SCHEMA_DEFAULT_VENDOR_FEATURES: CMngtVendorFeatures =
  defaultAppConfig.features.vendors;
export const SCHEMA_DEFAULT_SALES_ORDER_FEATURES: CMngtSalesOrderFeatures = {
  enabled: false,
  codePrefix: 'SO-',
  codePadLength: 4,
  statusOptions: [],
  tagOptions: [],
};
export const SCHEMA_DEFAULT_DELIVERY_REQUEST_FEATURES: CMngtDeliveryRequestFeatures = {
  enabled: false,
  codePrefix: 'DR-',
  codePadLength: 4,
  statusOptions: [],
};
export const SCHEMA_DEFAULT_GOODS_RECEIPT_FEATURES: GoodsReceiptFeatures =
  defaultAppConfig.features.goodsReceipts;
export const SCHEMA_DEFAULT_TRANSPORT_ORDER_FEATURES: CMngtTransportOrderFeatures = {
  enabled: false,
  codePrefix: 'VC-',
  codePadLength: 3,
  statusOptions: [],
  statusTransitions: {},
  driverDepartments: [],
};
export const SCHEMA_DEFAULT_LAYOUT: CMngtLayoutConfig = defaultAppConfig.layout;

export const DEFAULT_CONFIG = defaultAppConfig as CMngtAppConfig;
