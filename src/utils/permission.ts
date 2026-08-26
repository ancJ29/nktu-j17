import { appConfig } from '@/config';
import type {
  ConfigOption,
  DepartmentOption,
  SalesOrderStatusOption,
  DeliveryRequestStatusOption,
  TransportOrderStatusOptionConfig,
  TagOption,
} from '@/config/schema';
import type { GoodsReceiptStatus } from '@/types';

import { DEFAULT_CUSTOMER_REPORT_TYPE } from '@/utils/customerReports/types';
import {
  BASE_PERMISSIONS,
  type Permissions,
  type PartialPermissions,
  type ModulePermissions,
} from '@/types/permissions';
import { cacheSet } from '@/utils/appCache';
import { getModulePermissions, resolvePermissions } from '@/utils/permissionReader';
import i18n from '@/i18n';

const featureFlags = appConfig?.features;

export function isPermissionManagementEnabled() {
  return featureFlags?.permissionManagement?.enabled ?? false;
}

export function isPermissionManagementRootUserOnly() {
  return featureFlags?.permissionManagement?.rootUserOnly ?? true;
}

export function isActivityLoggingEnabled() {
  return featureFlags?.activityLog?.enabled ?? false;
}

export function isPricingManagementEnabled() {
  return featureFlags?.pricing?.enabled ?? true;
}

export function getPricingVatRate() {
  return featureFlags?.pricing?.vatRate ?? 0.08;
}

export function hasEmailForEmployees() {
  return featureFlags?.employees?.email ?? false;
}

export function hasPositionForEmployees() {
  return featureFlags?.employees?.position ?? false;
}

export function hasDepartmentForEmployees() {
  return featureFlags?.employees?.department ?? false;
}

export function getDepartmentOptions(): ConfigOption[] {
  return featureFlags?.employees?.departmentOptions ?? [];
}

export function isLocationsEnabled() {
  return featureFlags?.locations?.enabled ?? false;
}

export function isProductsEnabled() {
  return featureFlags?.products?.enabled ?? false;
}

export function isPriceManagementEnabled() {
  return featureFlags?.products?.priceManagement ?? false;
}

export function isPdfSharingEnabled() {
  return featureFlags?.common?.enablePdfSharing ?? false;
}

export function isQuotationTierPricingEnabled() {
  return featureFlags?.quotations?.priceByMinQuantity ?? false;
}

export function isStatsEnabled() {
  return featureFlags?.common?.enableStats ?? false;
}

export function isNewVersionNotificationEnabled() {
  return featureFlags?.common?.notifyNewVersion ?? false;
}

export function tableDensity(): 'comfortable' | 'compact' {
  return featureFlags?.common?.tableDensity ?? 'comfortable';
}

export function isProductInventoryEnabled() {
  return featureFlags?.productInventory?.enabled ?? false;
}

export function isDeliveryRequestsEnabled() {
  return featureFlags?.deliveryRequests?.enabled ?? false;
}

export function isReturnShipmentEnabled() {
  return featureFlags?.deliveryRequests?.returnShipment?.enabled ?? false;
}

export function isInternalDeliveryAllowed() {
  return featureFlags?.salesOrders?.allowInternalDelivery ?? true;
}

export function isAdditionalDRAllowed() {
  return featureFlags?.salesOrders?.allowAdditionalDR ?? true;
}

export function isSkipInitialStageAllowed() {
  return featureFlags?.salesOrders?.allowSkipInitialStage ?? false;
}

export function getShortagePolicy(): 'block' | 'allow' {
  return featureFlags?.salesOrders?.shortagePolicy ?? 'allow';
}

export function getSalesOrderCompletionEvidence(): 'quantities' | 'closedDeliveries' {
  return (
    (featureFlags?.salesOrders as { completionEvidence?: 'quantities' | 'closedDeliveries' })
      ?.completionEvidence ?? 'quantities'
  );
}

