import type { CMngtAppConfig } from '@credo/kits/types';
import type { AuthFeatures, Language, ThemeConfig } from '@credo/kits/types';
import type {
  CMngtEmployeeFeatures,
  CMngtLocationFeatures,
  CMngtCustomerFeatures,
  CMngtVendorFeatures,
  CMngtSalesOrderFeatures,
  CMngtDeliveryRequestFeatures,
  CMngtTransportOrderFeatures,
  CMngtLayoutConfig,
  CMngtDisplaySettings,
} from '@credo/kits/types';

import type { CompanyInfoConfig, GoodsReceiptFeatures, ProductFeatures } from './schema';

const CLIENT_NAME = 'Credo Management';

export const DEFAULT_APP_INFO: CMngtAppConfig['app'] = { name: CLIENT_NAME };

export const DEFAULT_AUTH: AuthFeatures = {
  loginViaQRCode: true,
};

export const DEFAULT_THEME: ThemeConfig = { mainColor: 'steel' };

export const DEFAULT_LANGUAGES: Language[] = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

export const DEFAULT_LANGUAGE = 'vi';

export const DEFAULT_LANGUAGE_SWITCHER = true;

export const DEFAULT_ENABLE_PDF_SHARING = false;

export const DEFAULT_ENABLE_STATS = false;

export const DEFAULT_NOTIFY_NEW_VERSION = false;

export const DEFAULT_TABLE_DENSITY: 'comfortable' | 'compact' = 'comfortable';

export const DEFAULT_EMPLOYEE_FEATURES: CMngtEmployeeFeatures = {
  enabled: true,
  email: false,
  position: false,
  department: true,
  allowLogin: true,
  bulkImport: true,
  avatar: false,
  startDate: false,
  address: false,
  dateOfBirth: false,
  driverProfile: false,
  driverDepartments: [],
  codePrefix: 'EMP-',
  codePadLength: 4,
  departmentOptions: [
    { value: 'sales', label: { en: 'Sales', vi: 'Kinh Doanh' } },
    { value: 'accounting', label: { en: 'Accounting', vi: 'Kế Toán' } },
    { value: 'delivery', label: { en: 'Delivery', vi: 'Giao hàng' } },
    { value: 'warehouse', label: { en: 'Warehouse', vi: 'Kho' } },
    { value: 'manager', label: { en: 'Manager', vi: 'Quản lý' } },
    // cspell:enable
  ],
  positionOptions: [],
};

export const DEFAULT_PRODUCT_FEATURES: ProductFeatures = {
  enabled: true,
  codePrefix: 'PRD-',
  codePadLength: 4,
  priceManagement: true,
  bulkImport: true,
  technicalSpecs: true,
  barcode: true,
  images: true,

  hideFromInventoryList: false,
};

export const DEFAULT_LOCATION_FEATURES: CMngtLocationFeatures = {
  enabled: true,
  codePrefix: 'LOC-',
  codePadLength: 4,
};

