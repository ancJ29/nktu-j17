import { getEnvVar } from '@credo/base-ui/utils';
import type { CMngtAppConfig as AppConfig } from '@credo/kits/types';
import { CredoAppConfigSchema, type CredoAppConfig } from '@credo/base-ui/types';
import { IconName } from '@credo/base-ui/components';
import { z } from 'zod';
import { defaultNavigation } from './navigation';

const CMngtNavigationItemSchema = z.object({
  id: z.string().min(1),
  path: z.string().optional(),
  labelKey: z.string().min(1).optional(),
  label: z.string().min(1),
  icon: z.enum(IconName),
  hidden: z.boolean().optional(),
  navbar: z.boolean().optional(),
  get subs() {
    return z.array(CMngtNavigationItemSchema).optional();
  },
});

const CMngtNavigationConfigSchema = z.object({
  pc: z.array(CMngtNavigationItemSchema),
  mobile: z.array(CMngtNavigationItemSchema),
});

const TranslatableSchema = z.record(z.string(), z.string());

export type Translatable = z.infer<typeof TranslatableSchema>;

const OptionSchema = z.object({
  value: z.string(),
  
  label: TranslatableSchema,
});

export type ConfigOption = z.infer<typeof OptionSchema>;

const PartialModulePermissionsSchema = z.object({
  canView: z.boolean().optional(),
  canCreate: z.boolean().optional(),
  canEdit: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  actions: z.record(z.string(), z.boolean()).optional(),
  query: z.record(z.string(), z.boolean()).optional(),
});

const PartialPermissionsSchema = z.record(z.string(), PartialModulePermissionsSchema).optional();

const DepartmentOptionSchema = OptionSchema.extend({
  permissions: PartialPermissionsSchema,
});

export type DepartmentOption = z.infer<typeof DepartmentOptionSchema>;

const EmployeesFeaturesSchema = z
  .object({
    enabled: z.boolean().default(true),
    
    
    
    selfManage: z.boolean().default(false),
    email: z.boolean().default(false),
    position: z.boolean().default(false),
    department: z.boolean().default(false),
    allowLogin: z.boolean().default(false),
    bulkImport: z.boolean().default(false),
    avatar: z.boolean().default(false),
    startDate: z.boolean().default(false),
    address: z.boolean().default(false),
    dateOfBirth: z.boolean().default(false),
    driverProfile: z.boolean().default(false),
    driverDepartments: z.array(z.string()).default([]),
    codePrefix: z.string().default('EMP-'),
    codePadLength: z.number().int().min(0).max(12).default(4),
    departmentOptions: z.array(DepartmentOptionSchema).default([]),
    positionOptions: z.array(OptionSchema).default([]),
  })
  .default({
    enabled: true,
    selfManage: false,
    email: false,
    position: false,
    department: false,
    allowLogin: false,
    bulkImport: false,
    avatar: false,
    startDate: false,
    address: false,
    dateOfBirth: false,
    driverProfile: false,
    driverDepartments: [],
    codePrefix: 'EMP-',
    codePadLength: 4,
    positionOptions: [],
    departmentOptions: [],
  });

const PermissionManagementFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
    rootUserOnly: z.boolean().default(true),
    showRestrictedItems: z.boolean().default(false),
  })
  .default({
    enabled: false,
    rootUserOnly: true,
    showRestrictedItems: false,
  });

const ActivityLogFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
  })
  .default({ enabled: false });

const PricingFeaturesSchema = z
  .object({
    enabled: z.boolean().default(true),
    
    vatRate: z.number().min(0).default(0.08),
  })
  .default({ enabled: true, vatRate: 0.08 });

const ModuleFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
  })
  .default({ enabled: false });

const MaterialInventoryFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
  })
  .default({ enabled: false });

const VendorFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
    codePrefix: z.string().default('VND-'),
    codePadLength: z.number().int().min(0).max(12).default(4),
  })
  .default({
    enabled: false,
    codePrefix: 'VND-',
    codePadLength: 4,
  });

const LookupFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
    enabledCategories: z.array(z.string()).default([]),
  })
  .default({ enabled: false, enabledCategories: [] });

const ProductFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
    codePrefix: z.string().default('PRD-'),
    codePadLength: z.number().int().min(0).max(12).default(4),
    priceManagement: z.boolean().default(false),
    bulkImport: z.boolean().default(false),
    
    
    
    
    technicalSpecs: z.boolean().default(true),
    barcode: z.boolean().default(true),
    images: z.boolean().default(true),
  })
  .default({
    enabled: false,
    codePrefix: 'PRD-',
    codePadLength: 4,
    priceManagement: false,
    bulkImport: false,
    technicalSpecs: true,
    barcode: true,
    images: true,
  });

const MaterialFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
    
    
    
    multiUnit: z.boolean().default(false),
    
    
    unitCategory: z.enum(['unit', 'material-unit']).default('material-unit'),
    
    description: z.boolean().default(false),
    specification: z.boolean().default(false),
    memo: z.boolean().default(false),
    pricing: z.boolean().default(false),
    tags: z.boolean().default(false),
    attributes: z.boolean().default(false),
    images: z.boolean().default(false),
    
    
    minimumStock: z.boolean().default(false),
  })
  .default({
    enabled: false,
    multiUnit: false,
    unitCategory: 'material-unit',
    description: false,
    specification: false,
    memo: false,
    pricing: false,
    tags: false,
    attributes: false,
    images: false,
    minimumStock: false,
  });

const LocationFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
    codePrefix: z.string().default('LOC-'),
    codePadLength: z.number().int().min(0).max(12).default(4),
  })
  .default({
    enabled: false,
    codePrefix: 'LOC-',
    codePadLength: 4,
  });

const CustomerFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
    codePrefix: z.string().default('CST-'),
    codePadLength: z.number().int().min(0).max(12).default(4),
    
    
    
    shippingAddress: z.boolean().default(true),
    customerTypeOptions: z.array(OptionSchema).default([]),
  })
  .default({
    enabled: false,
    codePrefix: 'CST-',
    codePadLength: 4,
    shippingAddress: true,
    customerTypeOptions: [],
  });

export type CustomerTypeOption = z.infer<typeof OptionSchema>;

const StatusCapabilityBindingSchema = z.object({
  id: z.string(),
  config: z.unknown().optional(),
});

const SalesOrderStageSchema = z.enum(['DRAFT', 'NEW', 'IN_PROGRESS', 'COMPLETED', 'EXCEPTIONAL']);
const DeliveryRequestStageSchema = z.enum(['NEW', 'IN_PROGRESS', 'COMPLETED', 'EXCEPTIONAL']);

const SalesOrderStatusOptionSchema = OptionSchema.extend({
  color: z.string(),
  actionLabel: TranslatableSchema.optional(),
  icon: z.string().optional(),
  stage: SalesOrderStageSchema,
  capabilities: z.array(StatusCapabilityBindingSchema).default([]),
  
  allowedDepartments: z.array(z.string()).default([]),
});

const DeliveryRequestStatusOptionSchema = OptionSchema.extend({
  color: z.string(),
  actionLabel: TranslatableSchema.optional(),
  icon: z.string().optional(),
  stage: DeliveryRequestStageSchema,
  capabilities: z.array(StatusCapabilityBindingSchema).default([]),
});

const TagOptionSchema = OptionSchema.extend({
  color: z.string(),
});

export type SalesOrderStatusOption = z.infer<typeof SalesOrderStatusOptionSchema>;
export type DeliveryRequestStatusOption = z.infer<typeof DeliveryRequestStatusOptionSchema>;
export type TagOption = z.infer<typeof TagOptionSchema>;
export type TransportOrderStatusOptionConfig = z.infer<typeof TransportOrderStatusOptionSchema>;

const SalesOrderFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
    codePrefix: z.string().default('SO-'),
    codePadLength: z.number().int().min(0).max(12).default(4),
    statusOptions: z.array(SalesOrderStatusOptionSchema).default([]),
    
    statusTransitions: z.record(z.string(), z.array(z.string())).default({}),
    deliveryMethodOptions: z.array(OptionSchema).default([]),
    tagOptions: z.array(TagOptionSchema).default([]),
    
    deliveryPackageSizeOptions: z.array(z.string()).default([]),
    
    picDepartments: z.array(z.string()).default([]),
    
    allowInternalDelivery: z.boolean().default(true),
    
    allowAdditionalDR: z.boolean().default(true),
    
    allowSkipInitialStage: z.boolean().default(false),
    
    shortagePolicy: z.enum(['block', 'allow']).default('allow'),
    
    allowExtraDeliveryQuantity: z.boolean().default(false),
  })
  .default({
    enabled: false,
    codePrefix: 'SO-',
    codePadLength: 4,
    statusOptions: [],
    statusTransitions: {},
    deliveryMethodOptions: [],
    tagOptions: [],
    deliveryPackageSizeOptions: [],
    picDepartments: [],
    allowInternalDelivery: true,
    allowAdditionalDR: true,
    allowSkipInitialStage: false,
    shortagePolicy: 'allow',
    allowExtraDeliveryQuantity: false,
  });

const DeliveryRequestFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
    codePrefix: z.string().default('DR-'),
    codePadLength: z.number().int().min(0).max(12).default(4),
    statusOptions: z.array(DeliveryRequestStatusOptionSchema).default([]),
    
    statusTransitions: z.record(z.string(), z.array(z.string())).default({}),
    
    driverDepartments: z.array(z.string()).default([]),
    
    returnShipment: z
      .object({
        enabled: z.boolean().default(false),
        autoRestockOnComplete: z.boolean().default(false),
      })
      .default({ enabled: false, autoRestockOnComplete: false }),
  })
  .default({
    enabled: false,
    codePrefix: 'DR-',
    codePadLength: 4,
    statusOptions: [],
    statusTransitions: {},
    driverDepartments: [],
    returnShipment: { enabled: false, autoRestockOnComplete: false },
  });

const GoodsReceiptFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
    codePrefix: z.string().default('PNK-'),
    codePadLength: z.number().int().min(0).max(12).default(4),
    
    picDepartments: z.array(z.string()).default([]),
    
    allowNoInventoryProducts: z.boolean().default(false),
  })
  .default({
    enabled: false,
    codePrefix: 'PNK-',
    codePadLength: 4,
    picDepartments: [],
    allowNoInventoryProducts: false,
  });

export type GoodsReceiptFeatures = z.infer<typeof GoodsReceiptFeaturesSchema>;

const warehouseDocFeatures = (codePrefix: string) =>
  z
    .object({
      enabled: z.boolean().default(false),
      codePrefix: z.string().default(codePrefix),
      codePadLength: z.number().int().min(0).max(12).default(3),
      postInventory: z.boolean().default(false),
    })
    .default({ enabled: false, codePrefix, codePadLength: 3, postInventory: false });

const WarehouseReceiptFeaturesSchema = warehouseDocFeatures('WR-');
const WarehouseDeliveryNoteFeaturesSchema = warehouseDocFeatures('DN-');

const TransportOrderStatusOptionSchema = OptionSchema.extend({
  color: z.string().default('gray'),
  actionLabel: TranslatableSchema.optional(),
  icon: z.string().optional(),
  isInitial: z.boolean().optional(),
  terminal: z.boolean().optional(),
  locked: z.boolean().optional(),
  
  allowedDepartments: z.array(z.string()).default([]),
});

const TransportOrderFeaturesSchema = z
  .object({
    enabled: z.boolean().default(false),
    codePrefix: z.string().default('VC-'),
    codePadLength: z.number().int().min(0).max(12).default(3),
    
    statusOptions: z.array(TransportOrderStatusOptionSchema).default([]),
    
    statusTransitions: z.record(z.string(), z.array(z.string())).default({}),
    
    driverDepartments: z.array(z.string()).default([]),
  })
  .default({
    enabled: false,
    codePrefix: 'VC-',
    codePadLength: 3,
    statusOptions: [],
    statusTransitions: {},
    driverDepartments: [],
  });

const DisplaySettingsSchema = z
  .object({
    dateFormat: z
      .enum(['DD/MM/YYYY', 'YYYY/MM/DD', 'YYYY-MM-DD', 'DD-MM-YYYY'])
      .default('DD/MM/YYYY'),
    dateTimeFormat: z
      .enum([
        'HH:mm DD/MM/YYYY',
        'DD/MM/YYYY HH:mm',
        'HH:mm YYYY/MM/DD',
        'YYYY/MM/DD HH:mm',
        'HH:mm DD-MM-YYYY',
        'DD-MM-YYYY HH:mm',
        'HH:mm YYYY-MM-DD',
        'YYYY-MM-DD HH:mm',
      ])
      .default('HH:mm DD/MM/YYYY'),
  })
  .default({
    dateFormat: 'DD/MM/YYYY',
    dateTimeFormat: 'HH:mm DD/MM/YYYY',
  });

export type DisplaySettings = z.infer<typeof DisplaySettingsSchema>;

