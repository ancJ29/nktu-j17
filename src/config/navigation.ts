import { ROUTES } from '@/constants/routes';
import { IconName } from '@credo/base-ui/components';
import type { NavigationItem } from '@/types';
import { getModulePermissions } from '@/utils/permissionReader';
import { sharedUserStorage, SharedStorageKey } from '@/utils/storage';
import { isAdmin } from './env';

export type NavId =
  | 'home'
  | 'report'
  | 'employees'
  | 'employee-org'
  | 'delivery'
  | 'sales-orders'
  | 'quotations'
  | 'goods-receipts'
  | 'transport-orders'
  | 'transport-routes'
  | 'cost-norms'
  | 'product-catalog'
  | 'materials-catalog'
  | 'warehouse'
  | 'warehouse-locations'
  | 'warehouse-product-inventory'
  | 'warehouse-material-inventory'
  | 'warehouse-receipts'
  | 'warehouse-delivery-notes'
  | 'partners'
  | 'configuration'
  | 'configuration-products'
  | 'configuration-materials'
  | 'configuration-customers'
  | 'configuration-vendors'
  | 'configuration-app-config'
  | 'configuration-debug'
  | 'lookups'
  | 'lookups-v2'
  | 'truck-assets'
  | 'oil-tanks'
  | 'farm'
  | 'greenhouses'
  | 'crops'
  | 'crop-diary-templates';

type NavRegistryEntry = {
  path?: string;
  labelKey: string;
  label: string;
  defaultIcon: IconName;

  adminOnly?: true;

  rootOnly?: true;

  mobileNavbar?: true;

  rootOnlyWhen?: (flags: FeatureFlags) => boolean;
};