export const DEFAULT_SALES_ORDER_FEATURES: CMngtSalesOrderFeatures = {
  enabled: false,
  codePrefix: 'SO-',
  codePadLength: 4,

  deliveryMethodOptions: [
    { value: 'internal', label: { en: 'Internal delivery', vi: 'Giao hàng nội bộ' } },
    { value: 'pickup', label: { en: 'Pickup at warehouse', vi: 'Tự lấy tại kho' } },
    { value: 'post_courier', label: { en: 'Post / Courier', vi: 'Bưu điện / Chuyển phát' } },
    { value: 'truck', label: { en: 'Truck delivery', vi: 'Xe tải' } },
    { value: 'freight', label: { en: 'Freight carrier', vi: 'Chành xe' } },
  ],
  tagOptions: [],
  statusOptions: [
    {
      value: 'draft',
      label: { en: 'Draft', vi: 'Nháp' },
      color: '#858d94',
      icon: 'IconClipboardList',
      stage: 'DRAFT',
      capabilities: [{ id: 'isInitialStatus' }],
    },
    {
      value: 'new',
      label: { en: 'New', vi: 'Mới' },
      actionLabel: { en: 'New', vi: 'Mới' },
      color: '#339af0',
      icon: 'IconCheck',
      stage: 'IN_PROGRESS',
      capabilities: [
        { id: 'reservesStock' },
        { id: 'autoAdvanceOnFullDelivery' },
        { id: 'autoAdvanceOnDispatch' },
      ],
    },
    {
      value: 'confirmed',
      label: { en: 'Confirmed', vi: 'Đã xác nhận' },
      actionLabel: { en: 'Confirm', vi: 'Xác nhận' },
      color: '#22b8cf',
      icon: 'IconCheck',
      stage: 'IN_PROGRESS',
      capabilities: [
        { id: 'canCreateDR' },
        { id: 'autoAdvanceOnFullDelivery' },
        { id: 'autoAdvanceOnDispatch' },
      ],
    },
    {
      value: 'ready',
      label: { en: 'In Stock', vi: 'Có hàng' },
      actionLabel: { en: 'Mark Ready', vi: 'Có hàng' },
      color: '#20c997',
      icon: 'IconPackage',
      stage: 'IN_PROGRESS',
      capabilities: [
        { id: 'reservesStock' },
        { id: 'lockLineEdits' },
        { id: 'canCreateDR' },
        { id: 'releasesDR' },
        { id: 'autoAdvanceOnFullDelivery' },
        { id: 'autoAdvanceOnDispatch' },
      ],
    },
    {
      value: 'shipped',
      label: { en: 'Shipped', vi: 'Đã gửi' },
      actionLabel: { en: 'Ship', vi: 'Gửi hàng' },
      color: '#ff922b',
      icon: 'IconTruckDelivery',
      stage: 'IN_PROGRESS',
      capabilities: [
        { id: 'isAutoShippingTarget' },
        { id: 'canCreateDR' },
        { id: 'releasesDR' },
        { id: 'autoAdvanceOnFullDelivery' },
      ],
    },
    {
      value: 'delivered',
      label: { en: 'Delivered', vi: 'Đã giao' },
      actionLabel: { en: 'Mark Delivered', vi: 'Xác nhận đã giao' },
      color: '#40c057',
      icon: 'IconPackageExport',
      stage: 'COMPLETED',
      capabilities: [{ id: 'isAutoCompletionTarget' }, { id: 'terminal' }, { id: 'lockLineEdits' }],
    },
    {
      value: 'cancelled',
      label: { en: 'Cancelled', vi: 'Đã hủy' },
      actionLabel: { en: 'Cancel', vi: 'Hủy' },
      color: '#f03e3e',
      icon: 'IconFileOff',
      stage: 'EXCEPTIONAL',
      capabilities: [{ id: 'terminal' }, { id: 'isCancellationTarget' }, { id: 'lockLineEdits' }],
    },
  ],
  statusTransitions: {
    draft: ['new'],
    new: ['confirmed', 'cancelled', 'draft'],
    confirmed: ['ready', 'shipped', 'delivered', 'cancelled'],
    ready: ['shipped', 'delivered', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  },
  // cspell:enable
};

export const DEFAULT_GOODS_RECEIPT_FEATURES: GoodsReceiptFeatures = {
  enabled: true,
  codePrefix: 'PNK-',
  codePadLength: 4,
  picDepartments: [],
  allowNoInventoryProducts: false,
  defaultListStatuses: [],
};

export const DEFAULT_DELIVERY_REQUEST_FEATURES: CMngtDeliveryRequestFeatures = {
  enabled: false,
  codePrefix: 'DR-',
  codePadLength: 4,
  returnShipment: { enabled: false, autoRestockOnComplete: false },

  statusOptions: [
    {
      value: 'draft',
      label: { en: 'Draft', vi: 'Nháp' },
      color: '#868e96',
      icon: 'IconClipboardList',
      stage: 'NEW',
      capabilities: [{ id: 'isInitialStatus' }],
    },
    {
      value: 'pending',
      label: { en: 'Pending', vi: 'Đang chờ' },
      actionLabel: { en: 'Move to Pending', vi: 'Chuyển sang chờ' },
      color: '#f0740c',
      icon: 'IconClock',
      stage: 'IN_PROGRESS',
      capabilities: [{ id: 'isReleaseTarget' }],
    },
    {
      value: 'in_transit',
      label: { en: 'In Transit', vi: 'Đang giao' },
      actionLabel: { en: 'Start Delivery', vi: 'Bắt đầu giao' },
      color: '#228be6',
      icon: 'IconTruckDelivery',
      stage: 'IN_PROGRESS',
      capabilities: [{ id: 'lockLineEdits' }, { id: 'triggersAutoShipping' }],
    },
    {
      value: 'delivered',
      label: { en: 'Delivered', vi: 'Đã giao' },
      actionLabel: { en: 'Mark Delivered', vi: 'Xác nhận đã giao' },
      color: '#214896',
      icon: 'IconCheck',
      stage: 'COMPLETED',
      capabilities: [{ id: 'terminal' }],
    },
  ],
  statusTransitions: {
    draft: ['pending'],
    pending: ['in_transit'],
    in_transit: ['delivered'],
    delivered: [],
  },
  // cspell:enable
};

export const DEFAULT_TRANSPORT_ORDER_FEATURES: CMngtTransportOrderFeatures = {
  enabled: false,
  codePrefix: 'VC-',
  codePadLength: 3,
  routeCodePrefix: 'TUYEN-',
  nonContainerTruckTypes: [],

  statusOptions: [
    {
      value: 'new',
      label: { en: 'New', vi: 'Mới' },
      color: 'blue',
      isInitial: true,
      allowedDepartments: [],
    },
    {
      value: 'in_transit',
      label: { en: 'In transit', vi: 'Đang vận chuyển' },
      color: 'orange',
      actionLabel: { en: 'Confirm vehicle departure', vi: 'Xác nhận xe khởi hành' },
      allowedDepartments: [],
    },
    {
      value: 'completed',
      label: { en: 'Completed', vi: 'Hoàn thành' },
      color: 'teal',
      actionLabel: { en: 'Confirm completion', vi: 'Xác nhận hoàn thành' },
      allowedDepartments: [],
    },
    {
      value: 'entered_manifest',
      label: { en: 'Entered manifest', vi: 'Đã lên bảng kê' },
      color: 'green',
      actionLabel: { en: 'Enter into manifest', vi: 'Lên bảng kê' },
      terminal: true,
      locked: true,
      allowedDepartments: [],
    },
  ],
  statusTransitions: {
    new: ['in_transit'],
    in_transit: ['completed'],
    completed: ['entered_manifest'],
  },
  driverDepartments: [],
  // cspell:enable
};

export const DEFAULT_CUSTOMER_FEATURES: CMngtCustomerFeatures = {
  enabled: true,
  codePrefix: 'CST-',
  codePadLength: 4,
  shippingAddress: true,
  customerTypeOptions: [],
};

export const DEFAULT_VENDOR_FEATURES: CMngtVendorFeatures = {
  enabled: true,
  codePrefix: 'VND-',
  codePadLength: 4,
};

export const DEFAULT_LAYOUT: CMngtLayoutConfig = {
  navbar: { width: 260, displayIconWhenCollapsed: true, variant: 'dark' },
  header: { variant: 'dark' },
};

export const DEFAULT_DISPLAY_SETTINGS: CMngtDisplaySettings = {
  dateFormat: 'DD/MM/YYYY',
  dateTimeFormat: 'HH:mm DD/MM/YYYY',
};

export const DEFAULT_COMPANY_INFO: CompanyInfoConfig = {
  id: '',
  name: '',
  address: '',
  taxCode: '',
  tel: '',
  email: '',
};

export const DEFAULT_COMPANY_INFOS: CompanyInfoConfig[] = [];

export const DEFAULT_TRANSLATIONS: Record<string, Record<string, unknown>> = {};