export function isExtraDeliveryQuantityAllowed(): boolean {
  return featureFlags?.salesOrders?.allowExtraDeliveryQuantity ?? false;
}

export function getSalesOrderStatusOptions(): SalesOrderStatusOption[] {
  return (
    (appConfig as { features?: { salesOrders?: { statusOptions?: SalesOrderStatusOption[] } } })
      ?.features?.salesOrders?.statusOptions ?? []
  );
}

export function getSalesOrderDefaultListStatuses(): string[] {
  const configured =
    (appConfig as { features?: { salesOrders?: { defaultListStatuses?: string[] } } })?.features
      ?.salesOrders?.defaultListStatuses ?? [];
  if (configured.length === 0) return [];
  const known = new Set(getSalesOrderStatusOptions().map((s) => s.value));
  return configured.filter((v) => known.has(v));
}

export function getSalesOrderStatusTransitions(): Record<string, string[]> {
  return (
    (
      appConfig as {
        features?: { salesOrders?: { statusTransitions?: Record<string, string[]> } };
      }
    )?.features?.salesOrders?.statusTransitions ?? {}
  );
}

export function getDeliveryRequestStatusOptions(): DeliveryRequestStatusOption[] {
  return (
    (
      appConfig as {
        features?: { deliveryRequests?: { statusOptions?: DeliveryRequestStatusOption[] } };
      }
    )?.features?.deliveryRequests?.statusOptions ?? []
  );
}

export function getDeliveryRequestDefaultListStatuses(): string[] {
  const configured =
    (appConfig as { features?: { deliveryRequests?: { defaultListStatuses?: string[] } } })
      ?.features?.deliveryRequests?.defaultListStatuses ?? [];
  if (configured.length === 0) return [];
  const known = new Set(getDeliveryRequestStatusOptions().map((s) => s.value));
  return configured.filter((v) => known.has(v));
}

export function getDeliveryRequestStatusTransitions(): Record<string, string[]> {
  return (
    (
      appConfig as {
        features?: { deliveryRequests?: { statusTransitions?: Record<string, string[]> } };
      }
    )?.features?.deliveryRequests?.statusTransitions ?? {}
  );
}

export function getTransportOrderStatusOptions(): TransportOrderStatusOptionConfig[] {
  return (
    (
      appConfig as {
        features?: { transportOrders?: { statusOptions?: TransportOrderStatusOptionConfig[] } };
      }
    )?.features?.transportOrders?.statusOptions ?? []
  );
}

export function getTransportOrderDefaultListStatuses(): string[] {
  const configured =
    (appConfig as { features?: { transportOrders?: { defaultListStatuses?: string[] } } })?.features
      ?.transportOrders?.defaultListStatuses ?? [];
  if (configured.length === 0) return [];
  const known = new Set(getTransportOrderStatusOptions().map((s) => s.value));
  return configured.filter((v) => known.has(v));
}

export function getTransportOrderStatusTransitions(): Record<string, string[]> {
  return (
    (
      appConfig as {
        features?: { transportOrders?: { statusTransitions?: Record<string, string[]> } };
      }
    )?.features?.transportOrders?.statusTransitions ?? {}
  );
}

export function resolveCustomerReportType(customerCode: string): number {
  const map =
    (
      appConfig as {
        features?: { transportOrders?: { customerReportTypes?: Record<string, number> } };
      }
    )?.features?.transportOrders?.customerReportTypes ?? {};
  return map[customerCode] ?? DEFAULT_CUSTOMER_REPORT_TYPE;
}

export function getDeliveryRequestDriverDepartments(): string[] {
  return (
    (
      appConfig as {
        features?: { deliveryRequests?: { driverDepartments?: string[] } };
      }
    )?.features?.deliveryRequests?.driverDepartments ?? []
  );
}