export const NAV_REGISTRY: Record<NavId, NavRegistryEntry> = {
  home: {
    path: ROUTES.APP.MAIN,
    labelKey: 'common.labels.home',
    label: 'Home',
    defaultIcon: IconName.Home,
    mobileNavbar: true,
  },

  report: {
    path: ROUTES.REPORTS,
    labelKey: 'nav.report',
    label: 'Reports',
    defaultIcon: IconName.ReportAnalytics,
  },
  employees: {
    path: ROUTES.EMPLOYEES.LIST,
    labelKey: '__new__.07-entities.employees.title',
    label: 'Employees',
    defaultIcon: IconName.Users,
  },

  'employee-org': {
    path: ROUTES.EMPLOYEES.ORG_SETTINGS,
    labelKey: 'nav.employeeOrg',
    label: 'Organization',
    defaultIcon: IconName.Affiliate,

    rootOnlyWhen: (f) => f.permissionManagement?.rootUserOnly ?? true,
  },
  delivery: {
    path: ROUTES.DELIVERY.LIST,
    labelKey: 'delivery.title',
    label: 'Delivery',
    defaultIcon: IconName.TruckDelivery,
    mobileNavbar: true,
  },
  'sales-orders': {
    path: ROUTES.SALES_ORDERS.LIST,
    labelKey: 'salesOrders.title',
    label: 'Sales Orders',
    defaultIcon: IconName.FileText,
    mobileNavbar: true,
  },

  quotations: {
    path: ROUTES.QUOTATIONS.LIST,
    labelKey: 'quotations.title',
    label: 'Quotations',
    defaultIcon: IconName.FileText,
  },
  'goods-receipts': {
    path: ROUTES.GOODS_RECEIPTS.LIST,
    labelKey: 'goodsReceipts.title',
    label: 'Goods Receipts',
    defaultIcon: IconName.PackageImport,
    mobileNavbar: true,
  },
  'transport-orders': {
    path: ROUTES.TRANSPORT_ORDERS.LIST,
    labelKey: 'transportOrders.title',
    label: 'Transport Orders',
    defaultIcon: IconName.Truck,
    mobileNavbar: true,
  },

  'transport-routes': {
    path: ROUTES.TRANSPORT_ROUTES.LIST,
    labelKey: 'transportRoutes.title',
    label: 'Transport Routes',
    defaultIcon: IconName.Route,
  },

  'cost-norms': {
    path: ROUTES.COST_NORMS.LIST,
    labelKey: 'costNorms.title',
    label: 'Cost Norms',
    defaultIcon: IconName.GasStation,
  },
  configuration: {
    labelKey: 'configuration.title',
    label: 'Configuration',
    defaultIcon: IconName.Settings,
  },
  'configuration-products': {
    path: ROUTES.PRODUCTS.LIST,
    labelKey: 'common.labels.product',
    label: 'Products',
    defaultIcon: IconName.Package,
  },
  'configuration-materials': {
    path: ROUTES.MATERIALS.LIST,
    labelKey: 'configuration.materials',
    label: 'Materials',
    defaultIcon: IconName.Box,
  },
  'configuration-customers': {
    path: ROUTES.CUSTOMERS.LIST,
    labelKey: 'common.labels.customer',
    label: 'Customers',
    defaultIcon: IconName.ShoppingCart,
  },
  'configuration-vendors': {
    path: ROUTES.VENDORS.LIST,
    labelKey: 'common.labels.vendor',
    label: 'Vendors',
    defaultIcon: IconName.Truck,
  },

  'product-catalog': {
    labelKey: 'nav.productCatalog',
    label: 'Product Catalog',
    defaultIcon: IconName.Category,
  },
  'materials-catalog': {
    labelKey: 'nav.materialsCatalog',
    label: 'Materials Catalog',
    defaultIcon: IconName.Box,
  },
  warehouse: {
    labelKey: 'nav.warehouse',
    label: 'Warehouse',
    defaultIcon: IconName.BuildingWarehouse,
  },
  'warehouse-locations': {
    path: ROUTES.LOCATIONS.LIST,
    labelKey: 'locations.title',
    label: 'Locations',
    defaultIcon: IconName.BuildingWarehouse,
  },
  'warehouse-product-inventory': {
    path: ROUTES.INVENTORY.PRODUCTS,
    labelKey: 'common.labels.productInventory',
    label: 'Product Inventory',
    defaultIcon: IconName.Package,
  },
  'warehouse-material-inventory': {
    path: ROUTES.INVENTORY.MATERIALS,
    labelKey: 'materialInventory.title',
    label: 'Material Inventory',
    defaultIcon: IconName.Box,
  },
  'warehouse-receipts': {
    path: ROUTES.WAREHOUSE_RECEIPTS.LIST,
    labelKey: 'warehouseReceipt.title',
    label: 'Warehouse Receipts',
    defaultIcon: IconName.Package,
  },
  'warehouse-delivery-notes': {
    path: ROUTES.WAREHOUSE_DELIVERY_NOTES.LIST,
    labelKey: 'warehouseDeliveryNote.title',
    label: 'Delivery Notes',
    defaultIcon: IconName.Package,
  },
  partners: {
    labelKey: 'nav.partners',
    label: 'Partners',
    defaultIcon: IconName.Users,
  },
  'configuration-app-config': {
    path: ROUTES.CONFIGURATION.APP_CONFIG,
    labelKey: 'configuration.appConfig',
    label: 'App Config',
    defaultIcon: IconName.Database,
    adminOnly: true,
  },
  'configuration-debug': {
    path: ROUTES.CONFIGURATION.DEBUG,
    labelKey: 'configuration.debug',
    label: 'Debug',
    defaultIcon: IconName.Activity,
    adminOnly: true,
  },

  lookups: {
    path: ROUTES.LOOKUPS.LIST,
    labelKey: 'nav.lookups',
    label: 'Meta-data',
    defaultIcon: IconName.Category2,
  },

  'lookups-v2': {
    path: ROUTES.LOOKUPS_V2.LIST,
    labelKey: 'nav.lookupsV2',
    label: 'Meta-data',
    defaultIcon: IconName.Category2,
    rootOnly: true,
  },

  'truck-assets': {
    path: ROUTES.ASSETS.TRUCKS.LIST,
    labelKey: 'assets.truck.title',
    label: 'Trucks',
    defaultIcon: IconName.Truck,
  },

  'oil-tanks': {
    path: ROUTES.OIL_TANKS.LIST,
    labelKey: 'oilTanks.title',
    label: 'Oil tanks',
    defaultIcon: IconName.BucketDroplet,
  },

  farm: {
    labelKey: 'nav.farm',
    label: 'Farm',
    defaultIcon: IconName.Sun,
  },
  greenhouses: {
    path: ROUTES.GREENHOUSES.LIST,
    labelKey: 'greenhouses.title',
    label: 'Greenhouses',
    defaultIcon: IconName.BuildingWarehouse,
  },
  crops: {
    path: ROUTES.CROPS.LIST,
    labelKey: 'crops.title',
    label: 'Crops',
    defaultIcon: IconName.Category,
  },
  'crop-diary-templates': {
    path: ROUTES.CROP_DIARY_TEMPLATES.LIST,
    labelKey: 'cropDiaryTemplates.title',
    label: 'Diary Templates',
    defaultIcon: IconName.ClipboardList,
  },
};

