import { resolveClientCode } from '@/config/client-code';
import {
  DEFAULT_APP_INFO,
  DEFAULT_AUTH,
  DEFAULT_COMPANY_INFOS,
  DEFAULT_CUSTOMER_FEATURES,
  DEFAULT_DELIVERY_REQUEST_FEATURES,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_EMPLOYEE_FEATURES,
  DEFAULT_ENABLE_PDF_SHARING,
  DEFAULT_ENABLE_STATS,
  DEFAULT_GOODS_RECEIPT_FEATURES,
  DEFAULT_TRANSPORT_ORDER_FEATURES,
  DEFAULT_LANGUAGE,
  DEFAULT_LANGUAGE_SWITCHER,
  DEFAULT_LANGUAGES,
  DEFAULT_LAYOUT,
  DEFAULT_LOCATION_FEATURES,
  DEFAULT_NOTIFY_NEW_VERSION,
  DEFAULT_PRODUCT_FEATURES,
  DEFAULT_SALES_ORDER_FEATURES,
  DEFAULT_TABLE_DENSITY,
  DEFAULT_THEME,
  DEFAULT_TRANSLATIONS,
  DEFAULT_VENDOR_FEATURES,
} from '@/config/default-config';
import { defaultNavigation, stripHiddenNavItems } from '@/config/navigation';
import { normalizeCompanyInfoList } from '@/config/companyInfoSchema';
import type {
  CompanyInfoConfig,
  GoodsReceiptFeatures,
  ProductFeatures,
  QuotationFeatures,
} from '@/config/schema';
import type { GoodsReceiptStatus } from '@/types';
import { LOOKUP_CATEGORIES } from '@/pages/lookups/categoryRegistry';
import { LOOKUP_V2_CATEGORIES } from '@/pages/lookup-v2/categoryRegistry';
import { useLookupV2Options } from '@/hooks/useLookupV2Options';
import {
  formatInvariantError,
  validateSalesOrderConfig,
} from '@/pages/sales-orders/capabilities/validateConfig';
import {
  formatInvariantError as formatDrInvariantError,
  validateDeliveryRequestConfig,
} from '@/pages/delivery-requests/capabilities/validateConfig';
import {
  formatTransportOrderInvariantError,
  validateTransportOrderConfig,
} from '@/pages/transport-orders/validateConfig';
import type { PartialPermissions } from '@/types/permissions';
import { cacheSet } from '@/utils/appCache';
import { deepDiff } from '@/utils/deepDiff';
import { scheduleReload } from '@/utils/scheduleReload';
import { cMngtConnector } from '@credo/connectors/connector';
import type {
  AuthFeatures,
  CMngtActivityLogFeatures,
  CMngtAppConfig,
  CMngtCustomerFeatures,
  CMngtDeliveryRequestFeatures,
  CMngtDisplaySettings,
  CMngtEmployeeFeatures,
  CMngtTransportOrderFeatures,
  CMngtLayoutConfig,
  CMngtLocationFeatures,
  CMngtLookupFeatures,
  CMngtModuleFeatures,
  CMngtPermissionManagementFeatures,
  CMngtPricingFeatures,
  CMngtMaterialFeatures,
  CMngtMaterialInventoryFeatures,
  CMngtSalesOrderFeatures,
  CMngtVendorFeatures,
  CMngtWarehouseDocFeatures,
  Language,
  NavigationConfig,
  ThemeConfig,
} from '@credo/kits/types';
import {
  Alert,
  Button,
  Checkbox,
  Container,
  Divider,
  Group,
  JsonInput,
  Loader,
  Modal,
  MultiSelect,
  Paper,
  ScrollArea,
  Select,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAppWindow,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconBox,
  IconBucketDroplet,
  IconBrush,
  IconBuilding,
  IconCalendar,
  IconCategory2,
  IconCoin,
  IconCopy,
  IconFileText,
  IconHistory,
  IconLanguage,
  IconLayoutSidebar,
  IconMapPin,
  IconNavigation,
  IconPackage,
  IconPackageImport,
  IconPlant2,
  IconRotate,
  IconShield,
  IconFileInvoice,
  IconShoppingCart,
  IconTransfer,
  IconTruck,
  IconUpload,
  IconUsers,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavigationSection } from './NavigationEditor';
import {
  AccessKeyGate,
  AppInfoSection,
  AuthFeaturesSection,
  CodeFormatFields,
  CollapsibleSection,
  CompanyInfoSection,
  FeatureToggleRow,
  ConfigOptionEditor,
  DeliveryRequestConfigInvariantAlert,
  DeliveryRequestStatusOptionEditor,
  DeptPermissionsSection,
  DEFAULT_CONFIG,
  DisplaySettingsSection,
  EmployeeFeaturesSection,
  LanguagesSection,
  LayoutSection,
  PermissionsConfigSection,
  reconcileTransitions,
  SalesOrderConfigInvariantAlert,
  SalesOrderStatusOptionEditor,
  SalesOrderTagOptionEditor,
  SCHEMA_DEFAULT_ACTIVITY_LOG_FEATURES,
  SCHEMA_DEFAULT_AUTH,
  SCHEMA_DEFAULT_CUSTOMER_FEATURES,
  SCHEMA_DEFAULT_DELIVERY_REQUEST_FEATURES,
  SCHEMA_DEFAULT_EMPLOYEE_FEATURES,
  SCHEMA_DEFAULT_GOODS_RECEIPT_FEATURES,
  SCHEMA_DEFAULT_TRANSPORT_ORDER_FEATURES,
  SCHEMA_DEFAULT_LAYOUT,
  SCHEMA_DEFAULT_LOCATION_FEATURES,
  SCHEMA_DEFAULT_LOOKUP_FEATURES,
  SCHEMA_DEFAULT_MATERIAL_FEATURES,
  SCHEMA_DEFAULT_MATERIAL_INVENTORY_FEATURES,
  SCHEMA_DEFAULT_MODULE_FEATURES,
  SCHEMA_DEFAULT_PERM_MNGT_FEATURES,
  SCHEMA_DEFAULT_PRICING_FEATURES,
  SCHEMA_DEFAULT_PRODUCT_FEATURES,
  SCHEMA_DEFAULT_QUOTATION_FEATURES,
  SCHEMA_DEFAULT_SALES_ORDER_FEATURES,
  SCHEMA_DEFAULT_THEME,
  SCHEMA_DEFAULT_VENDOR_FEATURES,
  SCHEMA_DEFAULT_WAREHOUSE_RECEIPT_FEATURES,
  SCHEMA_DEFAULT_WAREHOUSE_DELIVERY_NOTE_FEATURES,
  StatusAllowedDepartmentsMatrixEditor,
  StatusTransitionMatrixEditor,
  ThemeConfigSection,
  CustomerReportTypeEditor,
  TransportOrderConfigInvariantAlert,
  TransportOrderStatusOptionEditor,
  TranslationsSection,
  ALL_SECTIONS,
  type AppInfo,
  type SectionKey,
} from './AppConfigPage/index';

const MODULE_LABELS: Record<string, string> = {
  productInventoryModule: 'Product Inventory',
  productInventoryModuleDesc: 'On-hand stock per product per location.',
  productInventoryEnabled: 'Enable Product Inventory',
  productInventoryEnabledDesc:
    'When enabled, the product-inventory section is available in navigation.',
  materialInventoryModule: 'Material Inventory',
  materialInventoryModuleDesc: 'On-hand stock per material per location.',
  materialInventoryEnabled: 'Enable Material Inventory',
  materialInventoryEnabledDesc:
    'When enabled, the material-inventory section is available in navigation.',
  materialsModule: 'Materials',
  materialsModuleDesc: 'Enable the materials module for this client',
  materialsEnabled: 'Enable Materials',
  materialsEnabledDesc:
    'When enabled, the materials section is available in navigation and accessible to users with material permissions',
  trucksModule: 'Trucks',
  trucksModuleDesc: 'Truck fleet register (single-mode-records stack).',
  trucksEnabled: 'Enable Trucks',
  trucksEnabledDesc:
    'When enabled, the Trucks section is available in navigation (subject to per-user permissions).',
  oilTanksModule: 'Oil Tanks',
  oilTanksModuleDesc: 'On-site fuel tanks (single-mode-records stack).',
  oilTanksEnabled: 'Enable Oil Tanks',
  oilTanksEnabledDesc:
    'When enabled, the Oil Tanks section is available in navigation (subject to per-user permissions). Independent of Trucks: a fleet can run entirely on external stations.',
  farmModule: 'Farm (Greenhouses, Crops & Diary)',
  farmModuleDesc:
    'Agriculture: greenhouses, the crops grown in them, and the crop diary (activity log + reusable templates).',
  farmEnabled: 'Enable Farm',
  farmEnabledDesc:
    'When enabled, the Greenhouses, Crops, Crop Diary, and Diary Templates sections are available in navigation (subject to per-user permissions).',
};

const LOOKUP_CATEGORY_LABELS: Record<string, string> = {
  'lookups.categories.productCategory': 'Product Category',
  'lookups.categories.productTag': 'Product Tag',
  'lookups.categories.unit': 'Unit of Measure',
  'lookups.categories.materialCategory': 'Material Category',
  'lookups.categories.materialUnit': 'Material Unit',
  'lookups.categories.productUnit': 'Product Unit',
  'lookups.categories.truckType': 'Truck Type',
  'lookups.categories.containerSize': 'Container Size',
  'lookups.categories.shipmentType': 'Shipment Type',
  'lookups.categories.feeName': 'Fee Name',
  'lookups.categories.maintenanceType': 'Maintenance Type',
};

function toStatusMultiSelectData(
  options: readonly { value: string; label: Record<string, string> }[] | undefined,
): { value: string; label: string }[] {
  return (options ?? []).map((s) => {
    const labels: Record<string, string> = s.label;
    const label = labels.en || labels.vi || Object.values(labels)[0] || s.value;
    return { value: s.value, label: `${label} (${s.value})` };
  });
}

const goodsReceiptStatusMultiSelectData: { value: GoodsReceiptStatus; label: string }[] = [
  { value: 'draft', label: 'Draft (draft)' },
  { value: 'received', label: 'Received (received)' },
  { value: 'cancelled', label: 'Cancelled (cancelled)' },
];

