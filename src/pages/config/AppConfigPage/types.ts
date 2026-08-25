import type { CMngtAppConfig } from '@credo/kits/types';

export type AppInfo = CMngtAppConfig['app'];

export type SectionKey =
  | 'appInfo'
  | 'auth'
  | 'employees'
  | 'permissionManagement'
  | 'activityLog'
  | 'pricing'
  | 'products'
  | 'locations'
  | 'productInventory'
  | 'materialInventory'
  | 'materials'
  | 'warehouseReceipts'
  | 'warehouseDeliveryNotes'
  | 'trucks'
  | 'oilTanks'
  | 'farm'
  | 'customers'
  | 'vendors'
  | 'salesOrders'
  | 'quotations'
  | 'deliveryRequests'
  | 'goodsReceipts'
  | 'transportOrders'
  | 'lookupV2'
  | 'permissions'
  | 'deptPermissions'
  | 'displaySettings'
  | 'companyInfo'
  | 'theme'
  | 'layout'
  | 'languages'
  | 'navigation'
  | 'translations';

export const ALL_SECTIONS: SectionKey[] = [
  'appInfo',
  'auth',
  'employees',
  'permissionManagement',
  'activityLog',
  'pricing',
  'products',
  'locations',
  'productInventory',
  'materialInventory',
  'materials',
  'warehouseReceipts',
  'warehouseDeliveryNotes',
  'trucks',
  'oilTanks',
  'farm',
  'customers',
  'vendors',
  'salesOrders',
  'quotations',
  'deliveryRequests',
  'goodsReceipts',
  'transportOrders',
  'lookupV2',
  'permissions',
  'deptPermissions',
  'displaySettings',
  'companyInfo',
  'theme',
  'layout',
  'languages',
  'navigation',
  'translations',
];

export const ACCESS_KEY_STORAGE = '__c_mngt_admin_key__';