export const ALL_NAV_IDS = Object.keys(NAV_REGISTRY) as NavId[];

type NavStructureItem =
  | NavId
  | { id: NavId; subs: NavId[] }
  | { id: string; customLabel: string; customIcon: IconName; subs: NavId[] };

const DEFAULT_PC_STRUCTURE: NavStructureItem[] = [
  'home',
  'sales-orders',
  'quotations',
  'transport-orders',
  'transport-routes',
  'cost-norms',
  'delivery',
  'goods-receipts',
  'employees',
  'employee-org',
  {
    id: 'product-catalog',
    subs: ['configuration-products'],
  },
  {
    id: 'materials-catalog',
    subs: ['configuration-materials'],
  },
  {
    id: 'warehouse',
    subs: [
      'warehouse-locations',
      'warehouse-product-inventory',
      'warehouse-material-inventory',
      'warehouse-receipts',
      'warehouse-delivery-notes',
    ],
  },
  'truck-assets',
  'oil-tanks',
  {
    id: 'farm',
    subs: ['greenhouses', 'crops', 'crop-diary-templates'],
  },
  {
    id: 'partners',
    subs: ['configuration-customers', 'configuration-vendors'],
  },
  {
    id: 'configuration',
    subs: ['configuration-app-config', 'configuration-debug'],
  },
  'report',
];

const DEFAULT_MOBILE_STRUCTURE: NavStructureItem[] = [
  'home',
  'sales-orders',
  'quotations',
  'transport-orders',
  'transport-routes',
  'cost-norms',
  'delivery',
  'goods-receipts',
  'employees',

  {
    id: 'warehouse',
    subs: [
      'warehouse-locations',
      'warehouse-product-inventory',
      'warehouse-material-inventory',
      'warehouse-receipts',
      'warehouse-delivery-notes',
    ],
  },
  'truck-assets',
  'oil-tanks',
  {
    id: 'farm',
    subs: ['greenhouses', 'crops', 'crop-diary-templates'],
  },
  {
    id: 'partners',
    subs: ['configuration-customers', 'configuration-vendors'],
  },
  'report',
];

type FeatureFlags = {
  employees?: { enabled?: boolean; selfManage?: boolean };
  permissionManagement?: { enabled?: boolean; rootUserOnly?: boolean };
  products?: { enabled?: boolean };
  materials?: { enabled?: boolean };
  customers?: { enabled?: boolean };
  vendors?: { enabled?: boolean };
  salesOrders?: { enabled?: boolean };
  deliveryRequests?: { enabled?: boolean };
  goodsReceipts?: { enabled?: boolean };
  warehouseReceipts?: { enabled?: boolean };
  warehouseDeliveryNotes?: { enabled?: boolean };
  transportOrders?: { enabled?: boolean };
  locations?: { enabled?: boolean };
  productInventory?: { enabled?: boolean };
  materialInventory?: { enabled?: boolean };
  lookups?: { enabled?: boolean };
  lookupV2?: { enabled?: boolean };
  trucks?: { enabled?: boolean };
  oilTanks?: { enabled?: boolean };
  farm?: { enabled?: boolean };
};