const FeaturesSchema = z
  .object({
    common: z.object({
      darkMode: z.boolean().default(false),
      languageSwitcher: z.boolean().default(true),
      
      
      
      enablePdfSharing: z.boolean().default(false),
      
      
      
      enableStats: z.boolean().default(false),
    }),
    employees: EmployeesFeaturesSchema,
    permissionManagement: PermissionManagementFeaturesSchema,
    activityLog: ActivityLogFeaturesSchema,
    pricing: PricingFeaturesSchema,
    products: ProductFeaturesSchema,
    materials: MaterialFeaturesSchema,
    customers: CustomerFeaturesSchema,
    vendors: VendorFeaturesSchema,
    salesOrders: SalesOrderFeaturesSchema,
    deliveryRequests: DeliveryRequestFeaturesSchema,
    goodsReceipts: GoodsReceiptFeaturesSchema,
    warehouseReceipts: WarehouseReceiptFeaturesSchema,
    warehouseDeliveryNotes: WarehouseDeliveryNoteFeaturesSchema,
    transportOrders: TransportOrderFeaturesSchema,
    locations: LocationFeaturesSchema,
    productInventory: ModuleFeaturesSchema,
    materialInventory: MaterialInventoryFeaturesSchema,
    lookups: LookupFeaturesSchema,
    lookupV2: LookupFeaturesSchema,
    
    trucks: ModuleFeaturesSchema,
    
    farm: ModuleFeaturesSchema,
  })
  .default({
    common: {
      darkMode: false,
      languageSwitcher: true,
      enablePdfSharing: false,
      enableStats: false,
    },
    employees: EmployeesFeaturesSchema.parse({}),
    permissionManagement: PermissionManagementFeaturesSchema.parse({}),
    activityLog: ActivityLogFeaturesSchema.parse({}),
    pricing: PricingFeaturesSchema.parse({}),
    products: ProductFeaturesSchema.parse({}),
    materials: MaterialFeaturesSchema.parse({}),
    locations: LocationFeaturesSchema.parse({}),
    productInventory: ModuleFeaturesSchema.parse({}),
    materialInventory: MaterialInventoryFeaturesSchema.parse({}),
    lookups: LookupFeaturesSchema.parse({}),
    lookupV2: LookupFeaturesSchema.parse({}),
    trucks: ModuleFeaturesSchema.parse({}),
    farm: ModuleFeaturesSchema.parse({}),
    customers: CustomerFeaturesSchema.parse({}),
    vendors: VendorFeaturesSchema.parse({}),
    salesOrders: SalesOrderFeaturesSchema.parse({}),
    deliveryRequests: DeliveryRequestFeaturesSchema.parse({}),
    goodsReceipts: GoodsReceiptFeaturesSchema.parse({}),
    warehouseReceipts: WarehouseReceiptFeaturesSchema.parse({}),
    warehouseDeliveryNotes: WarehouseDeliveryNoteFeaturesSchema.parse({}),
    transportOrders: TransportOrderFeaturesSchema.parse({}),
  });

const NavbarSchema = z
  .object({
    width: z.number().default(250),
    displayIconWhenCollapsed: z.boolean().default(false),
    variant: z.enum(['dark', 'light']).default('dark'),
  })
  .optional()
  .default({
    width: 250,
    displayIconWhenCollapsed: false,
    variant: 'dark',
  });

const HeaderSchema = z
  .object({
    variant: z.enum(['dark', 'light']).default('dark'),
  })
  .optional()
  .default({
    variant: 'dark',
  });

const LayoutSchema = z
  .object({
    navbar: NavbarSchema,
    header: HeaderSchema,
  })
  .optional()
  .default({
    navbar: NavbarSchema.parse({}),
    header: HeaderSchema.parse({}),
  });

const TranslationsSchema = z.record(z.string(), z.record(z.string(), z.unknown())).optional();

export const CMngtAppConfigSchema = CredoAppConfigSchema.extend({
  
  features: FeaturesSchema,
  layout: LayoutSchema,
  displaySettings: DisplaySettingsSchema,
  translations: TranslationsSchema,
  
  permissions: PartialPermissionsSchema,
  
  navigation: CMngtNavigationConfigSchema,
});

export const defaultAppConfig = CMngtAppConfigSchema.parse({
  version: '1.0.0',
  schemaVersion: 2,
  app: {
    name: getEnvVar('VITE_APP_NAME'),
    description: getEnvVar('VITE_APP_DESCRIPTION'),
    logoUrl: getEnvVar('VITE_APP_LOGO_URL'),
  },
  auth: {
    register: false,
    forgotPassword: false,
    resetPassword: false,
    loginViaQRCode: true,
  },

  themeConfig: { mainColor: 'terracotta' },

  languages: [
    
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ],

  defaultLanguage: 'vi',

  navigation: defaultNavigation,

  userSettings: {
    
    syncDebounceDelay: 5000,
  },
}) satisfies Omit<AppConfig, 'env' | 'navigation' | 'translations'>;

export type CMngtAppConfig = z.infer<typeof CMngtAppConfigSchema> & CredoAppConfig;
