import type { AppConfig } from './app-config';

export type ConfigOption = {
  value: string;
  label: Record<string, string>; // { en: "Sales", vi: "Kinh Doanh" }
};

export type PartialModulePermissions = {
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  actions?: Record<string, boolean>;
  query?: Record<string, boolean>;
};

export type PartialPermissions = Record<string, PartialModulePermissions>;

export type DepartmentOption = ConfigOption & {
  permissions?: PartialPermissions;
};

export type CMngtEmployeeFeatures = {
  enabled: boolean;

  selfManage?: boolean;
  email: boolean;
  position: boolean;
  department: boolean;
  allowLogin: boolean;
  bulkImport: boolean;

  avatar: boolean;

  startDate: boolean;

  address: boolean;

  dateOfBirth: boolean;

  driverProfile: boolean;

  driverDepartments: string[];

  codePrefix: string;

  codePadLength: number;
  departmentOptions: DepartmentOption[];
  positionOptions: ConfigOption[];
};

export type CMngtLayoutConfig = {
  navbar: {
    width: number;
    displayIconWhenCollapsed: boolean;

    variant?: 'dark' | 'light';
  };
  header?: {
    variant?: 'dark' | 'light';
  };
};

export type CMngtPermissionManagementFeatures = {
  enabled: boolean;
  rootUserOnly: boolean;
  showRestrictedItems: boolean;
};

export type CMngtActivityLogFeatures = {
  enabled: boolean;
};

export type CMngtPricingFeatures = {
  enabled: boolean;
};

export type CMngtModuleFeatures = {
  enabled: boolean;
};

export type CMngtLookupFeatures = {
  enabled: boolean;

  enabledCategories: string[];
};

export type CMngtProductFeatures = {
  enabled: boolean;

  codePrefix: string;

  codePadLength: number;

  priceManagement: boolean;

  bulkImport: boolean;

  technicalSpecs: boolean;

  barcode: boolean;

  images: boolean;
};

export type CMngtMaterialFeatures = {
  enabled: boolean;

  multiUnit: boolean;

  unitCategory: 'unit' | 'material-unit';

  description: boolean;
  specification: boolean;
  memo: boolean;
  pricing: boolean;

  tags: boolean;
  attributes: boolean;

  images: boolean;

  minimumStock: boolean;

  bulkImport: boolean;
};

export type CMngtMaterialInventoryFeatures = {
  enabled: boolean;
};

export type CMngtWarehouseDocFeatures = {
  enabled: boolean;
  codePrefix: string;
  codePadLength: number;

  postInventory: boolean;
};

export type CMngtLocationFeatures = {
  enabled: boolean;

  codePrefix: string;

  codePadLength: number;
};

export type CMngtCustomerFeatures = {
  enabled: boolean;

  codePrefix: string;

  codePadLength: number;

  shippingAddress: boolean;
  customerTypeOptions: ConfigOption[];
};

export type CMngtVendorFeatures = {
  enabled: boolean;

  codePrefix: string;

  codePadLength: number;
};

export type CMngtSalesOrderStage = 'DRAFT' | 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'EXCEPTIONAL';

export type CMngtStatusCapabilityBinding = {
  id: string;
  config?: unknown;
};

export type CMngtSalesOrderStatusOption = ConfigOption & {
  color: string;
  actionLabel?: Record<string, string>;
  icon?: string;
  stage: CMngtSalesOrderStage;
  capabilities: CMngtStatusCapabilityBinding[];

  allowedDepartments?: string[];
};

export type CMngtSalesOrderTagOption = ConfigOption & {
  color: string;
};

export type CMngtSalesOrderFeatures = {
  enabled: boolean;

  codePrefix: string;

  codePadLength: number;
  statusOptions: CMngtSalesOrderStatusOption[];

  statusTransitions?: Record<string, string[]>;
  deliveryMethodOptions?: ConfigOption[];
  tagOptions?: CMngtSalesOrderTagOption[];

  deliveryPackageSizeOptions?: string[];

  picDepartments?: string[];
};

export type CMngtQuotationFeatures = {
  priceByMinQuantity: boolean;
};