const NAV_FEATURE_GATES: Partial<Record<NavId, (flags: FeatureFlags) => boolean>> = {
  employees: (f) => f.employees?.enabled ?? true,
  'employee-org': (f) =>
    (f.employees?.enabled ?? true) &&
    (f.employees?.selfManage ?? false) &&
    (f.permissionManagement?.enabled ?? false),
  'configuration-products': (f) => f.products?.enabled ?? false,
  'configuration-materials': (f) => f.materials?.enabled ?? false,
  'configuration-customers': (f) => f.customers?.enabled ?? false,
  'configuration-vendors': (f) => f.vendors?.enabled ?? false,
  'sales-orders': (f) => f.salesOrders?.enabled ?? false,
  delivery: (f) => f.deliveryRequests?.enabled ?? false,
  'goods-receipts': (f) => f.goodsReceipts?.enabled ?? false,
  'transport-orders': (f) => f.transportOrders?.enabled ?? false,

  'transport-routes': (f) => f.transportOrders?.enabled ?? false,

  'cost-norms': (f) => f.transportOrders?.enabled ?? false,
  'warehouse-locations': (f) => f.locations?.enabled ?? false,
  'warehouse-product-inventory': (f) => f.productInventory?.enabled ?? false,
  'warehouse-material-inventory': (f) => f.materialInventory?.enabled ?? false,
  'warehouse-receipts': (f) => f.warehouseReceipts?.enabled ?? false,
  'warehouse-delivery-notes': (f) => f.warehouseDeliveryNotes?.enabled ?? false,
  lookups: (f) => f.lookups?.enabled ?? false,
  'lookups-v2': (f) => f.lookupV2?.enabled ?? false,
  'truck-assets': (f) => f.trucks?.enabled ?? false,
  'oil-tanks': (f) => f.oilTanks?.enabled ?? false,
  greenhouses: (f) => f.farm?.enabled ?? false,
  crops: (f) => f.farm?.enabled ?? false,
  'crop-diary-templates': (f) => f.farm?.enabled ?? false,
};

const NAV_PERMISSION_GATES: Partial<Record<NavId, () => boolean>> = {
  employees: () => getModulePermissions('employee').canView ?? false,

  'employee-org': () => getModulePermissions('permissionManagement').canView ?? false,
  'sales-orders': () => getModulePermissions('salesOrder').canView ?? false,

  quotations: () => getModulePermissions('salesOrder').canView ?? false,
  delivery: () => getModulePermissions('deliveryRequest').canView ?? false,
  'goods-receipts': () => getModulePermissions('goodsReceipt').canView ?? false,
  'transport-orders': () => getModulePermissions('transportOrder').canView ?? false,
  'transport-routes': () => getModulePermissions('transportRoute').canView ?? false,
  'cost-norms': () => getModulePermissions('costNorm').canView ?? false,
  'configuration-products': () => getModulePermissions('product').canView ?? false,
  'configuration-materials': () => getModulePermissions('material').canView ?? false,
  'configuration-customers': () => getModulePermissions('customer').canView ?? false,
  'configuration-vendors': () => getModulePermissions('vendor').canView ?? false,
  'warehouse-locations': () => getModulePermissions('location').canView ?? false,
  'warehouse-product-inventory': () => getModulePermissions('productInventory').canView ?? false,
  'warehouse-material-inventory': () => getModulePermissions('materialInventory').canView ?? false,
  'warehouse-receipts': () => getModulePermissions('warehouseReceipt').canView ?? false,
  'warehouse-delivery-notes': () => getModulePermissions('warehouseDeliveryNote').canView ?? false,
  'lookups-v2': () => getModulePermissions('lookupV2').canView ?? false,
  'truck-assets': () => getModulePermissions('truck').canView ?? false,
  'oil-tanks': () => getModulePermissions('oilTank').canView ?? false,
  greenhouses: () => getModulePermissions('greenhouse').canView ?? false,
  crops: () => getModulePermissions('crop').canView ?? false,
  'crop-diary-templates': () => getModulePermissions('cropDiaryTemplate').canView ?? false,

  report: () =>
    (getModulePermissions('report').canView ?? false) ||
    sharedUserStorage.get<string>(SharedStorageKey.DEPARTMENT) === 'manager',
};

function resolveItem(id: NavId, iconOverride?: IconName, navbarOverride?: boolean): NavigationItem {
  const entry = NAV_REGISTRY[id];

  const navbar = navbarOverride ?? entry.mobileNavbar ?? false;
  return {
    id,
    ...(entry.path ? { path: entry.path } : {}),
    labelKey: entry.labelKey,
    label: entry.label,
    icon: iconOverride ?? entry.defaultIcon,
    ...(navbar ? { navbar: true } : {}),

    ...(entry.rootOnly ? { rootOnly: true } : {}),
  };
}