export function ConfigEditor({
  accessKey,
  clientServiceCode,
}: {
  accessKey: string;
  clientServiceCode?: string;
}) {
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  const clientCode = useMemo(() => clientServiceCode ?? resolveClientCode(), [clientServiceCode]);
  const isExternalTarget = clientServiceCode !== undefined;

  const [version, setVersion] = useState(DEFAULT_CONFIG.version);
  const [appInfo, setAppInfo] = useState<AppInfo>(DEFAULT_CONFIG.app);
  const [auth, setAuth] = useState<AuthFeatures>(DEFAULT_CONFIG.auth);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_CONFIG.themeConfig);
  const [languages, setLanguages] = useState<Language[]>(DEFAULT_CONFIG.languages);
  const [defaultLanguage, setDefaultLanguage] = useState(DEFAULT_CONFIG.defaultLanguage);
  const [navigation, setNavigation] = useState<NavigationConfig>(DEFAULT_CONFIG.navigation);
  const [languageSwitcher, setLanguageSwitcher] = useState(
    DEFAULT_CONFIG.features.common.languageSwitcher,
  );
  const [enablePdfSharing, setEnablePdfSharing] = useState(
    DEFAULT_CONFIG.features.common.enablePdfSharing,
  );
  const [enableStats, setEnableStats] = useState(DEFAULT_CONFIG.features.common.enableStats);
  const [notifyNewVersion, setNotifyNewVersion] = useState(DEFAULT_NOTIFY_NEW_VERSION);
  const [tableDensity, setTableDensity] = useState(DEFAULT_TABLE_DENSITY);
  const [employeeFeatures, setEmployeeFeatures] = useState<CMngtEmployeeFeatures>(
    DEFAULT_CONFIG.features.employees,
  );
  const [permMngtFeatures, setPermMngtFeatures] = useState<CMngtPermissionManagementFeatures>(
    DEFAULT_CONFIG.features.permissionManagement,
  );
  const [activityLogFeatures, setActivityLogFeatures] = useState<CMngtActivityLogFeatures>(
    DEFAULT_CONFIG.features.activityLog,
  );
  const [pricingFeatures, setPricingFeatures] = useState<CMngtPricingFeatures>(
    DEFAULT_CONFIG.features.pricing,
  );
  const [productsFeatures, setProductsFeatures] = useState<ProductFeatures>(
    SCHEMA_DEFAULT_PRODUCT_FEATURES,
  );
  const [locationsFeatures, setLocationsFeatures] = useState<CMngtLocationFeatures>(
    SCHEMA_DEFAULT_LOCATION_FEATURES,
  );
  const [productInventoryFeatures, setProductInventoryFeatures] = useState<CMngtModuleFeatures>(
    SCHEMA_DEFAULT_MODULE_FEATURES,
  );
  const [lookupV2Features, setLookupV2Features] = useState<CMngtLookupFeatures>(
    SCHEMA_DEFAULT_LOOKUP_FEATURES,
  );
  const [materialInventoryFeatures, setMaterialInventoryFeatures] =
    useState<CMngtMaterialInventoryFeatures>(SCHEMA_DEFAULT_MATERIAL_INVENTORY_FEATURES);
  const [materialsFeatures, setMaterialsFeatures] = useState<CMngtMaterialFeatures>(
    SCHEMA_DEFAULT_MATERIAL_FEATURES,
  );
  const [warehouseReceiptsFeatures, setWarehouseReceiptsFeatures] =
    useState<CMngtWarehouseDocFeatures>(SCHEMA_DEFAULT_WAREHOUSE_RECEIPT_FEATURES);
  const [warehouseDeliveryNotesFeatures, setWarehouseDeliveryNotesFeatures] =
    useState<CMngtWarehouseDocFeatures>(SCHEMA_DEFAULT_WAREHOUSE_DELIVERY_NOTE_FEATURES);
  const [oilTanksFeatures, setOilTanksFeatures] = useState<CMngtModuleFeatures>(
    SCHEMA_DEFAULT_MODULE_FEATURES,
  );
  const [trucksFeatures, setTrucksFeatures] = useState<CMngtModuleFeatures>(
    SCHEMA_DEFAULT_MODULE_FEATURES,
  );
  const [farmFeatures, setFarmFeatures] = useState<CMngtModuleFeatures>(
    SCHEMA_DEFAULT_MODULE_FEATURES,
  );
  const [customersFeatures, setCustomersFeatures] =
    useState<CMngtCustomerFeatures>(DEFAULT_CUSTOMER_FEATURES);
  const [vendorsFeatures, setVendorsFeatures] = useState<CMngtVendorFeatures>(
    SCHEMA_DEFAULT_VENDOR_FEATURES,
  );
  const [salesOrdersFeatures, setSalesOrdersFeatures] = useState<CMngtSalesOrderFeatures>(
    DEFAULT_SALES_ORDER_FEATURES,
  );
  const [quotationsFeatures, setQuotationsFeatures] = useState<QuotationFeatures>(
    SCHEMA_DEFAULT_QUOTATION_FEATURES,
  );
  const [deliveryRequestsFeatures, setDeliveryRequestsFeatures] =
    useState<CMngtDeliveryRequestFeatures>(DEFAULT_DELIVERY_REQUEST_FEATURES);
  const [goodsReceiptsFeatures, setGoodsReceiptsFeatures] = useState<GoodsReceiptFeatures>(
    DEFAULT_GOODS_RECEIPT_FEATURES,
  );
  const [transportOrdersFeatures, setTransportOrdersFeatures] =
    useState<CMngtTransportOrderFeatures>(DEFAULT_TRANSPORT_ORDER_FEATURES);

  const truckTypeOptions = useLookupV2Options('truck-type');
  const [lookupsFeatures, setLookupsFeatures] = useState<CMngtLookupFeatures>(
    SCHEMA_DEFAULT_LOOKUP_FEATURES,
  );
  const [layout, setLayout] = useState<CMngtLayoutConfig>(DEFAULT_CONFIG.layout);
  const [permissions, setPermissions] = useState<PartialPermissions>({});
  const [translations, setTranslations] = useState<Record<string, Record<string, unknown>>>(
    DEFAULT_CONFIG.translations ?? {},
  );
  const [displaySettings, setDisplaySettings] =
    useState<CMngtDisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [companyInfos, setCompanyInfos] = useState<CompanyInfoConfig[]>(DEFAULT_COMPANY_INFOS);

  const departmentMultiSelectData = useMemo(
    () =>
      (employeeFeatures.departmentOptions ?? []).map((d) => {
        const labels = d.label ?? {};
        const label = labels.en || labels.vi || Object.values(labels)[0] || d.value;
        return { value: d.value, label: label || d.value };
      }),
    [employeeFeatures.departmentOptions],
  );

  const salesOrderStatusMultiSelectData = useMemo(
    () => toStatusMultiSelectData(salesOrdersFeatures.statusOptions),
    [salesOrdersFeatures.statusOptions],
  );
  const deliveryRequestStatusMultiSelectData = useMemo(
    () => toStatusMultiSelectData(deliveryRequestsFeatures.statusOptions),
    [deliveryRequestsFeatures.statusOptions],
  );
  const transportOrderStatusMultiSelectData = useMemo(
    () => toStatusMultiSelectData(transportOrdersFeatures.statusOptions),
    [transportOrdersFeatures.statusOptions],
  );

  const buildConfigPayload = useCallback(
    (newVersion?: string): CMngtAppConfig => ({
      version: newVersion ?? version,
      schemaVersion: DEFAULT_CONFIG.schemaVersion,
      app: appInfo,
      auth,
      themeConfig,
      languages,
      defaultLanguage,

      navigation: {
        pc: stripHiddenNavItems(navigation.pc),
        mobile: stripHiddenNavItems(navigation.mobile),
      },
      features: {
        common: {
          darkMode: DEFAULT_CONFIG.features.common.darkMode,
          languageSwitcher,
          enablePdfSharing,
          enableStats,
          notifyNewVersion,
          tableDensity,
        },
        employees: employeeFeatures,
        permissionManagement: permMngtFeatures,
        activityLog: activityLogFeatures,
        pricing: pricingFeatures,
        products: productsFeatures,
        customers: customersFeatures,
        vendors: vendorsFeatures,
        materials: materialsFeatures,
        materialInventory: materialInventoryFeatures,
        warehouseReceipts: warehouseReceiptsFeatures,
        warehouseDeliveryNotes: warehouseDeliveryNotesFeatures,
        salesOrders: salesOrdersFeatures,
        quotations: quotationsFeatures,
        deliveryRequests: deliveryRequestsFeatures,
        goodsReceipts: goodsReceiptsFeatures,
        transportOrders: transportOrdersFeatures,
        locations: locationsFeatures,
        productInventory: productInventoryFeatures,
        lookups: lookupsFeatures,
        lookupV2: lookupV2Features,
        trucks: trucksFeatures,
        oilTanks: oilTanksFeatures,
        farm: farmFeatures,
      },
      layout,
      displaySettings,
      companyInfo: companyInfos,
      permissions: Object.keys(permissions).length > 0 ? permissions : undefined,
      translations,
    }),
    [
      version,
      appInfo,
      auth,
      themeConfig,
      languages,
      defaultLanguage,
      navigation,
      languageSwitcher,
      enablePdfSharing,
      enableStats,
      notifyNewVersion,
      tableDensity,
      employeeFeatures,
      permMngtFeatures,
      activityLogFeatures,
      pricingFeatures,
      productsFeatures,
      materialsFeatures,
      materialInventoryFeatures,
      warehouseReceiptsFeatures,
      warehouseDeliveryNotesFeatures,
      customersFeatures,
      vendorsFeatures,
      salesOrdersFeatures,
      quotationsFeatures,
      deliveryRequestsFeatures,
      goodsReceiptsFeatures,
      transportOrdersFeatures,
      locationsFeatures,
      productInventoryFeatures,
      lookupV2Features,
      lookupsFeatures,
      trucksFeatures,
      oilTanksFeatures,
      farmFeatures,
      layout,
      displaySettings,
      companyInfos,
      permissions,
      translations,
    ],
  );

  const applyConfig = useCallback((cfg: CMngtAppConfig) => {
    setVersion(cfg.version ?? DEFAULT_CONFIG.version);
    setAppInfo(cfg.app ?? DEFAULT_CONFIG.app);
    setAuth({ ...SCHEMA_DEFAULT_AUTH, ...cfg.auth });
    setThemeConfig({ ...SCHEMA_DEFAULT_THEME, ...cfg.themeConfig });
    setLanguages(cfg.languages ?? DEFAULT_CONFIG.languages);
    setDefaultLanguage(cfg.defaultLanguage ?? DEFAULT_CONFIG.defaultLanguage);
    setNavigation(cfg.navigation ?? DEFAULT_CONFIG.navigation);
    setLanguageSwitcher(
      cfg.features?.common?.languageSwitcher ?? DEFAULT_CONFIG.features.common.languageSwitcher,
    );
    setEnablePdfSharing(
      cfg.features?.common?.enablePdfSharing ?? DEFAULT_CONFIG.features.common.enablePdfSharing,
    );
    setEnableStats(cfg.features?.common?.enableStats ?? DEFAULT_CONFIG.features.common.enableStats);
    setNotifyNewVersion(cfg.features?.common?.notifyNewVersion ?? DEFAULT_NOTIFY_NEW_VERSION);
    setTableDensity(cfg.features?.common?.tableDensity ?? DEFAULT_TABLE_DENSITY);
    setEmployeeFeatures({ ...SCHEMA_DEFAULT_EMPLOYEE_FEATURES, ...cfg.features?.employees });
    setPermMngtFeatures({
      ...SCHEMA_DEFAULT_PERM_MNGT_FEATURES,
      ...cfg.features?.permissionManagement,
    });
    setActivityLogFeatures({
      ...SCHEMA_DEFAULT_ACTIVITY_LOG_FEATURES,
      ...cfg.features?.activityLog,
    });
    setPricingFeatures({
      ...SCHEMA_DEFAULT_PRICING_FEATURES,
      ...cfg.features?.pricing,
    });
    setProductsFeatures({ ...SCHEMA_DEFAULT_PRODUCT_FEATURES, ...cfg.features?.products });
    setLocationsFeatures({ ...SCHEMA_DEFAULT_LOCATION_FEATURES, ...cfg.features?.locations });
    setProductInventoryFeatures({
      ...SCHEMA_DEFAULT_MODULE_FEATURES,
      ...cfg.features?.productInventory,
    });
    setLookupV2Features({ ...SCHEMA_DEFAULT_LOOKUP_FEATURES, ...cfg.features?.lookupV2 });
    setTrucksFeatures({ ...SCHEMA_DEFAULT_MODULE_FEATURES, ...cfg.features?.trucks });
    setOilTanksFeatures({ ...SCHEMA_DEFAULT_MODULE_FEATURES, ...cfg.features?.oilTanks });
    setFarmFeatures({ ...SCHEMA_DEFAULT_MODULE_FEATURES, ...cfg.features?.farm });
    setCustomersFeatures({ ...SCHEMA_DEFAULT_CUSTOMER_FEATURES, ...cfg.features?.customers });
    setVendorsFeatures({ ...SCHEMA_DEFAULT_VENDOR_FEATURES, ...cfg.features?.vendors });
    setMaterialsFeatures({ ...SCHEMA_DEFAULT_MATERIAL_FEATURES, ...cfg.features?.materials });
    setMaterialInventoryFeatures({
      ...SCHEMA_DEFAULT_MATERIAL_INVENTORY_FEATURES,
      ...cfg.features?.materialInventory,
    });
    setWarehouseReceiptsFeatures({
      ...SCHEMA_DEFAULT_WAREHOUSE_RECEIPT_FEATURES,
      ...cfg.features?.warehouseReceipts,
    });
    setWarehouseDeliveryNotesFeatures({
      ...SCHEMA_DEFAULT_WAREHOUSE_DELIVERY_NOTE_FEATURES,
      ...cfg.features?.warehouseDeliveryNotes,
    });
    setSalesOrdersFeatures({
      ...SCHEMA_DEFAULT_SALES_ORDER_FEATURES,
      ...cfg.features?.salesOrders,
    });
    setQuotationsFeatures({
      ...SCHEMA_DEFAULT_QUOTATION_FEATURES,
      ...cfg.features?.quotations,
    });
    setDeliveryRequestsFeatures({
      ...SCHEMA_DEFAULT_DELIVERY_REQUEST_FEATURES,
      ...cfg.features?.deliveryRequests,
    });
    setGoodsReceiptsFeatures({
      ...SCHEMA_DEFAULT_GOODS_RECEIPT_FEATURES,
      ...cfg.features?.goodsReceipts,
    });
    setTransportOrdersFeatures({
      ...SCHEMA_DEFAULT_TRANSPORT_ORDER_FEATURES,
      ...cfg.features?.transportOrders,
    });
    setLookupsFeatures({ ...SCHEMA_DEFAULT_LOOKUP_FEATURES, ...cfg.features?.lookups });
    setLayout({ ...SCHEMA_DEFAULT_LAYOUT, ...cfg.layout });
    setPermissions(cfg.permissions ?? {});
    setTranslations(cfg.translations ?? {});
    setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS, ...cfg.displaySettings });
    setCompanyInfos(normalizeCompanyInfoList(cfg.companyInfo));
    setHasConfig(true);
  }, []);

  useEffect(() => {
    if (!clientCode) return;

    setConfigLoading(true);
    cMngtConnector.setAccessKey(accessKey);
    cMngtConnector
      .getAppConfigAdmin({ clientServiceCode: clientCode })
      .then((res) => {
        if (res.success && res.config) {
          applyConfig(res.config as CMngtAppConfig);
        } else {
          setHasConfig(false);
        }
      })
      .catch(() => {
        notifications.show({ color: 'red', message: 'Failed to load config' });
      })
      .finally(() => setConfigLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t excluded: language change should not re-fetch config
  }, [clientCode, accessKey]);

  const handleSave = async () => {
    if (!clientCode) return;

    const knownDepartments = new Set(
      (employeeFeatures.departmentOptions ?? []).map((d) => d.value),
    );
    const soResult = validateSalesOrderConfig(salesOrdersFeatures, knownDepartments);
    if (!soResult.ok) {
      notifications.show({
        color: 'red',
        title: 'Cannot save — config has invariant errors',
        message: soResult.errors.map(formatInvariantError).join(' · '),
      });
      return;
    }

    const drResult = validateDeliveryRequestConfig(deliveryRequestsFeatures);
    if (!drResult.ok) {
      notifications.show({
        color: 'red',
        title: 'Cannot save — config has invariant errors',
        message: drResult.errors.map(formatDrInvariantError).join(' · '),
      });
      return;
    }

    const toResult = validateTransportOrderConfig(transportOrdersFeatures, knownDepartments);
    if (!toResult.ok) {
      notifications.show({
        color: 'red',
        title: 'Cannot save — config has invariant errors',
        message: toResult.errors.map(formatTransportOrderInvariantError).join(' · '),
      });
      return;
    }

    setSaving(true);
    try {
      const newVersion = `1.0.${Date.now().toString(36)}`;
      const config = buildConfigPayload(newVersion);
      cMngtConnector.setAccessKey(accessKey);
      const res = await cMngtConnector.setAppConfig({
        clientServiceCode: clientCode,
        config,
      });
      if (res.success) {
        if (!isExternalTarget) cacheSet('cfg', config);
        setVersion(newVersion);
        notifications.show({ color: 'green', message: 'Config saved successfully' });
        setHasConfig(true);

        if (!isExternalTarget) scheduleReload('app config saved');
      } else {
        notifications.show({ color: 'red', message: 'Failed to save config' });
      }
    } catch {
      notifications.show({ color: 'red', message: 'Failed to save config' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyJson = useCallback(() => {
    const json = JSON.stringify(
      {
        date: new Date().toLocaleString(),
        ...buildConfigPayload(),
      },
      null,
      2,
    );
    navigator.clipboard.writeText(json).then(
      () =>
        notifications.show({
          color: 'green',
          message: 'Config JSON copied to clipboard',
        }),
      () =>
        notifications.show({
          color: 'red',
          message: 'Failed to copy',
        }),
    );
  }, [buildConfigPayload]);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importJsonError, setImportJsonError] = useState<string | null>(null);

  const handleOpenImport = useCallback(() => {
    setImportJsonText('');
    setImportJsonError(null);
    setImportModalOpen(true);
  }, []);

  const handleImportJson = useCallback(() => {
    const trimmed = importJsonText.trim();
    if (!trimmed) {
      setImportJsonError('JSON is empty');
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      setImportJsonError((err as Error).message);
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setImportJsonError('JSON must be an object');
      return;
    }
    applyConfig(parsed as CMngtAppConfig);
    setImportModalOpen(false);
    notifications.show({
      color: 'green',
      message: 'Config JSON imported — review and Save',
    });
  }, [importJsonText, applyConfig]);

  const [openSections, setOpenSections] = useState<Set<SectionKey>>(() => {
    const hash = window.location.hash.replace('#', '') as SectionKey;
    if (hash && ALL_SECTIONS.includes(hash)) return new Set<SectionKey>([hash]);
    return new Set<SectionKey>(['appInfo']);
  });

  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.replace('#', '') as SectionKey;
      if (hash && ALL_SECTIONS.includes(hash)) {
        setOpenSections(new Set<SectionKey>([hash]));

        requestAnimationFrame(() => {
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    };
    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setOpenSections(new Set(ALL_SECTIONS)), []);
  const collapseAll = useCallback(() => setOpenSections(new Set()), []);

  const resetAll = useCallback(() => {
    setLanguageSwitcher(DEFAULT_LANGUAGE_SWITCHER);
    setEnablePdfSharing(DEFAULT_ENABLE_PDF_SHARING);
    setEnableStats(DEFAULT_ENABLE_STATS);
    setNotifyNewVersion(DEFAULT_NOTIFY_NEW_VERSION);
    setAuth(DEFAULT_AUTH);
    setEmployeeFeatures(DEFAULT_EMPLOYEE_FEATURES);
    setPermMngtFeatures(SCHEMA_DEFAULT_PERM_MNGT_FEATURES);
    setProductsFeatures(SCHEMA_DEFAULT_PRODUCT_FEATURES);
    setLocationsFeatures(SCHEMA_DEFAULT_LOCATION_FEATURES);
    setProductInventoryFeatures(SCHEMA_DEFAULT_MODULE_FEATURES);
    setLookupV2Features(SCHEMA_DEFAULT_LOOKUP_FEATURES);
    setMaterialInventoryFeatures(SCHEMA_DEFAULT_MATERIAL_INVENTORY_FEATURES);
    setMaterialsFeatures(SCHEMA_DEFAULT_MATERIAL_FEATURES);
    setWarehouseReceiptsFeatures(SCHEMA_DEFAULT_WAREHOUSE_RECEIPT_FEATURES);
    setWarehouseDeliveryNotesFeatures(SCHEMA_DEFAULT_WAREHOUSE_DELIVERY_NOTE_FEATURES);
    setTrucksFeatures(SCHEMA_DEFAULT_MODULE_FEATURES);
    setFarmFeatures(SCHEMA_DEFAULT_MODULE_FEATURES);
    setCustomersFeatures(DEFAULT_CUSTOMER_FEATURES);
    setVendorsFeatures(DEFAULT_VENDOR_FEATURES);
    setLookupsFeatures(SCHEMA_DEFAULT_LOOKUP_FEATURES);
    setSalesOrdersFeatures(DEFAULT_SALES_ORDER_FEATURES);
    setQuotationsFeatures(SCHEMA_DEFAULT_QUOTATION_FEATURES);
    setDeliveryRequestsFeatures(DEFAULT_DELIVERY_REQUEST_FEATURES);
    setGoodsReceiptsFeatures(DEFAULT_GOODS_RECEIPT_FEATURES);
    setTransportOrdersFeatures(DEFAULT_TRANSPORT_ORDER_FEATURES);
    setPermissions({});
    setThemeConfig(DEFAULT_THEME);
    setLayout(DEFAULT_LAYOUT);
    setLanguages(DEFAULT_LANGUAGES);
    setDefaultLanguage(DEFAULT_LANGUAGE);
    setNavigation(defaultNavigation);
    setTranslations(DEFAULT_TRANSLATIONS);
    setDisplaySettings(DEFAULT_DISPLAY_SETTINGS);
    setTableDensity(DEFAULT_TABLE_DENSITY);
    setCompanyInfos(DEFAULT_COMPANY_INFOS);
  }, []);

  const resetAppInfo = useCallback(() => {
    setAppInfo(DEFAULT_APP_INFO);
    setLanguageSwitcher(DEFAULT_LANGUAGE_SWITCHER);
    setEnablePdfSharing(DEFAULT_ENABLE_PDF_SHARING);
    setEnableStats(DEFAULT_ENABLE_STATS);
    setNotifyNewVersion(DEFAULT_NOTIFY_NEW_VERSION);
  }, []);
  const resetAuth = useCallback(() => setAuth(DEFAULT_AUTH), []);
  const resetEmployees = useCallback(() => setEmployeeFeatures(DEFAULT_EMPLOYEE_FEATURES), []);
  const resetPermMngt = useCallback(
    () => setPermMngtFeatures(SCHEMA_DEFAULT_PERM_MNGT_FEATURES),
    [],
  );
  const resetActivityLog = useCallback(
    () => setActivityLogFeatures(SCHEMA_DEFAULT_ACTIVITY_LOG_FEATURES),
    [],
  );
  const resetPricing = useCallback(() => setPricingFeatures(SCHEMA_DEFAULT_PRICING_FEATURES), []);
  const resetProducts = useCallback(() => setProductsFeatures(DEFAULT_PRODUCT_FEATURES), []);
  const resetLocations = useCallback(() => setLocationsFeatures(DEFAULT_LOCATION_FEATURES), []);
  const resetProductInventory = useCallback(
    () => setProductInventoryFeatures(SCHEMA_DEFAULT_MODULE_FEATURES),
    [],
  );
  const resetLookupV2 = useCallback(() => setLookupV2Features(SCHEMA_DEFAULT_LOOKUP_FEATURES), []);
  const resetMaterialInventory = useCallback(
    () => setMaterialInventoryFeatures(SCHEMA_DEFAULT_MATERIAL_INVENTORY_FEATURES),
    [],
  );
  const resetMaterials = useCallback(
    () => setMaterialsFeatures(SCHEMA_DEFAULT_MATERIAL_FEATURES),
    [],
  );
  const resetWarehouseReceipts = useCallback(
    () => setWarehouseReceiptsFeatures(SCHEMA_DEFAULT_WAREHOUSE_RECEIPT_FEATURES),
    [],
  );
  const resetWarehouseDeliveryNotes = useCallback(
    () => setWarehouseDeliveryNotesFeatures(SCHEMA_DEFAULT_WAREHOUSE_DELIVERY_NOTE_FEATURES),
    [],
  );
  const resetTrucks = useCallback(() => setTrucksFeatures(SCHEMA_DEFAULT_MODULE_FEATURES), []);
  const resetOilTanks = useCallback(() => setOilTanksFeatures(SCHEMA_DEFAULT_MODULE_FEATURES), []);
  const resetFarm = useCallback(() => setFarmFeatures(SCHEMA_DEFAULT_MODULE_FEATURES), []);
  const resetVendors = useCallback(() => setVendorsFeatures(DEFAULT_VENDOR_FEATURES), []);
  const resetLookups = useCallback(() => setLookupsFeatures(SCHEMA_DEFAULT_LOOKUP_FEATURES), []);
  const resetCustomers = useCallback(() => setCustomersFeatures(DEFAULT_CUSTOMER_FEATURES), []);
  const resetSalesOrders = useCallback(
    () => setSalesOrdersFeatures(DEFAULT_SALES_ORDER_FEATURES),
    [],
  );
  const resetQuotations = useCallback(
    () => setQuotationsFeatures(SCHEMA_DEFAULT_QUOTATION_FEATURES),
    [],
  );
  const resetDeliveryRequests = useCallback(
    () => setDeliveryRequestsFeatures(DEFAULT_DELIVERY_REQUEST_FEATURES),
    [],
  );
  const resetGoodsReceipts = useCallback(
    () => setGoodsReceiptsFeatures(DEFAULT_GOODS_RECEIPT_FEATURES),
    [],
  );
  const resetTransportOrders = useCallback(
    () => setTransportOrdersFeatures(DEFAULT_TRANSPORT_ORDER_FEATURES),
    [],
  );
  const resetPermissions = useCallback(() => setPermissions({}), []);
  const resetDeptPermissions = useCallback(
    () =>
      setEmployeeFeatures((prev) => ({
        ...prev,
        departmentOptions: prev.departmentOptions.map((opt) => ({
          ...opt,
          permissions: undefined,
        })),
      })),
    [],
  );
  const resetTheme = useCallback(() => setThemeConfig(DEFAULT_THEME), []);
  const resetLayout = useCallback(() => setLayout(DEFAULT_LAYOUT), []);
  const resetLanguages = useCallback(() => {
    setLanguages(DEFAULT_LANGUAGES);
    setDefaultLanguage(DEFAULT_LANGUAGE);
  }, []);
  const resetNavigation = useCallback(() => setNavigation(defaultNavigation), []);
  const resetTranslations = useCallback(() => setTranslations(DEFAULT_TRANSLATIONS), []);
  const resetDisplaySettings = useCallback(() => {
    setDisplaySettings(DEFAULT_DISPLAY_SETTINGS);
    setTableDensity(DEFAULT_TABLE_DENSITY);
  }, []);
  const resetCompanyInfo = useCallback(() => setCompanyInfos(DEFAULT_COMPANY_INFOS), []);

  const eqDefault = (a: unknown, b: unknown) => Object.keys(deepDiff(a, b)).length === 0;
  const sectionIsDefault: Partial<Record<SectionKey, boolean>> = {
    appInfo:
      eqDefault(appInfo, DEFAULT_APP_INFO) &&
      eqDefault(languageSwitcher, DEFAULT_LANGUAGE_SWITCHER) &&
      eqDefault(enablePdfSharing, DEFAULT_ENABLE_PDF_SHARING) &&
      eqDefault(enableStats, DEFAULT_ENABLE_STATS) &&
      eqDefault(notifyNewVersion, DEFAULT_NOTIFY_NEW_VERSION),
    displaySettings:
      eqDefault(displaySettings, DEFAULT_DISPLAY_SETTINGS) &&
      eqDefault(tableDensity, DEFAULT_TABLE_DENSITY),
    companyInfo: eqDefault(companyInfos, DEFAULT_COMPANY_INFOS),
    layout: eqDefault(layout, DEFAULT_LAYOUT),
    theme: eqDefault(themeConfig, DEFAULT_THEME),
    languages: eqDefault(languages, DEFAULT_LANGUAGES) && defaultLanguage === DEFAULT_LANGUAGE,
    permissionManagement: eqDefault(permMngtFeatures, SCHEMA_DEFAULT_PERM_MNGT_FEATURES),
    permissions: Object.keys(permissions).length === 0,
    deptPermissions: (employeeFeatures.departmentOptions ?? []).every(
      (o) => o.permissions === undefined,
    ),
    auth: eqDefault(auth, DEFAULT_AUTH),
    employees: eqDefault(employeeFeatures, DEFAULT_EMPLOYEE_FEATURES),
    activityLog: eqDefault(activityLogFeatures, SCHEMA_DEFAULT_ACTIVITY_LOG_FEATURES),
    pricing: eqDefault(pricingFeatures, SCHEMA_DEFAULT_PRICING_FEATURES),
    products: eqDefault(productsFeatures, DEFAULT_PRODUCT_FEATURES),
    locations: eqDefault(locationsFeatures, DEFAULT_LOCATION_FEATURES),
    vendors: eqDefault(vendorsFeatures, DEFAULT_VENDOR_FEATURES),
    productInventory: eqDefault(productInventoryFeatures, SCHEMA_DEFAULT_MODULE_FEATURES),
    trucks: eqDefault(trucksFeatures, SCHEMA_DEFAULT_MODULE_FEATURES),
    oilTanks: eqDefault(oilTanksFeatures, SCHEMA_DEFAULT_MODULE_FEATURES),
    farm: eqDefault(farmFeatures, SCHEMA_DEFAULT_MODULE_FEATURES),
    materials: eqDefault(materialsFeatures, SCHEMA_DEFAULT_MATERIAL_FEATURES),
    materialInventory: eqDefault(
      materialInventoryFeatures,
      SCHEMA_DEFAULT_MATERIAL_INVENTORY_FEATURES,
    ),
    warehouseReceipts: eqDefault(
      warehouseReceiptsFeatures,
      SCHEMA_DEFAULT_WAREHOUSE_RECEIPT_FEATURES,
    ),
    warehouseDeliveryNotes: eqDefault(
      warehouseDeliveryNotesFeatures,
      SCHEMA_DEFAULT_WAREHOUSE_DELIVERY_NOTE_FEATURES,
    ),
    lookups: eqDefault(lookupsFeatures, SCHEMA_DEFAULT_LOOKUP_FEATURES),
    lookupV2: eqDefault(lookupV2Features, SCHEMA_DEFAULT_LOOKUP_FEATURES),
    customers: eqDefault(customersFeatures, DEFAULT_CUSTOMER_FEATURES),
    salesOrders: eqDefault(salesOrdersFeatures, DEFAULT_SALES_ORDER_FEATURES),
    quotations: eqDefault(quotationsFeatures, SCHEMA_DEFAULT_QUOTATION_FEATURES),
    deliveryRequests: eqDefault(deliveryRequestsFeatures, DEFAULT_DELIVERY_REQUEST_FEATURES),
    goodsReceipts: eqDefault(goodsReceiptsFeatures, DEFAULT_GOODS_RECEIPT_FEATURES),
    transportOrders: eqDefault(transportOrdersFeatures, DEFAULT_TRANSPORT_ORDER_FEATURES),
    navigation: eqDefault(navigation, defaultNavigation),
    translations: eqDefault(translations, DEFAULT_TRANSLATIONS),
  };

  if (!clientCode) {
    return <Alert color="orange">No client code resolved. Check your configuration.</Alert>;
  }

  if (configLoading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  return (
    <Stack gap="md">
      {!hasConfig && (
        <Text c="dimmed" fz="sm">
          No config found. Edit and save to create one.
        </Text>
      )}

      <Group>
        <Button onClick={handleSave} loading={saving}>
          Save Config
        </Button>
        <Button
          variant="light"
          color="gray"
          onClick={resetAll}
          leftSection={<IconRotate size={14} />}
        >
          Reset All
        </Button>
        <Button variant="light" onClick={handleCopyJson} leftSection={<IconCopy size={14} />}>
          Copy JSON
        </Button>
        <Button
          variant="light"
          color="orange"
          onClick={handleOpenImport}
          leftSection={<IconUpload size={14} />}
        >
          Import JSON
        </Button>
      </Group>

      <Divider my="xs" />

      <Group justify="flex-end" gap="xs">
        <Button
          variant="subtle"
          size="compact-xs"
          leftSection={<IconArrowsMaximize size={14} />}
          onClick={expandAll}
        >
          Expand all
        </Button>
        <Button
          variant="subtle"
          size="compact-xs"
          leftSection={<IconArrowsMinimize size={14} />}
          onClick={collapseAll}
        >
          Collapse all
        </Button>
      </Group>

      <ScrollArea h="80vh">
        <Stack gap="md">
          <CollapsibleSection
            icon={IconAppWindow}
            title="App Info"
            description="Basic information about the application"
            sectionKey="appInfo"
            isDefault={sectionIsDefault.appInfo}
            opened={openSections.has('appInfo')}
            onToggle={toggleSection}
            onReset={resetAppInfo}
          >
            <AppInfoSection
              app={appInfo}
              version={version}
              languageSwitcher={languageSwitcher}
              enablePdfSharing={enablePdfSharing}
              enableStats={enableStats}
              notifyNewVersion={notifyNewVersion}
              onChange={setAppInfo}
              onVersionChange={setVersion}
              onLanguageSwitcherChange={setLanguageSwitcher}
              onEnablePdfSharingChange={setEnablePdfSharing}
              onEnableStatsChange={setEnableStats}
              onNotifyNewVersionChange={setNotifyNewVersion}
            />
          </CollapsibleSection>

          <Divider my="xs" />

          <CollapsibleSection
            icon={IconCalendar}
            title="Display Settings"
            description="Date and time format preferences"
            sectionKey="displaySettings"
            isDefault={sectionIsDefault.displaySettings}
            opened={openSections.has('displaySettings')}
            onToggle={toggleSection}
            onReset={resetDisplaySettings}
          >
            <DisplaySettingsSection
              settings={displaySettings}
              tableDensity={tableDensity}
              onChange={setDisplaySettings}
              onTableDensityChange={setTableDensity}
            />
          </CollapsibleSection>

          <CollapsibleSection
            icon={IconBuilding}
            title="Company Info"
            description="Companies that issue documents (delivery note, quotation) — the first is the default"
            sectionKey="companyInfo"
            isDefault={sectionIsDefault.companyInfo}
            opened={openSections.has('companyInfo')}
            onToggle={toggleSection}
            onReset={resetCompanyInfo}
          >
            <CompanyInfoSection value={companyInfos} onChange={setCompanyInfos} />
          </CollapsibleSection>
          <CollapsibleSection
            icon={IconLayoutSidebar}
            title="Layout"
            description="UI layout configuration"
            sectionKey="layout"
            isDefault={sectionIsDefault.layout}
            opened={openSections.has('layout')}
            onToggle={toggleSection}
            onReset={resetLayout}
          >
            <LayoutSection layout={layout} onChange={setLayout} />
          </CollapsibleSection>
          <CollapsibleSection
            icon={IconBrush}
            title="Theme Config"
            description="Colors and visual styling"
            sectionKey="theme"
            isDefault={sectionIsDefault.theme}
            opened={openSections.has('theme')}
            onToggle={toggleSection}
            onReset={resetTheme}
          >
            <ThemeConfigSection theme={themeConfig} onChange={setThemeConfig} />
          </CollapsibleSection>
          <CollapsibleSection
            icon={IconLanguage}
            title="Languages"
            description="Configure available languages and the default language"
            sectionKey="languages"
            isDefault={sectionIsDefault.languages}
            opened={openSections.has('languages')}
            onToggle={toggleSection}
            onReset={resetLanguages}
          >
            <LanguagesSection
              languages={languages}
              defaultLanguage={defaultLanguage}
              onLanguagesChange={setLanguages}
              onDefaultChange={setDefaultLanguage}
            />
          </CollapsibleSection>
          <Divider my="xs" />

          <CollapsibleSection
            icon={IconShield}
            title="Permission Management"
            description="Control whether this client's employees can view and manage permissions"
            sectionKey="permissionManagement"
            isDefault={sectionIsDefault.permissionManagement}
            opened={openSections.has('permissionManagement')}
            onToggle={toggleSection}
            onReset={resetPermMngt}
          >
            <Stack gap="xs">
              <FeatureToggleRow
                label="Enable Permission Management"
                description="When enabled, employees with the permissionManagement permission can view and edit other employees' permissions"
                checked={permMngtFeatures.enabled}
                onChange={(checked) =>
                  setPermMngtFeatures({ ...permMngtFeatures, enabled: checked })
                }
              />
              {permMngtFeatures.enabled && (
                <FeatureToggleRow
                  label="Restrict to root users"
                  description="When on, only root SSO users can view and edit permissions even if the permissionManagement permission is granted"
                  checked={permMngtFeatures.rootUserOnly}
                  onChange={(checked) =>
                    setPermMngtFeatures({ ...permMngtFeatures, rootUserOnly: checked })
                  }
                />
              )}
              <FeatureToggleRow
                label="Show restricted nav items"
                description="When on, the nav menu shows every enabled module regardless of permission. Restricted pages render an inline 'Restricted access' message inside the layout instead of redirecting to the 403 page."
                checked={permMngtFeatures.showRestrictedItems}
                onChange={(checked) =>
                  setPermMngtFeatures({ ...permMngtFeatures, showRestrictedItems: checked })
                }
              />
            </Stack>
          </CollapsibleSection>
          <CollapsibleSection
            icon={IconShield}
            title="Client Permissions"
            description="Enable permissions for this client. Only enabled (checked) flags are stored — unchecked flags inherit the system default (off)."
            sectionKey="permissions"
            isDefault={sectionIsDefault.permissions}
            opened={openSections.has('permissions')}
            onToggle={toggleSection}
            onReset={resetPermissions}
          >
            <PermissionsConfigSection permissions={permissions} onChange={setPermissions} />
          </CollapsibleSection>
          <CollapsibleSection
            icon={IconUsers}
            title="Department Permissions"
            description="Restrict permissions for this department. Unchecked flags will be denied — checked flags inherit from client level."
            sectionKey="deptPermissions"
            isDefault={sectionIsDefault.deptPermissions}
            opened={openSections.has('deptPermissions')}
            onToggle={toggleSection}
            onReset={resetDeptPermissions}
          >
            <DeptPermissionsSection
              departmentOptions={employeeFeatures.departmentOptions}
              clientPermissions={permissions}
              onDepartmentOptionsChange={(opts) =>
                setEmployeeFeatures({ ...employeeFeatures, departmentOptions: opts })
              }
              languages={languages}
            />
          </CollapsibleSection>

          <Divider my="xs" />

          <CollapsibleSection
            icon={IconShield}
            title="Auth Features"
            description="Toggle authentication features"
            sectionKey="auth"
            isDefault={sectionIsDefault.auth}
            opened={openSections.has('auth')}
            onToggle={toggleSection}
            onReset={resetAuth}
          >
            <AuthFeaturesSection auth={auth} onChange={setAuth} />
          </CollapsibleSection>
          <CollapsibleSection
            icon={IconUsers}
            title="Employee Features"
            description="Toggle employee-related fields and configure dropdown options"
            sectionKey="employees"
            isDefault={sectionIsDefault.employees}
            opened={openSections.has('employees')}
            onToggle={toggleSection}
            onReset={resetEmployees}
          >
            <EmployeeFeaturesSection
              features={employeeFeatures}
              languages={languages}
              onChange={setEmployeeFeatures}
            />
          </CollapsibleSection>
          <CollapsibleSection
            icon={IconHistory}
            title="Activity Log"
            description="Control whether user actions are recorded to the per-employee audit trail"
            sectionKey="activityLog"
            isDefault={sectionIsDefault.activityLog}
            opened={openSections.has('activityLog')}
            onToggle={toggleSection}
            onReset={resetActivityLog}
          >
            <FeatureToggleRow
              label="Enable Activity Log"
              description="When enabled, user actions (create, edit, delete, permission changes, etc.) are queued and flushed to the acting employee's record for audit"
              checked={activityLogFeatures.enabled}
              onChange={(checked) =>
                setActivityLogFeatures({ ...activityLogFeatures, enabled: checked })
              }
            />
          </CollapsibleSection>
          <CollapsibleSection
            icon={IconCoin}
            title="Pricing Management"
            description="Client-wide toggle for showing pricing fields across modules (sales orders, future delivery requests / goods receipts)"
            sectionKey="pricing"
            isDefault={sectionIsDefault.pricing}
            opened={openSections.has('pricing')}
            onToggle={toggleSection}
            onReset={resetPricing}
          >
            <FeatureToggleRow
              label="Enable Pricing Management"
              description="When enabled, unit price, line totals, and order totals are shown across sales-related pages. Turn off for quote-style or non-monetary workflows"
              checked={pricingFeatures.enabled}
              onChange={(checked) => setPricingFeatures({ ...pricingFeatures, enabled: checked })}
            />
          </CollapsibleSection>
          {/* Products — dedicated section (has code-format fields beyond enabled toggle) */}
          <CollapsibleSection
            icon={IconPackage}
            title="Products"
            description="Enable the products module for this client"
            sectionKey="products"
            isDefault={sectionIsDefault.products}
            opened={openSections.has('products')}
            onToggle={toggleSection}
            onReset={resetProducts}
          >
            <Stack gap="sm">
              <FeatureToggleRow
                label="Enable Products"
                description="When enabled, the products section is available in navigation and accessible to users with product permissions"
                checked={productsFeatures.enabled}
                onChange={(checked) =>
                  setProductsFeatures({ ...productsFeatures, enabled: checked })
                }
              />
              <FeatureToggleRow
                label="Price Management"
                description="When enabled, price fields are shown on products. When disabled, price UI is hidden."
                checked={productsFeatures.priceManagement}
                onChange={(checked) =>
                  setProductsFeatures({ ...productsFeatures, priceManagement: checked })
                }
              />
              <FeatureToggleRow
                label="Bulk Import (Products)"
                description="When enabled, the product create page exposes a Bulk Import tab (Excel upload)."
                checked={productsFeatures.bulkImport}
                onChange={(checked) =>
                  setProductsFeatures({ ...productsFeatures, bulkImport: checked })
                }
              />
              <FeatureToggleRow
                label="Technical Specs"
                description="When enabled, the technical specs card (net weight, packaging, shelf life, calories, origin, storage) is shown on the product detail page."
                checked={productsFeatures.technicalSpecs}
                onChange={(checked) =>
                  setProductsFeatures({ ...productsFeatures, technicalSpecs: checked })
                }
              />
              <FeatureToggleRow
                label="Barcode"
                description="When enabled, the barcode card is shown on product detail and form pages, and new products get an auto-generated barcode."
                checked={productsFeatures.barcode}
                onChange={(checked) =>
                  setProductsFeatures({ ...productsFeatures, barcode: checked })
                }
              />
              <FeatureToggleRow
                label="Images"
                description="When enabled, the product detail page exposes the Images tab (upload + gallery) and product thumbnails appear in lists. When disabled, all image UI is hidden."
                checked={productsFeatures.images}
                onChange={(checked) =>
                  setProductsFeatures({ ...productsFeatures, images: checked })
                }
              />
              <FeatureToggleRow
                label="Hide From Inventory List"
                description="When enabled, the product form offers a per-product 'Hide from inventory list' switch, and flagged products are left out of the product-inventory list and its counters. Their stock is untouched — receipts, sales orders and the product's own inventory section keep working. Turning this off shows every product again without clearing the flags."
                checked={productsFeatures.hideFromInventoryList}
                onChange={(checked) =>
                  setProductsFeatures({ ...productsFeatures, hideFromInventoryList: checked })
                }
              />
              <CodeFormatFields
                title="Product Code Format"
                noun="products"
                placeholder="PRD-"
                codePrefix={productsFeatures.codePrefix}
                codePadLength={productsFeatures.codePadLength}
                onPrefixChange={(v) => setProductsFeatures({ ...productsFeatures, codePrefix: v })}
                onPadLengthChange={(v) =>
                  setProductsFeatures({ ...productsFeatures, codePadLength: v })
                }
              />
            </Stack>
          </CollapsibleSection>
          {/* Locations — dedicated section (warehouse master data with code-format fields) */}
          <CollapsibleSection
            icon={IconMapPin}
            title="Locations"
            description="Warehouses, shelves, and pickup points referenced by inventory rows."
            sectionKey="locations"
            isDefault={sectionIsDefault.locations}
            opened={openSections.has('locations')}
            onToggle={toggleSection}
            onReset={resetLocations}
          >
            <Stack gap="sm">
              <FeatureToggleRow
                label="Enable Locations"
                description="When enabled, the locations module is available in navigation and as a selector for inventory."
                checked={locationsFeatures.enabled}
                onChange={(checked) =>
                  setLocationsFeatures({ ...locationsFeatures, enabled: checked })
                }
              />
              <CodeFormatFields
                title="Location Code Format"
                noun="locations"
                placeholder="LOC-"
                codePrefix={locationsFeatures.codePrefix}
                codePadLength={locationsFeatures.codePadLength}
                onPrefixChange={(v) =>
                  setLocationsFeatures({ ...locationsFeatures, codePrefix: v })
                }
                onPadLengthChange={(v) =>
                  setLocationsFeatures({ ...locationsFeatures, codePadLength: v })
                }
              />
            </Stack>
          </CollapsibleSection>
          {/* Vendors — dedicated section (master data with code-format fields) */}
          <CollapsibleSection
            icon={IconTruck}
            title="Vendors"
            description="Enable the vendors module for this client"
            sectionKey="vendors"
            isDefault={sectionIsDefault.vendors}
            opened={openSections.has('vendors')}
            onToggle={toggleSection}
            onReset={resetVendors}
          >
            <Stack gap="sm">
              <FeatureToggleRow
                label="Enable Vendors"
                description="When enabled, the vendors section is available in navigation and accessible to users with vendor permissions"
                checked={vendorsFeatures.enabled}
                onChange={(checked) => setVendorsFeatures({ ...vendorsFeatures, enabled: checked })}
              />
              <CodeFormatFields
                title="Vendor Code Format"
                noun="vendors"
                placeholder="VND-"
                codePrefix={vendorsFeatures.codePrefix}
                codePadLength={vendorsFeatures.codePadLength}
                onPrefixChange={(v) => setVendorsFeatures({ ...vendorsFeatures, codePrefix: v })}
                onPadLengthChange={(v) =>
                  setVendorsFeatures({ ...vendorsFeatures, codePadLength: v })
                }
              />
            </Stack>
          </CollapsibleSection>
          {(
            [
              {
                key: 'productInventory' as const,
                icon: IconPackage,
                features: productInventoryFeatures,
                setFeatures: setProductInventoryFeatures,
                reset: resetProductInventory,
              },
              {
                key: 'trucks' as const,
                icon: IconTruck,
                features: trucksFeatures,
                setFeatures: setTrucksFeatures,
                reset: resetTrucks,
              },
              {
                key: 'oilTanks' as const,
                icon: IconBucketDroplet,
                features: oilTanksFeatures,
                setFeatures: setOilTanksFeatures,
                reset: resetOilTanks,
              },
              {
                key: 'farm' as const,
                icon: IconPlant2,
                features: farmFeatures,
                setFeatures: setFarmFeatures,
                reset: resetFarm,
              },
            ] as const
          ).map((mod) => (
            <CollapsibleSection
              key={mod.key}
              icon={mod.icon}
              title={MODULE_LABELS[`${mod.key}Module`] ?? ''}
              description={MODULE_LABELS[`${mod.key}ModuleDesc`] ?? ''}
              sectionKey={mod.key}
              isDefault={sectionIsDefault[mod.key]}
              opened={openSections.has(mod.key)}
              onToggle={toggleSection}
              onReset={mod.reset}
            >
              <FeatureToggleRow
                label={MODULE_LABELS[`${mod.key}Enabled`] ?? ''}
                description={MODULE_LABELS[`${mod.key}EnabledDesc`] ?? ''}
                checked={mod.features.enabled}
                onChange={(checked) => mod.setFeatures({ ...mod.features, enabled: checked })}
              />
            </CollapsibleSection>
          ))}
          {/* Materials — dedicated section (enabled + optional-field toggles) */}
          <CollapsibleSection
            icon={IconBox}
            title={MODULE_LABELS.materialsModule ?? 'Materials'}
            description={MODULE_LABELS.materialsModuleDesc ?? ''}
            sectionKey="materials"
            isDefault={sectionIsDefault.materials}
            opened={openSections.has('materials')}
            onToggle={toggleSection}
            onReset={resetMaterials}
          >
            <Stack gap="sm">
              <FeatureToggleRow
                label={MODULE_LABELS.materialsEnabled ?? 'Enable Materials'}
                description={MODULE_LABELS.materialsEnabledDesc ?? ''}
                checked={materialsFeatures.enabled}
                onChange={(checked) =>
                  setMaterialsFeatures({ ...materialsFeatures, enabled: checked })
                }
              />
              <FeatureToggleRow
                label="Multiple units per material"
                description="When enabled, a material can carry several units (multi-select, first is primary). When off, a single unit picker."
                checked={materialsFeatures.multiUnit}
                onChange={(checked) =>
                  setMaterialsFeatures({ ...materialsFeatures, multiUnit: checked })
                }
              />
              <Select
                label="Unit source (lookup category)"
                description="Which Meta-data (v2) category the material unit picker draws from. Seed values under that category on the Meta-data (v2) page."
                value={materialsFeatures.unitCategory}
                onChange={(v) =>
                  v &&
                  setMaterialsFeatures({
                    ...materialsFeatures,
                    unitCategory: v as CMngtMaterialFeatures['unitCategory'],
                  })
                }
                data={[
                  { value: 'material-unit', label: 'Material Unit (dedicated)' },
                  { value: 'unit', label: 'Unit (shared with products)' },
                ]}
                allowDeselect={false}
                maw={360}
              />
              <FeatureToggleRow
                label="Description field"
                description="Show a free-text description on the material form + detail."
                checked={materialsFeatures.description}
                onChange={(checked) =>
                  setMaterialsFeatures({ ...materialsFeatures, description: checked })
                }
              />
              <FeatureToggleRow
                label="Specification field"
                description="Show a packaging/specification free-text field (e.g. 25kg/bag)."
                checked={materialsFeatures.specification}
                onChange={(checked) =>
                  setMaterialsFeatures({ ...materialsFeatures, specification: checked })
                }
              />
              <FeatureToggleRow
                label="Internal memo field"
                description="Show an internal note field (operator remarks, not customer-facing)."
                checked={materialsFeatures.memo}
                onChange={(checked) =>
                  setMaterialsFeatures({ ...materialsFeatures, memo: checked })
                }
              />
              <FeatureToggleRow
                label="Cost price field"
                description="Show a reference cost price per base unit on the form + detail."
                checked={materialsFeatures.pricing}
                onChange={(checked) =>
                  setMaterialsFeatures({ ...materialsFeatures, pricing: checked })
                }
              />
              <FeatureToggleRow
                label="Tags field"
                description="Show a free-text tags input for classifying materials."
                checked={materialsFeatures.tags}
                onChange={(checked) =>
                  setMaterialsFeatures({ ...materialsFeatures, tags: checked })
                }
              />
              <FeatureToggleRow
                label="Custom attributes field"
                description="Show an operator-defined key/value attributes editor."
                checked={materialsFeatures.attributes}
                onChange={(checked) =>
                  setMaterialsFeatures({ ...materialsFeatures, attributes: checked })
                }
              />
              <FeatureToggleRow
                label="Images tab"
                description="Show an Images tab (upload + gallery) on the material detail page."
                checked={materialsFeatures.images}
                onChange={(checked) =>
                  setMaterialsFeatures({ ...materialsFeatures, images: checked })
                }
              />
              <FeatureToggleRow
                label="Minimum stock field"
                description="Show a minimum-stock threshold (base-unit qty) on the form + detail. With inventory folded in, adds a low-stock list filter + amber highlight."
                checked={materialsFeatures.minimumStock}
                onChange={(checked) =>
                  setMaterialsFeatures({ ...materialsFeatures, minimumStock: checked })
                }
              />
              <FeatureToggleRow
                label="Bulk import (Excel)"
                description="Add a Bulk import tab to the create form: download a template built from this client's own catalogue, then upload rows. Insert-only — an existing material code is skipped, never overwritten."
                checked={materialsFeatures.bulkImport}
                onChange={(checked) =>
                  setMaterialsFeatures({ ...materialsFeatures, bulkImport: checked })
                }
              />
            </Stack>
          </CollapsibleSection>
          {/* Material Inventory — dedicated section (enabled + view-density toggle) */}
          <CollapsibleSection
            icon={IconBox}
            title={MODULE_LABELS.materialInventoryModule ?? 'Material Inventory'}
            description={MODULE_LABELS.materialInventoryModuleDesc ?? ''}
            sectionKey="materialInventory"
            isDefault={sectionIsDefault.materialInventory}
            opened={openSections.has('materialInventory')}
            onToggle={toggleSection}
            onReset={resetMaterialInventory}
          >
            <FeatureToggleRow
              label={MODULE_LABELS.materialInventoryEnabled ?? 'Enable Material Inventory'}
              description={MODULE_LABELS.materialInventoryEnabledDesc ?? ''}
              checked={materialInventoryFeatures.enabled}
              onChange={(checked) =>
                setMaterialInventoryFeatures({ ...materialInventoryFeatures, enabled: checked })
              }
            />
          </CollapsibleSection>
          {/* Warehouse Receipt (IN) — dedicated section (partitioned doc with code-format fields) */}
          <CollapsibleSection
            icon={IconPackageImport}
            title="Warehouse Receipt (IN)"
            description="Simple goods-in documents. Enable per client."
            sectionKey="warehouseReceipts"
            isDefault={sectionIsDefault.warehouseReceipts}
            opened={openSections.has('warehouseReceipts')}
            onToggle={toggleSection}
            onReset={resetWarehouseReceipts}
          >
            <Stack gap="sm">
              <FeatureToggleRow
                label="Enable Warehouse Receipts"
                description="When enabled, the Warehouse Receipt (IN) section is available in navigation and accessible to users with the matching permission."
                checked={warehouseReceiptsFeatures.enabled}
                onChange={(checked) =>
                  setWarehouseReceiptsFeatures({ ...warehouseReceiptsFeatures, enabled: checked })
                }
              />
              <CodeFormatFields
                title="Receipt Code Format"
                noun="receipts"
                placeholder="WR-"
                codePrefix={warehouseReceiptsFeatures.codePrefix}
                codePadLength={warehouseReceiptsFeatures.codePadLength}
                onPrefixChange={(v) =>
                  setWarehouseReceiptsFeatures({ ...warehouseReceiptsFeatures, codePrefix: v })
                }
                onPadLengthChange={(v) =>
                  setWarehouseReceiptsFeatures({ ...warehouseReceiptsFeatures, codePadLength: v })
                }
              />
              <FeatureToggleRow
                label="Status & inventory posting"
                description="Adds a draft → confirmed status. Confirming a receipt posts its lines to material inventory (increments on-hand). Confirm is final — a confirmed doc is locked."
                checked={warehouseReceiptsFeatures.postInventory}
                onChange={(checked) =>
                  setWarehouseReceiptsFeatures({
                    ...warehouseReceiptsFeatures,
                    postInventory: checked,
                  })
                }
              />
            </Stack>
          </CollapsibleSection>
          {/* Warehouse Delivery Note (OUT) — dedicated section (partitioned doc with code-format fields) */}
          <CollapsibleSection
            icon={IconTransfer}
            title="Warehouse Delivery Note (OUT)"
            description="Simple goods-out documents. Enable per client."
            sectionKey="warehouseDeliveryNotes"
            isDefault={sectionIsDefault.warehouseDeliveryNotes}
            opened={openSections.has('warehouseDeliveryNotes')}
            onToggle={toggleSection}
            onReset={resetWarehouseDeliveryNotes}
          >
            <Stack gap="sm">
              <FeatureToggleRow
                label="Enable Warehouse Delivery Notes"
                description="When enabled, the Warehouse Delivery Note (OUT) section is available in navigation and accessible to users with the matching permission."
                checked={warehouseDeliveryNotesFeatures.enabled}
                onChange={(checked) =>
                  setWarehouseDeliveryNotesFeatures({
                    ...warehouseDeliveryNotesFeatures,
                    enabled: checked,
                  })
                }
              />
              <CodeFormatFields
                title="Delivery Note Code Format"
                noun="delivery notes"
                placeholder="DN-"
                codePrefix={warehouseDeliveryNotesFeatures.codePrefix}
                codePadLength={warehouseDeliveryNotesFeatures.codePadLength}
                onPrefixChange={(v) =>
                  setWarehouseDeliveryNotesFeatures({
                    ...warehouseDeliveryNotesFeatures,
                    codePrefix: v,
                  })
                }
                onPadLengthChange={(v) =>
                  setWarehouseDeliveryNotesFeatures({
                    ...warehouseDeliveryNotesFeatures,
                    codePadLength: v,
                  })
                }
              />
              <FeatureToggleRow
                label="Status & inventory posting"
                description="Adds a draft → confirmed status. Confirming a delivery note posts its lines to material inventory (decrements on-hand; may go negative / back-ordered). Confirm is final — a confirmed doc is locked."
                checked={warehouseDeliveryNotesFeatures.postInventory}
                onChange={(checked) =>
                  setWarehouseDeliveryNotesFeatures({
                    ...warehouseDeliveryNotesFeatures,
                    postInventory: checked,
                  })
                }
              />
            </Stack>
          </CollapsibleSection>
          {/* Lookups — toggle + category checkboxes */}
          <CollapsibleSection
            icon={IconCategory2}
            title="Lookups"
            description="Dropdown options and reference values (product categories, units, tags, etc.)."
            sectionKey="lookups"
            isDefault={sectionIsDefault.lookups}
            opened={openSections.has('lookups')}
            onToggle={toggleSection}
            onReset={resetLookups}
          >
            <Stack gap="sm">
              <FeatureToggleRow
                label="Enable Lookups"
                description="When enabled, the lookups section is available in navigation for managing dropdown options and reference values."
                checked={lookupsFeatures.enabled}
                onChange={(checked) => setLookupsFeatures({ ...lookupsFeatures, enabled: checked })}
              />
              {lookupsFeatures.enabled && (
                <Stack gap="xs" px="xs">
                  <Text fz="xs" c="dimmed" fw={500}>
                    Enabled Categories
                  </Text>
                  {LOOKUP_CATEGORIES.map((cat) => {
                    const checked =
                      lookupsFeatures.enabledCategories.length === 0 ||
                      lookupsFeatures.enabledCategories.includes(cat.id);
                    return (
                      <Checkbox
                        key={cat.id}
                        label={LOOKUP_CATEGORY_LABELS[cat.labelKey] ?? cat.labelKey}
                        checked={checked}
                        onChange={() => {
                          const allIds = LOOKUP_CATEGORIES.map((c) => c.id);

                          if (lookupsFeatures.enabledCategories.length === 0) {
                            setLookupsFeatures({
                              ...lookupsFeatures,
                              enabledCategories: allIds.filter((id) => id !== cat.id),
                            });
                          } else {
                            const next = checked
                              ? lookupsFeatures.enabledCategories.filter((id) => id !== cat.id)
                              : [...lookupsFeatures.enabledCategories, cat.id];

                            setLookupsFeatures({
                              ...lookupsFeatures,
                              enabledCategories: next.length === allIds.length ? [] : next,
                            });
                          }
                        }}
                      />
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </CollapsibleSection>
          {/* Lookups v2 — meta-data register on the single-mode-records stack */}
          <CollapsibleSection
            icon={IconCategory2}
            title="Lookups v2"
            description="Meta-data register (units, etc.) on the new single-mode-records stack. Manage via the Meta-data (v2) page."
            sectionKey="lookupV2"
            isDefault={sectionIsDefault.lookupV2}
            opened={openSections.has('lookupV2')}
            onToggle={toggleSection}
            onReset={resetLookupV2}
          >
            <Stack gap="sm">
              <FeatureToggleRow
                label="Enable Lookups v2"
                description="When enabled, the Meta-data (v2) section is available in navigation and accessible to users with the matching permission."
                checked={lookupV2Features.enabled}
                onChange={(checked) =>
                  setLookupV2Features({ ...lookupV2Features, enabled: checked })
                }
              />
              {lookupV2Features.enabled && (
                <Stack gap="xs" px="xs">
                  <Text fz="xs" c="dimmed" fw={500}>
                    Enabled Categories
                  </Text>
                  {LOOKUP_V2_CATEGORIES.map((cat) => {
                    const checked =
                      lookupV2Features.enabledCategories.length === 0 ||
                      lookupV2Features.enabledCategories.includes(cat.id);
                    return (
                      <Checkbox
                        key={cat.id}
                        label={LOOKUP_CATEGORY_LABELS[cat.labelKey] ?? cat.labelKey}
                        checked={checked}
                        onChange={() => {
                          const allIds = LOOKUP_V2_CATEGORIES.map((c) => c.id);

                          if (lookupV2Features.enabledCategories.length === 0) {
                            setLookupV2Features({
                              ...lookupV2Features,
                              enabledCategories: allIds.filter((id) => id !== cat.id),
                            });
                          } else {
                            const next = checked
                              ? lookupV2Features.enabledCategories.filter((id) => id !== cat.id)
                              : [...lookupV2Features.enabledCategories, cat.id];

                            setLookupV2Features({
                              ...lookupV2Features,
                              enabledCategories: next.length === allIds.length ? [] : next,
                            });
                          }
                        }}
                      />
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </CollapsibleSection>
          {/* Customers — enable + shipping-address + code-format knobs */}
          <CollapsibleSection
            icon={IconShoppingCart}
            title="Customer"
            description="Enable the customers module for this client"
            sectionKey="customers"
            isDefault={sectionIsDefault.customers}
            opened={openSections.has('customers')}
            onToggle={toggleSection}
            onReset={resetCustomers}
          >
            <Stack gap="sm">
              <FeatureToggleRow
                label="Enable Customers"
                description="When enabled, the customers section is available in navigation and accessible to users with customer permissions"
                checked={customersFeatures.enabled}
                onChange={(checked) =>
                  setCustomersFeatures({ ...customersFeatures, enabled: checked })
                }
              />
              <FeatureToggleRow
                label="Delivery Address Management"
                description="When enabled, customers can have multiple delivery (shipping) addresses on the form and detail pages. The single billing address is always available"
                checked={customersFeatures.shippingAddress}
                onChange={(checked) =>
                  setCustomersFeatures({ ...customersFeatures, shippingAddress: checked })
                }
              />
              <CodeFormatFields
                title="Customer Code Format"
                noun="customers"
                placeholder="CST-"
                codePrefix={customersFeatures.codePrefix}
                codePadLength={customersFeatures.codePadLength}
                onPrefixChange={(v) =>
                  setCustomersFeatures({ ...customersFeatures, codePrefix: v })
                }
                onPadLengthChange={(v) =>
                  setCustomersFeatures({ ...customersFeatures, codePadLength: v })
                }
              />
            </Stack>
          </CollapsibleSection>
          {/* Sales Orders — dedicated section with status options */}
          <CollapsibleSection
            icon={IconFileText}
            title="Sales Orders"
            description="Enable the Sales Orders module for this client"
            sectionKey="salesOrders"
            isDefault={sectionIsDefault.salesOrders}
            opened={openSections.has('salesOrders')}
            onToggle={toggleSection}
            onReset={resetSalesOrders}
          >
            <Stack gap="md">
              <FeatureToggleRow
                label="Enable Sales Orders"
                description="When enabled, the Sales Orders section is available in navigation and accessible to users with sales order permissions"
                checked={salesOrdersFeatures.enabled}
                onChange={(checked) =>
                  setSalesOrdersFeatures({ ...salesOrdersFeatures, enabled: checked })
                }
              />

              {/* Extra ("spare") delivery quantity. Schema-only flag: it's
                      not in the (under-specified) kits `CMngtSalesOrderFeatures`
                      mirror — same as `allowAdditionalDR` / `shortagePolicy` —
                      so it's read/written via a local cast. It still round-trips
                      through the config JSON (load/save spread the whole object)
                      and is consumed via `isExtraDeliveryQuantityAllowed()`. */}
              <FeatureToggleRow
                label="Allow extra (spare) delivery quantity"
                description={
                  'Adds a per-line “extra qty” input on the order form. Inventory deducts ordered + extra (e.g. order 1000, ship 1002 spares); pricing stays on the ordered quantity. Standalone lines only.'
                }
                checked={
                  (salesOrdersFeatures as { allowExtraDeliveryQuantity?: boolean })
                    .allowExtraDeliveryQuantity ?? false
                }
                onChange={(checked) =>
                  setSalesOrdersFeatures({
                    ...salesOrdersFeatures,
                    allowExtraDeliveryQuantity: checked,
                  } as CMngtSalesOrderFeatures)
                }
              />

              {salesOrdersFeatures.enabled && (
                <>
                  <CodeFormatFields
                    title="Sales Order Code Format"
                    noun="sales orders"
                    placeholder="SO-"
                    codePrefix={salesOrdersFeatures.codePrefix}
                    codePadLength={salesOrdersFeatures.codePadLength}
                    onPrefixChange={(v) =>
                      setSalesOrdersFeatures({ ...salesOrdersFeatures, codePrefix: v })
                    }
                    onPadLengthChange={(v) =>
                      setSalesOrdersFeatures({ ...salesOrdersFeatures, codePadLength: v })
                    }
                  />
                  <SalesOrderConfigInvariantAlert
                    features={salesOrdersFeatures}
                    knownDepartments={
                      new Set((employeeFeatures.departmentOptions ?? []).map((d) => d.value))
                    }
                  />
                  <SalesOrderStatusOptionEditor
                    options={salesOrdersFeatures.statusOptions}
                    onChange={(opts) =>
                      setSalesOrdersFeatures((prev) => ({
                        ...prev,
                        statusOptions: opts,
                        statusTransitions: reconcileTransitions(
                          prev.statusOptions,
                          opts,
                          prev.statusTransitions ?? {},
                        ),
                      }))
                    }
                    languages={languages}
                  />
                  <StatusTransitionMatrixEditor
                    statusOptions={salesOrdersFeatures.statusOptions}
                    transitions={salesOrdersFeatures.statusTransitions ?? {}}
                    onChange={(tr) =>
                      setSalesOrdersFeatures({ ...salesOrdersFeatures, statusTransitions: tr })
                    }
                  />
                  <StatusAllowedDepartmentsMatrixEditor
                    statusOptions={salesOrdersFeatures.statusOptions}
                    departmentOptions={departmentMultiSelectData}
                    onChange={(opts) =>
                      setSalesOrdersFeatures({ ...salesOrdersFeatures, statusOptions: opts })
                    }
                  />
                  {/* Schema-only field (not in the under-specified kits
                      `CMngtSalesOrderFeatures` mirror — same as
                      `allowExtraDeliveryQuantity`), so read/written via a local
                      cast. It round-trips through the config JSON because
                      load/save spread the whole object, and is consumed via
                      `getSalesOrderDefaultListStatuses()`. */}
                  <MultiSelect
                    label="Default List Statuses"
                    description="Statuses the Sales Orders list opens narrowed to, so operators land on the working set instead of every order ever raised. Leave empty to show all statuses. Operators can still widen to all, and 'Clear filters' comes back to this set."
                    placeholder="All statuses (no default narrowing)"
                    data={salesOrderStatusMultiSelectData}
                    value={
                      (salesOrdersFeatures as { defaultListStatuses?: string[] })
                        .defaultListStatuses ?? []
                    }
                    onChange={(v) =>
                      setSalesOrdersFeatures({
                        ...salesOrdersFeatures,
                        defaultListStatuses: v,
                      } as CMngtSalesOrderFeatures)
                    }
                    searchable
                    clearable
                    nothingFoundMessage="No statuses configured yet — add them under Sales Order Status Options above."
                  />
                  <ConfigOptionEditor
                    options={salesOrdersFeatures.deliveryMethodOptions ?? []}
                    onChange={(opts) =>
                      setSalesOrdersFeatures({
                        ...salesOrdersFeatures,
                        deliveryMethodOptions: opts,
                      })
                    }
                    languages={languages}
                    label="Delivery Method Options"
                  />
                  <SalesOrderTagOptionEditor
                    options={salesOrdersFeatures.tagOptions ?? []}
                    onChange={(opts) =>
                      setSalesOrdersFeatures({ ...salesOrdersFeatures, tagOptions: opts })
                    }
                    languages={languages}
                  />
                  <MultiSelect
                    label="PIC Departments"
                    description="Restrict the SO PIC picker to employees in these departments. Leave empty to allow any active employee."
                    placeholder="Any active employee (no restriction)"
                    data={departmentMultiSelectData}
                    value={salesOrdersFeatures.picDepartments ?? []}
                    onChange={(v) =>
                      setSalesOrdersFeatures({ ...salesOrdersFeatures, picDepartments: v })
                    }
                    searchable
                    clearable
                    nothingFoundMessage="No departments configured. Add departments under Employees → Department options."
                  />
                  <TagsInput
                    label="Delivery Package Size Options"
                    description="Preset sizes suggested in the SO detail 'Package Size' field (editing gated by the salesOrder.canEditDeliveryPackageSize permission). Free text is still allowed — these are only suggestions. Press Enter to add."
                    placeholder="e.g. Thùng nhỏ, Thùng lớn, 30x40x50cm"
                    value={salesOrdersFeatures.deliveryPackageSizeOptions ?? []}
                    onChange={(v) =>
                      setSalesOrdersFeatures({
                        ...salesOrdersFeatures,
                        deliveryPackageSizeOptions: v,
                      })
                    }
                    clearable
                  />
                </>
              )}
            </Stack>
          </CollapsibleSection>
          {/* Quotations — behaviour flags only; the module itself is never gated
              (it rides on salesOrder permissions + the nav item). */}
          <CollapsibleSection
            icon={IconFileInvoice}
            title="Quotations"
            description="Behaviour options for the quotation module (the module itself is always on, gated by sales-order permissions and the nav item)"
            sectionKey="quotations"
            isDefault={sectionIsDefault.quotations}
            opened={openSections.has('quotations')}
            onToggle={toggleSection}
            onReset={resetQuotations}
          >
            <FeatureToggleRow
              label="Price by Minimum Order Quantity"
              description="Lets the operator quote a price ladder per line (from 100 → 90,000; from 500 → 85,000). The line's unit price auto-fills from the quantity typed, and the ladder prints under the item on the quotation PDF. Off hides the editor and the ladder; tiers already saved are kept untouched"
              checked={quotationsFeatures.priceByMinQuantity}
              onChange={(checked) =>
                setQuotationsFeatures({ ...quotationsFeatures, priceByMinQuantity: checked })
              }
            />
          </CollapsibleSection>
          {/* Delivery Requests — dedicated section with status options */}
          <CollapsibleSection
            icon={IconTruck}
            title="Delivery Requests"
            description="Enable the Delivery Requests module for this client"
            sectionKey="deliveryRequests"
            isDefault={sectionIsDefault.deliveryRequests}
            opened={openSections.has('deliveryRequests')}
            onToggle={toggleSection}
            onReset={resetDeliveryRequests}
          >
            <Stack gap="md">
              <FeatureToggleRow
                label="Enable Delivery Requests"
                description="When enabled, the Delivery section is available in navigation and accessible to users with delivery request permissions"
                checked={deliveryRequestsFeatures.enabled}
                onChange={(checked) =>
                  setDeliveryRequestsFeatures({ ...deliveryRequestsFeatures, enabled: checked })
                }
              />

              {deliveryRequestsFeatures.enabled && (
                <>
                  <CodeFormatFields
                    title="Delivery Request Code Format"
                    noun="delivery requests"
                    placeholder="DR-"
                    codePrefix={deliveryRequestsFeatures.codePrefix}
                    codePadLength={deliveryRequestsFeatures.codePadLength}
                    onPrefixChange={(v) =>
                      setDeliveryRequestsFeatures({ ...deliveryRequestsFeatures, codePrefix: v })
                    }
                    onPadLengthChange={(v) =>
                      setDeliveryRequestsFeatures({ ...deliveryRequestsFeatures, codePadLength: v })
                    }
                  />
                  <DeliveryRequestConfigInvariantAlert features={deliveryRequestsFeatures} />
                  <DeliveryRequestStatusOptionEditor
                    options={deliveryRequestsFeatures.statusOptions}
                    onChange={(opts) =>
                      setDeliveryRequestsFeatures((prev) => ({
                        ...prev,
                        statusOptions: opts,
                        statusTransitions: reconcileTransitions(
                          prev.statusOptions,
                          opts,
                          prev.statusTransitions ?? {},
                        ),
                      }))
                    }
                    languages={languages}
                  />
                  <StatusTransitionMatrixEditor
                    statusOptions={deliveryRequestsFeatures.statusOptions}
                    transitions={deliveryRequestsFeatures.statusTransitions ?? {}}
                    onChange={(tr) =>
                      setDeliveryRequestsFeatures({
                        ...deliveryRequestsFeatures,
                        statusTransitions: tr,
                      })
                    }
                  />
                  {/* Schema-only field (absent from the kits
                      `CMngtDeliveryRequestFeatures` mirror), so read/written via
                      a local cast; it round-trips because load/save spread the
                      whole object. Consumed via
                      `getDeliveryRequestDefaultListStatuses()`. */}
                  <MultiSelect
                    label="Default List Statuses"
                    description="Statuses the Delivery Requests list opens narrowed to, so operators land on the working set instead of the whole 90-day window. Leave empty to show all statuses. Operators can still widen to all, and 'Clear filters' comes back to this set."
                    placeholder="All statuses (no default narrowing)"
                    data={deliveryRequestStatusMultiSelectData}
                    value={
                      (deliveryRequestsFeatures as { defaultListStatuses?: string[] })
                        .defaultListStatuses ?? []
                    }
                    onChange={(v) =>
                      setDeliveryRequestsFeatures({
                        ...deliveryRequestsFeatures,
                        defaultListStatuses: v,
                      } as CMngtDeliveryRequestFeatures)
                    }
                    searchable
                    clearable
                    nothingFoundMessage="No statuses configured yet — add them under Delivery Request Status Options above."
                  />
                  <MultiSelect
                    label="Driver Departments"
                    description="Restrict the DR driver picker to employees in these departments. Leave empty to allow any active employee."
                    placeholder="Any active employee (no restriction)"
                    data={departmentMultiSelectData}
                    value={deliveryRequestsFeatures.driverDepartments ?? []}
                    onChange={(v) =>
                      setDeliveryRequestsFeatures({
                        ...deliveryRequestsFeatures,
                        driverDepartments: v,
                      })
                    }
                    searchable
                    clearable
                    nothingFoundMessage="No departments configured. Add departments under Employees → Department options."
                  />

                  {/* Return shipment — generic DR type (inbound, SO-linked). */}
                  <FeatureToggleRow
                    label="Enable Return Shipments"
                    description='Adds a "Create return shipment" button on the sales-order detail page. A return is an inbound delivery request linked back to the order, for goods coming back from a customer.'
                    checked={deliveryRequestsFeatures.returnShipment?.enabled ?? false}
                    onChange={(checked) =>
                      setDeliveryRequestsFeatures({
                        ...deliveryRequestsFeatures,
                        returnShipment: {
                          enabled: checked,
                          autoRestockOnComplete:
                            deliveryRequestsFeatures.returnShipment?.autoRestockOnComplete ?? false,
                        },
                      })
                    }
                  />
                  {deliveryRequestsFeatures.returnShipment?.enabled && (
                    <FeatureToggleRow
                      label="Auto-restock returns on completion"
                      description="Default for a return's Update-inventory toggle: when a return completes, its lines are added back to on-hand at the picked receiving location. Operators can still turn this off per return."
                      checked={
                        deliveryRequestsFeatures.returnShipment?.autoRestockOnComplete ?? false
                      }
                      onChange={(checked) =>
                        setDeliveryRequestsFeatures({
                          ...deliveryRequestsFeatures,
                          returnShipment: {
                            enabled: deliveryRequestsFeatures.returnShipment?.enabled ?? false,
                            autoRestockOnComplete: checked,
                          },
                        })
                      }
                    />
                  )}
                </>
              )}
            </Stack>
          </CollapsibleSection>
          {/* Goods Receipts — toggle + code-format fields */}
          <CollapsibleSection
            icon={IconPackageImport}
            title="Goods Receipts"
            description="Vendor receipts that flow into product/material inventory."
            sectionKey="goodsReceipts"
            isDefault={sectionIsDefault.goodsReceipts}
            opened={openSections.has('goodsReceipts')}
            onToggle={toggleSection}
            onReset={resetGoodsReceipts}
          >
            <Stack gap="sm">
              <FeatureToggleRow
                label="Enable Goods Receipts"
                description="When enabled, the Goods Receipts section is available in navigation and accessible to users with goods-receipt permissions"
                checked={goodsReceiptsFeatures.enabled}
                onChange={(checked) =>
                  setGoodsReceiptsFeatures({ ...goodsReceiptsFeatures, enabled: checked })
                }
              />

              <FeatureToggleRow
                label="Allow non-inventory products"
                description="When enabled, products marked 'no inventory' can be added as receipt lines. They still never move stock — the line is a paper record only. Off by default."
                checked={goodsReceiptsFeatures.allowNoInventoryProducts}
                onChange={(checked) =>
                  setGoodsReceiptsFeatures({
                    ...goodsReceiptsFeatures,
                    allowNoInventoryProducts: checked,
                  })
                }
              />

              <CodeFormatFields
                title="Goods Receipt Code Format"
                noun="goods receipts"
                placeholder="PNK-"
                codePrefix={goodsReceiptsFeatures.codePrefix}
                codePadLength={goodsReceiptsFeatures.codePadLength}
                onPrefixChange={(v) =>
                  setGoodsReceiptsFeatures({ ...goodsReceiptsFeatures, codePrefix: v })
                }
                onPadLengthChange={(v) =>
                  setGoodsReceiptsFeatures({ ...goodsReceiptsFeatures, codePadLength: v })
                }
              />

              <MultiSelect
                label="PIC Departments"
                description="Restrict the GR PIC picker to employees in these departments. Leave empty to allow any active employee."
                placeholder="Any active employee (no restriction)"
                data={departmentMultiSelectData}
                value={goodsReceiptsFeatures.picDepartments ?? []}
                onChange={(v) =>
                  setGoodsReceiptsFeatures({ ...goodsReceiptsFeatures, picDepartments: v })
                }
                searchable
                clearable
                nothingFoundMessage="No departments configured. Add departments under Employees → Department options."
              />

              {/* GR statuses are a fixed vocabulary (draft/received/cancelled),
                  so the options are static — no status editor above to feed
                  from, unlike SO/DR/TO. Consumed via
                  `getGoodsReceiptDefaultListStatuses()`. */}
              <MultiSelect
                label="Default List Statuses"
                description="Statuses the Goods Receipts list opens narrowed to, so operators land on the working set instead of every receipt in the window. Leave empty to show all statuses. Operators can still widen to all, and 'Clear filters' comes back to this set."
                placeholder="All statuses (no default narrowing)"
                data={goodsReceiptStatusMultiSelectData}
                value={goodsReceiptsFeatures.defaultListStatuses ?? []}
                onChange={(v) =>
                  setGoodsReceiptsFeatures({ ...goodsReceiptsFeatures, defaultListStatuses: v })
                }
                clearable
              />
            </Stack>
          </CollapsibleSection>
          {/* Transport Orders — client-specific trucking/freight module */}
          <CollapsibleSection
            icon={IconTruck}
            title="Transport Orders"
            description="Client-specific container-trucking / freight orders (logistics operators)."
            sectionKey="transportOrders"
            isDefault={sectionIsDefault.transportOrders}
            opened={openSections.has('transportOrders')}
            onToggle={toggleSection}
            onReset={resetTransportOrders}
          >
            <Stack gap="md">
              <FeatureToggleRow
                label="Enable Transport Orders"
                description="When enabled, the Transport Orders section is available in navigation (subject to per-user permissions). Off by default — turn on only for trucking / logistics clients."
                checked={transportOrdersFeatures.enabled}
                onChange={(checked) =>
                  setTransportOrdersFeatures({ ...transportOrdersFeatures, enabled: checked })
                }
              />

              {transportOrdersFeatures.enabled && (
                <>
                  <CodeFormatFields
                    title="Transport Order Code Format"
                    noun="transport orders"
                    placeholder="VC-"
                    codePrefix={transportOrdersFeatures.codePrefix}
                    codePadLength={transportOrdersFeatures.codePadLength}
                    onPrefixChange={(v) =>
                      setTransportOrdersFeatures({ ...transportOrdersFeatures, codePrefix: v })
                    }
                    onPadLengthChange={(v) =>
                      setTransportOrdersFeatures({ ...transportOrdersFeatures, codePadLength: v })
                    }
                  />
                  {/* Deliberately NOT a second `CodeFormatFields`: that card
                      pairs a prefix with its own padding, and a route reuses the
                      order's padding above. Two "Number Padding" inputs writing
                      one value is a trap, so the route contributes only its
                      prefix. */}
                  <Paper p="xs" withBorder>
                    <Text fz="sm" fw={600} mb={4}>
                      Route Code Format
                    </Text>
                    <Text fz="xs" c="dimmed" mb="xs">
                      {`Auto-generated codes for saved routes (the route price list). A flat lifetime sequence, unlike the day-based order code above; it reuses the padding set there. Preview: ${
                        transportOrdersFeatures.routeCodePrefix ?? 'TUYEN-'
                      }${String(1).padStart(Math.max(0, transportOrdersFeatures.codePadLength), '0')}`}
                    </Text>
                    <TextInput
                      label="Code Prefix"
                      value={transportOrdersFeatures.routeCodePrefix ?? 'TUYEN-'}
                      onChange={(e) =>
                        setTransportOrdersFeatures({
                          ...transportOrdersFeatures,
                          routeCodePrefix: e.currentTarget.value,
                        })
                      }
                      size="sm"
                      placeholder="TUYEN-"
                    />
                  </Paper>
                  {/* Which vehicle types haul no container. The app cannot work
                      this out — `truck-type` is a per-client lookup of free
                      strings — and it is stated as the EXCLUSION list so that
                      empty means "unchanged", and adding a new container type
                      needs no edit here. */}
                  <Paper p="xs" withBorder>
                    <Text fz="sm" fw={600} mb={4}>
                      Vehicle Types Without Containers
                    </Text>
                    <Text fz="xs" c="dimmed" mb="xs">
                      Pick the vehicle types that do not haul containers (e.g. Xe Tải). The
                      &ldquo;Container type&rdquo; field is hidden — and cleared — on routes and
                      orders using them. Leave empty if every type carries containers; nothing
                      changes then.
                    </Text>
                    <MultiSelect
                      data={truckTypeOptions}
                      value={transportOrdersFeatures.nonContainerTruckTypes ?? []}
                      onChange={(v) =>
                        setTransportOrdersFeatures({
                          ...transportOrdersFeatures,
                          nonContainerTruckTypes: v,
                        })
                      }
                      placeholder={
                        truckTypeOptions.length === 0
                          ? 'No vehicle types configured under Meta-data'
                          : 'None — every type carries containers'
                      }
                      size="sm"
                      searchable
                      clearable
                    />
                  </Paper>
                  <TransportOrderConfigInvariantAlert
                    features={transportOrdersFeatures}
                    knownDepartments={
                      new Set((employeeFeatures.departmentOptions ?? []).map((d) => d.value))
                    }
                  />
                  <TransportOrderStatusOptionEditor
                    options={transportOrdersFeatures.statusOptions}
                    onChange={(opts) =>
                      setTransportOrdersFeatures((prev) => ({
                        ...prev,
                        statusOptions: opts,
                        statusTransitions: reconcileTransitions(
                          prev.statusOptions,
                          opts,
                          prev.statusTransitions ?? {},
                        ),
                      }))
                    }
                    languages={languages}
                  />
                  <StatusTransitionMatrixEditor
                    statusOptions={transportOrdersFeatures.statusOptions}
                    transitions={transportOrdersFeatures.statusTransitions ?? {}}
                    onChange={(tr) =>
                      setTransportOrdersFeatures({
                        ...transportOrdersFeatures,
                        statusTransitions: tr,
                      })
                    }
                  />
                  <StatusAllowedDepartmentsMatrixEditor
                    statusOptions={transportOrdersFeatures.statusOptions}
                    departmentOptions={departmentMultiSelectData}
                    onChange={(opts) =>
                      setTransportOrdersFeatures({
                        ...transportOrdersFeatures,
                        statusOptions: opts,
                      })
                    }
                  />
                  {/* Schema-only field (absent from the kits
                      `CMngtTransportOrderFeatures` mirror), so read/written via
                      a local cast; it round-trips because load/save spread the
                      whole object. Consumed via
                      `getTransportOrderDefaultListStatuses()`. */}
                  <MultiSelect
                    label="Default List Statuses"
                    description="Statuses the Transport Orders list opens narrowed to, so operators land on the working set instead of every order in the window. Leave empty to show all statuses. Operators can still widen to all, and 'Clear filters' comes back to this set."
                    placeholder="All statuses (no default narrowing)"
                    data={transportOrderStatusMultiSelectData}
                    value={
                      (transportOrdersFeatures as { defaultListStatuses?: string[] })
                        .defaultListStatuses ?? []
                    }
                    onChange={(v) =>
                      setTransportOrdersFeatures({
                        ...transportOrdersFeatures,
                        defaultListStatuses: v,
                      } as CMngtTransportOrderFeatures)
                    }
                    searchable
                    clearable
                    nothingFoundMessage="No statuses configured yet — add them under the status options above."
                  />
                  <MultiSelect
                    label="Driver Departments"
                    description="Restrict the driver picker to employees in these departments. Leave empty to allow any active employee."
                    placeholder="Any active employee (no restriction)"
                    data={departmentMultiSelectData}
                    value={transportOrdersFeatures.driverDepartments ?? []}
                    onChange={(v) =>
                      setTransportOrdersFeatures({
                        ...transportOrdersFeatures,
                        driverDepartments: v,
                      })
                    }
                    searchable
                    clearable
                    nothingFoundMessage="No departments configured. Add departments under Employees → Department options."
                  />
                  {/* Schema-only field like `defaultListStatuses` above (absent
                      from the kits mirror) — read/written via a local cast; it
                      round-trips because load/save spread the whole object.
                      Consumed via `resolveCustomerReportType()`. */}
                  <CustomerReportTypeEditor
                    assignments={
                      (transportOrdersFeatures as { customerReportTypes?: Record<string, number> })
                        .customerReportTypes ?? {}
                    }
                    onChange={(next) =>
                      setTransportOrdersFeatures({
                        ...transportOrdersFeatures,
                        customerReportTypes: next,
                      } as CMngtTransportOrderFeatures)
                    }
                  />
                </>
              )}
            </Stack>
          </CollapsibleSection>
          <Divider my="xs" />
          <CollapsibleSection
            icon={IconNavigation}
            title="Navigation"
            description="Navigation menu structure (JSON)"
            sectionKey="navigation"
            isDefault={sectionIsDefault.navigation}
            opened={openSections.has('navigation')}
            onToggle={toggleSection}
            onReset={resetNavigation}
          >
            <NavigationSection navigation={navigation} onChange={setNavigation} />
          </CollapsibleSection>
          <Divider my="xs" />
          <CollapsibleSection
            icon={IconTransfer}
            title="Translations Override"
            description="Per-language i18n overrides (deep-merged into translations at startup). Structure mirrors locale JSON files."
            sectionKey="translations"
            isDefault={sectionIsDefault.translations}
            opened={openSections.has('translations')}
            onToggle={toggleSection}
            onReset={resetTranslations}
          >
            <TranslationsSection translations={translations} onChange={setTranslations} />
          </CollapsibleSection>
        </Stack>
      </ScrollArea>

      <Modal
        opened={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Config JSON"
        size="lg"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Paste a config JSON below. This will replace all current settings in the form. You still
            need to click Save to persist.
          </Text>
          <JsonInput
            value={importJsonText}
            onChange={(v) => {
              setImportJsonText(v);
              setImportJsonError(null);
            }}
            error={importJsonError}
            autosize
            minRows={12}
            maxRows={24}
            formatOnBlur
            spellCheck={false}
          />
          <Group justify="flex-end">
            <Button variant="light" color="gray" onClick={() => setImportModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportJson} disabled={!importJsonText.trim()}>
              Apply
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

export function AppConfigPage() {
  return (
    <Container size="xl" py="md">
      <Title order={2} mb="lg">
        App Configuration
      </Title>
      <AccessKeyGate>{(accessKey) => <ConfigEditor accessKey={accessKey} />}</AccessKeyGate>
    </Container>
  );
}