export function getSalesOrderPicDepartments(): string[] {
  return (
    (
      appConfig as {
        features?: { salesOrders?: { picDepartments?: string[] } };
      }
    )?.features?.salesOrders?.picDepartments ?? []
  );
}

export function getGoodsReceiptPicDepartments(): string[] {
  return (
    (
      appConfig as {
        features?: { goodsReceipts?: { picDepartments?: string[] } };
      }
    )?.features?.goodsReceipts?.picDepartments ?? []
  );
}

export function allowsNoInventoryProductsForGoodsReceipts(): boolean {
  return featureFlags?.goodsReceipts?.allowNoInventoryProducts ?? false;
}

const GOODS_RECEIPT_STATUS_VALUES = [
  'draft',
  'received',
  'cancelled',
] as const satisfies readonly GoodsReceiptStatus[];

export function getGoodsReceiptDefaultListStatuses(): string[] {
  const configured =
    (appConfig as { features?: { goodsReceipts?: { defaultListStatuses?: string[] } } })?.features
      ?.goodsReceipts?.defaultListStatuses ?? [];
  if (configured.length === 0) return [];
  const known = new Set<string>(GOODS_RECEIPT_STATUS_VALUES);
  return configured.filter((v) => known.has(v));
}

export function makeEmployeeDepartmentFilter(
  allowedDepartments: readonly string[],
): (e: { isActive: boolean; department?: string; extra?: { isDeleted?: boolean } }) => boolean {
  const allowed = new Set(allowedDepartments);
  if (allowed.size === 0) {
    return (e) => e.isActive && !e.extra?.isDeleted;
  }
  return (e) => e.isActive && !e.extra?.isDeleted && !!e.department && allowed.has(e.department);
}

export function getPositionOptions(): ConfigOption[] {
  return featureFlags?.employees?.positionOptions ?? [];
}

export function getSalesOrderTagOptions(): TagOption[] {
  return (
    (
      appConfig as {
        features?: { salesOrders?: { tagOptions?: TagOption[] } };
      }
    )?.features?.salesOrders?.tagOptions ?? []
  );
}

export function getSalesOrderDeliveryMethodOptions(): ConfigOption[] {
  return (
    (
      appConfig as {
        features?: { salesOrders?: { deliveryMethodOptions?: ConfigOption[] } };
      }
    )?.features?.salesOrders?.deliveryMethodOptions ?? []
  );
}

export function getSalesOrderDeliveryPackageSizeOptions(): string[] {
  return (
    (
      appConfig as {
        features?: { salesOrders?: { deliveryPackageSizeOptions?: string[] } };
      }
    )?.features?.salesOrders?.deliveryPackageSizeOptions ?? []
  );
}

export function hasAllowLoginForEmployees() {
  return featureFlags?.employees?.allowLogin ?? false;
}

export function hasBulkImportForEmployees() {
  return featureFlags?.employees?.bulkImport ?? false;
}

export function hasAvatarForEmployees() {
  return featureFlags?.employees?.avatar ?? false;
}

export function hasStartDateForEmployees() {
  return featureFlags?.employees?.startDate ?? false;
}

export function hasAddressForEmployees() {
  return featureFlags?.employees?.address ?? false;
}

export function hasDateOfBirthForEmployees() {
  return featureFlags?.employees?.dateOfBirth ?? false;
}

const driverDepartmentsSet = new Set(featureFlags?.employees?.driverDepartments ?? []);

export function isDriverDepartment(department?: string): boolean {
  return (
    (featureFlags?.employees?.driverProfile ?? false) &&
    !!department &&
    driverDepartmentsSet.has(department)
  );
}

export function hasBulkImportForProducts() {
  return featureFlags?.products?.bulkImport ?? false;
}

export function hasTechnicalSpecsForProducts() {
  return featureFlags?.products?.technicalSpecs ?? true;
}

export function hasBarcodeForProducts() {
  return featureFlags?.products?.barcode ?? true;
}