function deriveStructureFromConfig(configItems: NavigationItem[]): {
  structure: NavStructureItem[];
  iconOverrides: Map<string, IconName>;
  navbarOverrides: Map<string, boolean>;
} {
  const iconOverrides = new Map<string, IconName>();

  const navbarOverrides = new Map<string, boolean>();
  const structure: NavStructureItem[] = [];

  for (const item of configItems) {
    if (item.hidden) continue;
    const inRegistry = item.id in NAV_REGISTRY;
    const isCustomGroup = !inRegistry && !!item.subs && item.subs.length >= 0;

    if (!inRegistry && !isCustomGroup) continue;

    navbarOverrides.set(item.id, !!item.navbar);

    if (inRegistry && item.icon && item.icon !== NAV_REGISTRY[item.id as NavId].defaultIcon) {
      iconOverrides.set(item.id, item.icon as IconName);
    }

    const subs: NavId[] = [];
    if (item.subs && item.subs.length > 0) {
      for (const sub of item.subs) {
        const subId = sub.id as NavId;
        if (!(subId in NAV_REGISTRY)) continue;
        if (sub.hidden) continue;
        subs.push(subId);
        if (sub.icon && sub.icon !== NAV_REGISTRY[subId].defaultIcon) {
          iconOverrides.set(subId, sub.icon as IconName);
        }
      }
    }

    if (isCustomGroup) {
      if (subs.length === 0) continue;
      structure.push({
        id: item.id,
        customLabel: item.label,
        customIcon: (item.icon as IconName) ?? IconName.Category2,
        subs,
      });
      continue;
    }

    const id = item.id as NavId;
    if (subs.length > 0) {
      structure.push({ id, subs });
    } else {
      structure.push(id);
    }
  }

  return { structure, iconOverrides, navbarOverrides };
}

type BuildNavigationOptions = {
  configNav?: { pc: NavigationItem[]; mobile: NavigationItem[] } | null;

  features: FeatureFlags;

  isAdmin?: boolean;

  checkPermissions?: boolean;

  showRestrictedItems?: boolean;
};

export function stripHiddenNavItems<T extends { hidden?: boolean; subs?: T[] }>(items: T[]): T[] {
  return items
    .filter((item) => !item.hidden)
    .map((item) => {
      if (!item.subs || item.subs.length === 0) return item;
      const subs = item.subs.filter((s) => !s.hidden);

      return { ...item, subs };
    });
}

export function stripRootOnlyNavItems<T extends { rootOnly?: boolean; subs?: T[] }>(
  items: T[],
  isRoot: boolean,
): T[] {
  if (isRoot) return items;
  const result: T[] = [];
  for (const item of items) {
    if (item.rootOnly) continue;
    if (item.subs && item.subs.length > 0) {
      const subs = stripRootOnlyNavItems(item.subs, isRoot);

      if (subs.length === 0) continue;
      result.push({ ...item, subs });
    } else {
      result.push(item);
    }
  }
  return result;
}

