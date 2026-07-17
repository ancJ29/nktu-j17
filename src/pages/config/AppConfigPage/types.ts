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
  | 'farm'
  | 'customers'
  | 'vendors'
  | 'salesOrders'
  | 'deliveryRequests'
  | 'goodsReceipts'
  | 'transportOrders'
  | 'lookups'
  | 'lookupV2'
  | 'permissions'
  | 'deptPermissions'
  | 'displaySettings'
  | 'theme'
  | 'layout'
  | 'languages'
  | 'navigation'
  | 'userSettings'
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
  'farm',
  'customers',
  'vendors',
  'salesOrders',
  'deliveryRequests',
  'goodsReceipts',
  'transportOrders',
  'lookups',
  'lookupV2',
  'permissions',
  'deptPermissions',
  'displaySettings',
  'theme',
  'layout',
  'languages',
  'navigation',
  'userSettings',
  'translations',
];

export const ACCESS_KEY_STORAGE = '__c_mngt_admin_key__';