export function hasImagesForProducts() {
  return featureFlags?.products?.images ?? true;
}

export function hasHideFromInventoryListForProducts() {
  return featureFlags?.products?.hideFromInventoryList ?? false;
}

export function hasShippingAddressForCustomers() {
  return featureFlags?.customers?.shippingAddress ?? true;
}

export function hasLoginViaQRCode() {
  return appConfig?.auth?.loginViaQRCode ?? false;
}

export function getNavbarWidth() {
  return appConfig?.layout?.navbar?.width ?? 250;
}

export function getDisplayIconWhenCollapsed() {
  return appConfig?.layout?.navbar?.displayIconWhenCollapsed ?? false;
}

export function getNavbarVariant(): 'dark' | 'light' {
  return appConfig?.layout?.navbar?.variant ?? 'dark';
}

export function getHeaderVariant(): 'dark' | 'light' {
  return appConfig?.layout?.header?.variant ?? 'dark';
}

export function resolveOptions(options: ConfigOption[]) {
  const lang = i18n.resolvedLanguage ?? i18n.language ?? appConfig.defaultLanguage;
  const defaultLang = appConfig.defaultLanguage;
  return options.map((opt) => ({
    value: opt.value,
    label: opt.label[lang] ?? opt.label[defaultLang] ?? Object.values(opt.label)[0] ?? opt.value,
  }));
}

export function createOptionLabelResolver(options: { value: string; label: string }[]) {
  const map = new Map<string, string>();
  for (const opt of options) map.set(opt.value, opt.label);
  return (value: string | undefined | null) => {
    if (!value) return value ?? '';
    return map.get(value) ?? value;
  };
}

export type ResolvedStatusOption = {
  value: string;
  label: string;

  actionLabel: string;
  color: string;

  icon?: string;

  stage?: 'DRAFT' | 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'EXCEPTIONAL';

  capabilities?: { id: string; config?: unknown }[];

  allowedDepartments?: string[];

  isInitial?: boolean;
  terminal?: boolean;
  locked?: boolean;
};

export type ResolvedTagOption = {
  value: string;
  label: string;
  color: string;
};

export function resolveStatusOptions(
  options:
    SalesOrderStatusOption[] | DeliveryRequestStatusOption[] | TransportOrderStatusOptionConfig[],
): ResolvedStatusOption[] {
  const lang = i18n.resolvedLanguage ?? i18n.language ?? appConfig.defaultLanguage;
  const defaultLang = appConfig.defaultLanguage;
  return options.map((opt) => {
    const label =
      opt.label[lang] ?? opt.label[defaultLang] ?? Object.values(opt.label)[0] ?? opt.value;
    const actionLabel =
      'actionLabel' in opt && opt.actionLabel
        ? (opt.actionLabel[lang] ??
          opt.actionLabel[defaultLang] ??
          Object.values(opt.actionLabel)[0] ??
          label)
        : label;
    return {
      value: opt.value,
      label,
      actionLabel,
      color: opt.color,
      ...('icon' in opt && opt.icon ? { icon: opt.icon } : {}),
      ...('stage' in opt ? { stage: opt.stage } : {}),
      ...('capabilities' in opt ? { capabilities: opt.capabilities } : {}),
      ...('allowedDepartments' in opt && opt.allowedDepartments
        ? { allowedDepartments: opt.allowedDepartments }
        : {}),
      ...('isInitial' in opt && opt.isInitial ? { isInitial: true } : {}),
      ...('terminal' in opt && opt.terminal ? { terminal: true } : {}),
      ...('locked' in opt && opt.locked ? { locked: true } : {}),
    };
  });
}

export function canTransitionToStatus(
  toStatus: { allowedDepartments?: string[] },
  myDepartment: string | null,
): boolean {
  const allowed = toStatus.allowedDepartments;
  if (!allowed || allowed.length === 0) return true;
  if (myDepartment == null) return true;
  return allowed.includes(myDepartment);
}