export type CMngtDeliveryRequestStage = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'EXCEPTIONAL';

export type CMngtDeliveryRequestStatusOption = ConfigOption & {
  color: string;
  actionLabel?: Record<string, string>;
  icon?: string;
  stage: CMngtDeliveryRequestStage;
  capabilities: CMngtStatusCapabilityBinding[];
};

export type CMngtDeliveryRequestFeatures = {
  enabled: boolean;

  codePrefix: string;

  codePadLength: number;
  statusOptions: CMngtDeliveryRequestStatusOption[];

  statusTransitions?: Record<string, string[]>;

  driverDepartments?: string[];

  returnShipment?: {
    enabled: boolean;
    autoRestockOnComplete: boolean;
  };
};

export type CMngtGoodsReceiptFeatures = {
  enabled: boolean;

  codePrefix: string;

  codePadLength: number;

  picDepartments?: string[];
};

export type CMngtTransportOrderStatusOption = ConfigOption & {
  color: string;
  actionLabel?: Record<string, string>;
  icon?: string;

  isInitial?: boolean;

  terminal?: boolean;

  locked?: boolean;

  allowedDepartments?: string[];
};

export type CMngtTransportOrderFeatures = {
  enabled: boolean;

  codePrefix: string;

  codePadLength: number;

  routeCodePrefix?: string;

  nonContainerTruckTypes?: string[];

  statusOptions: CMngtTransportOrderStatusOption[];

  statusTransitions?: Record<string, string[]>;

  driverDepartments?: string[];
};

export type CMngtCompanyInfo = {
  name: string;
  address: string;
  taxCode: string;
  tel: string;
  email: string;
};

export type CMngtDisplaySettings = {
  dateFormat: 'DD/MM/YYYY' | 'YYYY/MM/DD' | 'YYYY-MM-DD' | 'DD-MM-YYYY';
  dateTimeFormat:
    | 'HH:mm DD/MM/YYYY'
    | 'DD/MM/YYYY HH:mm'
    | 'HH:mm YYYY/MM/DD'
    | 'YYYY/MM/DD HH:mm'
    | 'HH:mm DD-MM-YYYY'
    | 'DD-MM-YYYY HH:mm'
    | 'HH:mm YYYY-MM-DD'
    | 'YYYY-MM-DD HH:mm';
};

export type CMngtAppConfig = AppConfig & {
  features: {
    common: {
      darkMode: boolean;
      languageSwitcher: boolean;
      enablePdfSharing: boolean;
      authViaBff: boolean;
      enableStats: boolean;

      tableDensity?: 'comfortable' | 'compact';
    };
    employees: CMngtEmployeeFeatures;
    permissionManagement: CMngtPermissionManagementFeatures;
    activityLog: CMngtActivityLogFeatures;
    pricing: CMngtPricingFeatures;
    products: CMngtProductFeatures;
    customers: CMngtCustomerFeatures;
    vendors: CMngtVendorFeatures;
    materials: CMngtMaterialFeatures;
    materialInventory: CMngtMaterialInventoryFeatures;
    warehouseReceipts: CMngtWarehouseDocFeatures;
    warehouseDeliveryNotes: CMngtWarehouseDocFeatures;
    salesOrders: CMngtSalesOrderFeatures;

    quotations?: CMngtQuotationFeatures;
    deliveryRequests: CMngtDeliveryRequestFeatures;
    goodsReceipts: CMngtGoodsReceiptFeatures;
    transportOrders: CMngtTransportOrderFeatures;
    locations: CMngtLocationFeatures;
    productInventory: CMngtModuleFeatures;
    lookups: CMngtLookupFeatures;

    lookupV2: CMngtLookupFeatures;

    trucks: CMngtModuleFeatures;

    oilTanks: CMngtModuleFeatures;

    farm: CMngtModuleFeatures;
  };
  layout: CMngtLayoutConfig;
  displaySettings: CMngtDisplaySettings;

  companyInfo?: CMngtCompanyInfo;
  translations: Record<string, Record<string, unknown>>;
  permissions?: PartialPermissions;
};