export function buildNavigation(options: BuildNavigationOptions) {
  const {
    configNav,
    features,
    isAdmin,
    checkPermissions = true,
    showRestrictedItems = false,
  } = options;

  function resolve(id: NavId, iconOverride?: IconName, navbarOverride?: boolean): NavigationItem {
    const item = resolveItem(id, iconOverride, navbarOverride);
    return NAV_REGISTRY[id]?.rootOnlyWhen?.(features) ? { ...item, rootOnly: true } : item;
  }

  function isVisible(id: NavId): boolean {
    if (NAV_REGISTRY[id]?.adminOnly && !isAdmin) return false;
    return true;
  }

  function isFeatureEnabled(id: NavId): boolean {
    const gate = NAV_FEATURE_GATES[id];
    return gate ? gate(features) : true;
  }

  function isPermitted(id: NavId): boolean {
    if (!checkPermissions) return true;
    if (showRestrictedItems) return true;
    const gate = NAV_PERMISSION_GATES[id];
    return gate ? gate() : true;
  }

  function buildItems(
    structure: NavStructureItem[],
    iconOverrides: Map<string, IconName>,
    checkFeatureFlags: boolean,
    navbarOverrides?: Map<string, boolean>,
  ): NavigationItem[] {
    const items: NavigationItem[] = [];

    for (const entry of structure) {
      if (typeof entry === 'string') {
        if (!isVisible(entry)) continue;
        if (checkFeatureFlags && !isFeatureEnabled(entry)) continue;
        if (!isPermitted(entry)) continue;
        items.push(resolve(entry, iconOverrides.get(entry), navbarOverrides?.get(entry)));
        continue;
      }

      if ('customLabel' in entry) {
        const subs = entry.subs
          .filter(
            (subId) =>
              isVisible(subId) &&
              (!checkFeatureFlags || isFeatureEnabled(subId)) &&
              isPermitted(subId),
          )
          .map((subId) => resolve(subId, iconOverrides.get(subId)));
        if (subs.length === 0) continue;
        items.push({
          id: entry.id,
          label: entry.customLabel,
          icon: iconOverrides.get(entry.id) ?? entry.customIcon,
          ...(navbarOverrides?.get(entry.id) ? { navbar: true } : {}),
          subs,
        });
        continue;
      }

      if (!isVisible(entry.id)) continue;
      if (checkFeatureFlags && !isFeatureEnabled(entry.id)) continue;
      if (!isPermitted(entry.id)) continue;
      const subs = entry.subs
        .filter(
          (subId) =>
            isVisible(subId) &&
            (!checkFeatureFlags || isFeatureEnabled(subId)) &&
            isPermitted(subId),
        )
        .map((subId) => resolve(subId, iconOverrides.get(subId)));
      if (subs.length === 0) continue;
      const group = resolve(entry.id, iconOverrides.get(entry.id), navbarOverrides?.get(entry.id));
      items.push({ ...group, subs });
    }

    return items;
  }

  const hasPcConfig = configNav && configNav.pc.length > 0;
  const hasMobileConfig = configNav && configNav.mobile.length > 0;

  const pcDerived = hasPcConfig
    ? deriveStructureFromConfig(configNav.pc)
    : {
        structure: DEFAULT_PC_STRUCTURE,
        iconOverrides: new Map<string, IconName>(),
        navbarOverrides: undefined,
      };

  const mobileDerived = hasMobileConfig
    ? deriveStructureFromConfig(configNav.mobile)
    : {
        structure: DEFAULT_MOBILE_STRUCTURE,
        iconOverrides: new Map<string, IconName>(),
        navbarOverrides: undefined,
      };

  const mergedOverrides = new Map<string, IconName>([
    ...mobileDerived.iconOverrides,
    ...pcDerived.iconOverrides,
  ]);

  const pc = buildItems(pcDerived.structure, mergedOverrides, !hasPcConfig);
  const mobile = buildItems(
    mobileDerived.structure,
    mergedOverrides,
    !hasMobileConfig,
    mobileDerived.navbarOverrides,
  );

  if (isAdmin) {
    const appendAdminItems = (
      items: NavigationItem[],
      defaultStructure: NavStructureItem[],
    ): NavigationItem[] => {
      const seenIds = new Set(items.map((item) => item.id));
      for (const entry of defaultStructure) {
        if (typeof entry === 'string' || 'customLabel' in entry) continue;
        if (seenIds.has(entry.id)) continue;
        const adminSubs = entry.subs.filter(
          (subId) => NAV_REGISTRY[subId]?.adminOnly && !seenIds.has(subId),
        );
        if (adminSubs.length > 0) {
          const group = resolve(entry.id);
          const subs = adminSubs.map((subId) => resolve(subId));
          items.push({ ...group, subs });
        }
      }
      return items;
    };
    appendAdminItems(pc, DEFAULT_PC_STRUCTURE);
    appendAdminItems(mobile, DEFAULT_MOBILE_STRUCTURE);
  }

  return { pc, mobile };
}

export const defaultNavigation = buildNavigation({
  isAdmin,
  checkPermissions: false,
  features: {
    employees: { enabled: true },
    products: { enabled: true },
    materials: { enabled: true },
    customers: { enabled: true },
    vendors: { enabled: true },
    salesOrders: { enabled: true },
    deliveryRequests: { enabled: true },
    goodsReceipts: { enabled: true },
    transportOrders: { enabled: true },
    locations: { enabled: true },
    productInventory: { enabled: true },
    materialInventory: { enabled: true },
    trucks: { enabled: true },
    lookups: { enabled: true },
    lookupV2: { enabled: true },
    farm: { enabled: true },
  },
});