export function resolveTagOptions(options: TagOption[]): ResolvedTagOption[] {
  const lang = i18n.resolvedLanguage ?? i18n.language ?? appConfig.defaultLanguage;
  const defaultLang = appConfig.defaultLanguage;
  return options.map((opt) => ({
    value: opt.value,
    label: opt.label[lang] ?? opt.label[defaultLang] ?? Object.values(opt.label)[0] ?? opt.value,
    color: opt.color,
  }));
}

export function createStatusResolver(options: ResolvedStatusOption[]) {
  const map = new Map<string, ResolvedStatusOption>();
  for (const opt of options) map.set(opt.value, opt);
  return (value: string | undefined | null): ResolvedStatusOption => {
    if (value && map.has(value)) return map.get(value)!;
    return {
      value: value ?? '',
      label: value ?? '',
      actionLabel: value ?? '',
      color: '#868e96',
    };
  };
}

function createModulePerms(moduleKey: string) {
  let cached: ModulePermissions | undefined;
  const resolve = () => (cached ??= getModulePermissions(moduleKey));
  return {
    canView: () => resolve().canView ?? false,
    canCreate: () => resolve().canCreate ?? false,
    canEdit: () => resolve().canEdit ?? false,
    canDelete: () => resolve().canDelete ?? false,
  };
}

export const perms = {
  employee: (() => {
    let cached: ModulePermissions | undefined;
    const resolve = () => (cached ??= getModulePermissions('employee'));
    return {
      ...createModulePerms('employee'),
      canSetPassword: () => resolve().actions?.canSetPassword ?? false,
      canIssueMagicLink: () => resolve().actions?.canIssueMagicLink ?? false,
      canToggleStatus: () => resolve().actions?.canToggleStatus ?? false,
      canViewActivityLog: () => resolve().actions?.canViewActivityLog ?? false,
    };
  })(),
  product: (() => {
    let cached: ModulePermissions | undefined;
    const resolve = () => (cached ??= getModulePermissions('product'));
    return {
      ...createModulePerms('product'),
      canViewPrice: () => resolve().actions?.canViewPrice ?? false,
      canManagePrice: () => resolve().actions?.canManagePrice ?? false,
    };
  })(),
  material: (() => {
    let cached: ModulePermissions | undefined;
    const resolve = () => (cached ??= getModulePermissions('material'));
    return {
      ...createModulePerms('material'),
      canManageInventory: () => resolve().actions?.canManageInventory ?? false,
    };
  })(),
  customer: createModulePerms('customer'),
  vendor: createModulePerms('vendor'),
  salesOrder: (() => {
    let cached: ModulePermissions | undefined;
    const resolve = () => (cached ??= getModulePermissions('salesOrder'));
    return {
      ...createModulePerms('salesOrder'),
      canTransitionStatus: () => resolve().actions?.canTransitionStatus ?? false,
      canCancel: () => resolve().actions?.canCancel ?? false,
      canManualRelease: () => resolve().actions?.canManualRelease ?? false,
      canExport: () => resolve().actions?.canExport ?? false,
      canViewPrice: () => resolve().actions?.canViewPrice ?? false,
      canViewSetComponentInventory: () => resolve().actions?.canViewSetComponentInventory ?? false,
      canTakePhoto: () => resolve().actions?.canTakePhoto ?? false,
      canEditDeliveryPackageSize: () => resolve().actions?.canEditDeliveryPackageSize ?? false,
      canEditItemWarehouseFields: () => resolve().actions?.canEditItemWarehouseFields ?? false,
      canViewAll: () => resolve().query?.canViewAll ?? false,
      canViewSelf: () => resolve().query?.canViewSelf ?? false,
    };
  })(),
  deliveryRequest: (() => {
    let cached: ModulePermissions | undefined;
    const resolve = () => (cached ??= getModulePermissions('deliveryRequest'));
    return {
      ...createModulePerms('deliveryRequest'),
      canManagePhotos: () => resolve().actions?.canManagePhotos ?? false,
      canReorder: () => resolve().actions?.canReorder ?? false,
      canViewAll: () => resolve().query?.canViewAll ?? false,
      canViewSelf: () => resolve().query?.canViewSelf ?? false,
    };
  })(),
  goodsReceipt: (() => {
    let cached: ModulePermissions | undefined;
    const resolve = () => (cached ??= getModulePermissions('goodsReceipt'));
    return {
      ...createModulePerms('goodsReceipt'),
      canConfirmReceived: () => resolve().actions?.canConfirmReceived ?? false,
      canCancel: () => resolve().actions?.canCancel ?? false,
    };
  })(),
  transportOrder: (() => {
    let cached: ModulePermissions | undefined;
    const resolve = () => (cached ??= getModulePermissions('transportOrder'));
    return {
      ...createModulePerms('transportOrder'),
      canTransitionStatus: () => resolve().actions?.canTransitionStatus ?? false,
      canCancel: () => resolve().actions?.canCancel ?? false,

      canViewPrice: () => resolve().actions?.canViewPrice ?? false,
      canExport: () => resolve().actions?.canExport ?? false,
    };
  })(),

  transportRoute: createModulePerms('transportRoute'),

  costNorm: createModulePerms('costNorm'),
  location: createModulePerms('location'),
  warehouseReceipt: createModulePerms('warehouseReceipt'),
  warehouseDeliveryNote: createModulePerms('warehouseDeliveryNote'),
  truck: (() => {
    let cached: ModulePermissions | undefined;
    const resolve = () => (cached ??= getModulePermissions('truck'));
    return {
      ...createModulePerms('truck'),

      canExport: () => resolve().actions?.canExport ?? false,

      canViewAll: () => resolve().query?.canViewAll ?? false,
      canViewSelf: () => resolve().query?.canViewSelf ?? false,
    };
  })(),
  oilTank: createModulePerms('oilTank'),
  greenhouse: createModulePerms('greenhouse'),
  crop: createModulePerms('crop'),
  cropDiaryTemplate: createModulePerms('cropDiaryTemplate'),
  cropDiary: createModulePerms('cropDiary'),
  productInventory: (() => {
    let cached: ModulePermissions | undefined;
    const resolve = () => (cached ??= getModulePermissions('productInventory'));
    return {
      ...createModulePerms('productInventory'),
      canBulkImport: () => resolve().actions?.canBulkImport ?? false,
    };
  })(),
  materialInventory: createModulePerms('materialInventory'),
  lookupV2: createModulePerms('lookupV2'),

  report: createModulePerms('report'),
  permissionManagement: (() => {
    let cached: ModulePermissions | undefined;
    const resolve = () => (cached ??= getModulePermissions('permissionManagement'));
    return {
      ...createModulePerms('permissionManagement'),
      canModify: () => resolve().actions?.canModify ?? false,
    };
  })(),
} as const;

export { deepMergePermissions, resolvePermissions } from '@/utils/permissionReader';

export function buildEffectivePermissions(
  clientPerms: PartialPermissions | undefined | null,
  departmentValue: string | undefined | null,
  departmentOptions: DepartmentOption[],
  employeePerms: PartialPermissions | undefined | null,
  versions: { cfg?: string; emp?: string },
): Permissions {
  const deptOption = departmentValue
    ? departmentOptions.find((d) => d.value === departmentValue)
    : undefined;

  const effective = resolvePermissions({
    base: BASE_PERMISSIONS,
    client: clientPerms,
    department: deptOption?.permissions,
    employee: employeePerms,
  });

  cacheSet('prm', effective);
  cacheSet('prv', versions);

  return effective;
}

export { getEffectivePermissions } from '@/utils/permissionReader';
export { getModulePermissions };
