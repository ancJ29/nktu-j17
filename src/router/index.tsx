import { ROUTES } from '@/constants/routes';
import { createBrowserRouter, Navigate } from 'react-router';
import type { RouteObject } from 'react-router';
import { IconName } from '@credo/base-ui/components';
import { appConfig } from '@/config';
import { featureFlags } from '@/utils/features';
import { getModulePermissions } from '@/utils/permissionReader';
import { LookupV2PageRootGuarded } from './routeGuards';

import { AppDetailLayout, AppLayout, BaseLayout } from '@/layouts/AppLayout';
import { device } from '@credo/base-ui/utils';
import { isAdmin } from '@/config/env';
import { ForbiddenState } from '@/components/ForbiddenState';
import { RouteErrorState } from '@/components/RouteErrorState';

import {
  ForgotPasswordPage,
  GuestLayout,
  LoginPage,
  LoginViaQRCodePage,
  LogoutPage,
  RegisterPage,
  ResetPasswordPage,
} from './auth';

import {
  HomePage,
  ReportPage,
  MorePage,
  EmployeeListPage,
  EmployeeDetailPage,
  EmployeeFormPage,
  EmployeeOrgSettingsPage,
  ProductListPage,
  ProductDetailPage,
  ProductFormPage,
  LocationListPage,
  LocationDetailPage,
  LocationFormPage,
  MaterialListPage,
  MaterialDetailPage,
  MaterialFormPage,
  MaterialInventoryListPage,
  WarehouseReceiptListPage,
  WarehouseReceiptDetailPage,
  WarehouseReceiptFormPage,
  WarehouseDeliveryNoteListPage,
  WarehouseDeliveryNoteDetailPage,
  WarehouseDeliveryNoteFormPage,
  QuotationListPage,
  QuotationDetailPage,
  QuotationFormPage,
  TruckAssetListPage,
  TruckAssetDetailPage,
  TruckAssetFormPage,
  OilTankListPage,
  OilTankDetailPage,
  OilTankFormPage,
  GreenhouseListPage,
  GreenhouseDetailPage,
  GreenhouseFormPage,
  CropListPage,
  CropDetailPage,
  CropFormPage,
  CropDiaryTemplateListPage,
  CropDiaryTemplateDetailPage,
  CropDiaryTemplateFormPage,
  ProductInventoryListPage,
  CustomerListPage,
  CustomerDetailPage,
  CustomerFormPage,
  VendorListPage,
  VendorDetailPage,
  VendorFormPage,
  SalesOrderListPage,
  SalesOrderDetailPage,
  SalesOrderFormPage,
  DeliveryRequestListPage,
  DeliveryRequestDetailPage,
  DeliveryRequestFormPage,
  GoodsReceiptListPage,
  GoodsReceiptDetailPage,
  GoodsReceiptFormPage,
  TransportOrderListPage,
  TransportOrderDetailPage,
  TransportOrderFormPage,
  ProfilePage,
  AppConfigPage,
  DebugPage,
  FakeDataPage,
  LookupsPage,
  ErrorPage,
  NotFoundPage,
  ForbiddenPage,
  SystemAdminPage,
} from './pages';
import { byClient } from '@/config/client';

function conditionalComponent(flag: boolean, Component: React.ComponentType) {
  return flag ? <Component /> : <Navigate to={ROUTES.NOT_FOUND} replace />;
}

const showRestrictedItems = appConfig.features?.permissionManagement?.showRestrictedItems ?? false;

function gatedComponent(
  opts: { enabled?: boolean; requires?: () => boolean },
  Component: React.ComponentType,
) {
  if (opts.enabled === false) return <Navigate to={ROUTES.NOT_FOUND} replace />;
  if (opts.requires && !opts.requires()) {
    return showRestrictedItems ? <ForbiddenState /> : <Navigate to={ROUTES.FORBIDDEN} replace />;
  }
  return <Component />;
}

const gate = (module: string) => ({
  view: () => getModulePermissions(module).canView ?? false,
  create: () => getModulePermissions(module).canCreate ?? false,
  edit: () => getModulePermissions(module).canEdit ?? false,
});

const employeeGate = gate('employee');
const productGate = gate('product');
const customerGate = gate('customer');
const vendorGate = gate('vendor');
const salesOrderGate = gate('salesOrder');
const deliveryRequestGate = gate('deliveryRequest');
const goodsReceiptGate = gate('goodsReceipt');
const transportOrderGate = gate('transportOrder');
const locationGate = gate('location');
const materialGate = gate('material');
const truckGate = gate('truck');
const oilTankGate = gate('oilTank');
const greenhouseGate = gate('greenhouse');
const cropGate = gate('crop');
const cropDiaryTemplateGate = gate('cropDiaryTemplate');
const productInventoryGate = gate('productInventory');
const materialInventoryGate = gate('materialInventory');
const warehouseReceiptGate = gate('warehouseReceipt');
const warehouseDeliveryNoteGate = gate('warehouseDeliveryNote');
const lookupGate = gate('lookup');
const lookupV2Gate = gate('lookupV2');

const employeeDetailNav = {
  detailNav: (t: (key: string) => string) => [
    {
      icon: IconName.Users,
      label: t('__new__.07-entities.employees.title'),
      path: ROUTES.EMPLOYEES.LIST,
    },
  ],
};

const productDetailNav = {
  detailNav: (t: (key: string) => string) => [
    { icon: IconName.Package, label: t('common.labels.product'), path: ROUTES.PRODUCTS.LIST },
  ],
};

const truckAssetDetailNav = {
  detailNav: (t: (key: string) => string) => [
    {
      icon: IconName.Truck,
      label: t('assets.truck.title'),
      path: ROUTES.ASSETS.TRUCKS.LIST,
    },
  ],
};

const oilTankDetailNav = {
  detailNav: (t: (key: string) => string) => [
    {
      icon: IconName.BucketDroplet,
      label: t('oilTanks.title'),
      path: ROUTES.OIL_TANKS.LIST,
    },
  ],
};

const greenhouseDetailNav = {
  detailNav: (t: (key: string) => string) => [
    {
      icon: IconName.BuildingWarehouse,
      label: t('greenhouses.title'),
      path: ROUTES.GREENHOUSES.LIST,
    },
  ],
};

const cropDetailNav = {
  detailNav: (t: (key: string) => string) => [
    { icon: IconName.Category, label: t('crops.title'), path: ROUTES.CROPS.LIST },
  ],
};

const cropDiaryTemplateDetailNav = {
  detailNav: (t: (key: string) => string) => [
    {
      icon: IconName.ClipboardList,
      label: t('cropDiaryTemplates.title'),
      path: ROUTES.CROP_DIARY_TEMPLATES.LIST,
    },
  ],
};

const locationDetailNav = {
  detailNav: (t: (key: string) => string) => [
    { icon: IconName.BuildingWarehouse, label: t('locations.title'), path: ROUTES.LOCATIONS.LIST },
  ],
};

const materialDetailNav = {
  detailNav: (t: (key: string) => string) => [
    { icon: IconName.Box, label: t('materials.title'), path: ROUTES.MATERIALS.LIST },
  ],
};

const warehouseReceiptDetailNav = {
  detailNav: (t: (key: string) => string) => [
    {
      icon: IconName.Package,
      label: t('warehouseReceipt.title'),
      path: ROUTES.WAREHOUSE_RECEIPTS.LIST,
    },
  ],
};

const warehouseDeliveryNoteDetailNav = {
  detailNav: (t: (key: string) => string) => [
    {
      icon: IconName.Package,
      label: t('warehouseDeliveryNote.title'),
      path: ROUTES.WAREHOUSE_DELIVERY_NOTES.LIST,
    },
  ],
};

const customerDetailNav = {
  detailNav: (t: (key: string) => string) => [
    {
      icon: IconName.ShoppingCart,
      label: t('common.labels.customer'),
      path: ROUTES.CUSTOMERS.LIST,
    },
  ],
};

const vendorDetailNav = {
  detailNav: (t: (key: string) => string) => [
    { icon: IconName.Truck, label: t('common.labels.vendor'), path: ROUTES.VENDORS.LIST },
  ],
};

const salesOrderDetailNav = {
  detailNav: (t: (key: string) => string) => [
    { icon: IconName.FileText, label: t('salesOrders.title'), path: ROUTES.SALES_ORDERS.LIST },
  ],
};

const deliveryRequestDetailNav = {
  detailNav: (t: (key: string) => string) => [
    {
      icon: IconName.TruckDelivery,
      label: t('deliveryRequests.title'),
      path: ROUTES.DELIVERY.LIST,
    },
  ],
};

const goodsReceiptDetailNav = {
  detailNav: (t: (key: string) => string) => [
    {
      icon: IconName.PackageImport,
      label: t('goodsReceipts.title'),
      path: ROUTES.GOODS_RECEIPTS.LIST,
    },
  ],
};

const transportOrderDetailNav = {
  detailNav: (t: (key: string) => string) => [
    {
      icon: IconName.Truck,
      label: t('transportOrders.title'),
      path: ROUTES.TRANSPORT_ORDERS.LIST,
    },
  ],
};

const employeesEnabled = featureFlags.employees.enabled;

const employeeSelfManageEnabled = employeesEnabled && (featureFlags.employees.selfManage ?? false);
const permissionManagementEnabled = appConfig.features?.permissionManagement?.enabled ?? false;
const employeeOrgGate = {
  view: () =>
    permissionManagementEnabled && (getModulePermissions('permissionManagement').canView ?? false),
};
const productsEnabled = featureFlags.products.enabled;
const locationsEnabled = featureFlags.locations.enabled;
const materialsEnabled = featureFlags.materials.enabled;
const trucksEnabled = featureFlags.trucks.enabled;
const oilTanksEnabled = featureFlags.oilTanks.enabled;
const farmEnabled = featureFlags.farm.enabled;
const productInventoryEnabled = featureFlags.productInventory.enabled;
const materialInventoryEnabled = featureFlags.materialInventory.enabled;
const warehouseReceiptsEnabled = featureFlags.warehouseReceipts.enabled;
const warehouseDeliveryNotesEnabled = featureFlags.warehouseDeliveryNotes.enabled;
const customersEnabled = featureFlags.customers.enabled;
const vendorsEnabled = featureFlags.vendors.enabled;
const salesOrdersEnabled = featureFlags.salesOrders.enabled;
const deliveryRequestsEnabled = featureFlags.deliveryRequests.enabled;
const goodsReceiptsEnabled = featureFlags.goodsReceipts.enabled;
const transportOrdersEnabled = featureFlags.transportOrders.enabled;
const lookupsEnabled = featureFlags.lookups.enabled;
const lookupV2Enabled = featureFlags.lookupV2.enabled;

const employeeRoutes: RouteObject[] = [
  {
    path: ROUTES.EMPLOYEES.LIST,
    element: gatedComponent(
      { enabled: employeesEnabled, requires: employeeGate.view },
      EmployeeListPage,
    ),
  },
  {
    path: ROUTES.EMPLOYEES.ORG_SETTINGS,
    element: gatedComponent(
      { enabled: employeeSelfManageEnabled, requires: employeeOrgGate.view },
      EmployeeOrgSettingsPage,
    ),
  },
];

const employeeDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.EMPLOYEES.NEW,
    element: gatedComponent(
      { enabled: employeesEnabled, requires: employeeGate.create },
      EmployeeFormPage,
    ),
    handle: employeeDetailNav,
  },
  {
    path: ROUTES.EMPLOYEES.DETAIL,
    element: gatedComponent(
      { enabled: employeesEnabled, requires: employeeGate.view },
      EmployeeDetailPage,
    ),
    handle: employeeDetailNav,
  },
  {
    path: ROUTES.EMPLOYEES.EDIT,
    element: gatedComponent(
      { enabled: employeesEnabled, requires: employeeGate.edit },
      EmployeeFormPage,
    ),
    handle: employeeDetailNav,
  },
];

const productRoutes: RouteObject[] = [
  {
    path: ROUTES.PRODUCTS.LIST,
    element: gatedComponent(
      { enabled: productsEnabled, requires: productGate.view },
      ProductListPage,
    ),
  },
];

const productDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.PRODUCTS.NEW,
    element: gatedComponent(
      { enabled: productsEnabled, requires: productGate.create },
      ProductFormPage,
    ),
    handle: productDetailNav,
  },
  {
    path: ROUTES.PRODUCTS.DETAIL,
    element: gatedComponent(
      { enabled: productsEnabled, requires: productGate.view },
      ProductDetailPage,
    ),
    handle: productDetailNav,
  },
  {
    path: ROUTES.PRODUCTS.EDIT,
    element: gatedComponent(
      { enabled: productsEnabled, requires: productGate.edit },
      ProductFormPage,
    ),
    handle: productDetailNav,
  },
];

const locationRoutes: RouteObject[] = [
  {
    path: ROUTES.LOCATIONS.LIST,
    element: gatedComponent(
      { enabled: locationsEnabled, requires: locationGate.view },
      LocationListPage,
    ),
  },
];

const locationDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.LOCATIONS.NEW,
    element: gatedComponent(
      { enabled: locationsEnabled, requires: locationGate.create },
      LocationFormPage,
    ),
    handle: locationDetailNav,
  },
  {
    path: ROUTES.LOCATIONS.DETAIL,
    element: gatedComponent(
      { enabled: locationsEnabled, requires: locationGate.view },
      LocationDetailPage,
    ),
    handle: locationDetailNav,
  },
  {
    path: ROUTES.LOCATIONS.EDIT,
    element: gatedComponent(
      { enabled: locationsEnabled, requires: locationGate.edit },
      LocationFormPage,
    ),
    handle: locationDetailNav,
  },
];

const materialRoutes: RouteObject[] = [
  {
    path: ROUTES.MATERIALS.LIST,
    element: gatedComponent(
      { enabled: materialsEnabled, requires: materialGate.view },
      MaterialListPage,
    ),
  },
];

const materialDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.MATERIALS.NEW,
    element: gatedComponent(
      { enabled: materialsEnabled, requires: materialGate.create },
      MaterialFormPage,
    ),
    handle: materialDetailNav,
  },
  {
    path: ROUTES.MATERIALS.DETAIL,
    element: gatedComponent(
      { enabled: materialsEnabled, requires: materialGate.view },
      MaterialDetailPage,
    ),
    handle: materialDetailNav,
  },
  {
    path: ROUTES.MATERIALS.EDIT,
    element: gatedComponent(
      { enabled: materialsEnabled, requires: materialGate.edit },
      MaterialFormPage,
    ),
    handle: materialDetailNav,
  },
];

const warehouseReceiptRoutes: RouteObject[] = [
  {
    path: ROUTES.WAREHOUSE_RECEIPTS.LIST,
    element: gatedComponent(
      { enabled: warehouseReceiptsEnabled, requires: warehouseReceiptGate.view },
      WarehouseReceiptListPage,
    ),
  },
];

const warehouseReceiptDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.WAREHOUSE_RECEIPTS.NEW,
    element: gatedComponent(
      { enabled: warehouseReceiptsEnabled, requires: warehouseReceiptGate.create },
      WarehouseReceiptFormPage,
    ),
    handle: warehouseReceiptDetailNav,
  },
  {
    path: ROUTES.WAREHOUSE_RECEIPTS.DETAIL,
    element: gatedComponent(
      { enabled: warehouseReceiptsEnabled, requires: warehouseReceiptGate.view },
      WarehouseReceiptDetailPage,
    ),
    handle: warehouseReceiptDetailNav,
  },
  {
    path: ROUTES.WAREHOUSE_RECEIPTS.EDIT,
    element: gatedComponent(
      { enabled: warehouseReceiptsEnabled, requires: warehouseReceiptGate.edit },
      WarehouseReceiptFormPage,
    ),
    handle: warehouseReceiptDetailNav,
  },
];

const warehouseDeliveryNoteRoutes: RouteObject[] = [
  {
    path: ROUTES.WAREHOUSE_DELIVERY_NOTES.LIST,
    element: gatedComponent(
      { enabled: warehouseDeliveryNotesEnabled, requires: warehouseDeliveryNoteGate.view },
      WarehouseDeliveryNoteListPage,
    ),
  },
];

const warehouseDeliveryNoteDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.WAREHOUSE_DELIVERY_NOTES.NEW,
    element: gatedComponent(
      { enabled: warehouseDeliveryNotesEnabled, requires: warehouseDeliveryNoteGate.create },
      WarehouseDeliveryNoteFormPage,
    ),
    handle: warehouseDeliveryNoteDetailNav,
  },
  {
    path: ROUTES.WAREHOUSE_DELIVERY_NOTES.DETAIL,
    element: gatedComponent(
      { enabled: warehouseDeliveryNotesEnabled, requires: warehouseDeliveryNoteGate.view },
      WarehouseDeliveryNoteDetailPage,
    ),
    handle: warehouseDeliveryNoteDetailNav,
  },
  {
    path: ROUTES.WAREHOUSE_DELIVERY_NOTES.EDIT,
    element: gatedComponent(
      { enabled: warehouseDeliveryNotesEnabled, requires: warehouseDeliveryNoteGate.edit },
      WarehouseDeliveryNoteFormPage,
    ),
    handle: warehouseDeliveryNoteDetailNav,
  },
];

const quotationRoutes: RouteObject[] = [
  {
    path: ROUTES.QUOTATIONS.LIST,
    element: gatedComponent({ requires: salesOrderGate.view }, QuotationListPage),
  },
];

const quotationDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.QUOTATIONS.NEW,
    element: gatedComponent({ requires: salesOrderGate.create }, QuotationFormPage),
  },
  {
    path: ROUTES.QUOTATIONS.DETAIL,
    element: gatedComponent({ requires: salesOrderGate.view }, QuotationDetailPage),
  },
  {
    path: ROUTES.QUOTATIONS.EDIT,
    element: gatedComponent({ requires: salesOrderGate.edit }, QuotationFormPage),
  },
];

const truckAssetRoutes: RouteObject[] = [
  {
    path: ROUTES.ASSETS.TRUCKS.LIST,
    element: gatedComponent(
      { enabled: trucksEnabled, requires: truckGate.view },
      TruckAssetListPage,
    ),
  },
];

const truckAssetDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.ASSETS.TRUCKS.NEW,
    element: gatedComponent(
      { enabled: trucksEnabled, requires: truckGate.create },
      TruckAssetFormPage,
    ),
    handle: truckAssetDetailNav,
  },
  {
    path: ROUTES.ASSETS.TRUCKS.DETAIL,
    element: gatedComponent(
      { enabled: trucksEnabled, requires: truckGate.view },
      TruckAssetDetailPage,
    ),
    handle: truckAssetDetailNav,
  },
  {
    path: ROUTES.ASSETS.TRUCKS.EDIT,
    element: gatedComponent(
      { enabled: trucksEnabled, requires: truckGate.edit },
      TruckAssetFormPage,
    ),
    handle: truckAssetDetailNav,
  },
];

const oilTankRoutes: RouteObject[] = [
  {
    path: ROUTES.OIL_TANKS.LIST,
    element: gatedComponent(
      { enabled: oilTanksEnabled, requires: oilTankGate.view },
      OilTankListPage,
    ),
  },
];

const oilTankDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.OIL_TANKS.NEW,
    element: gatedComponent(
      { enabled: oilTanksEnabled, requires: oilTankGate.create },
      OilTankFormPage,
    ),
    handle: oilTankDetailNav,
  },
  {
    path: ROUTES.OIL_TANKS.DETAIL,
    element: gatedComponent(
      { enabled: oilTanksEnabled, requires: oilTankGate.view },
      OilTankDetailPage,
    ),
    handle: oilTankDetailNav,
  },
  {
    path: ROUTES.OIL_TANKS.EDIT,
    element: gatedComponent(
      { enabled: oilTanksEnabled, requires: oilTankGate.edit },
      OilTankFormPage,
    ),
    handle: oilTankDetailNav,
  },
];

const greenhouseRoutes: RouteObject[] = [
  {
    path: ROUTES.GREENHOUSES.LIST,
    element: gatedComponent(
      { enabled: farmEnabled, requires: greenhouseGate.view },
      GreenhouseListPage,
    ),
  },
];

const greenhouseDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.GREENHOUSES.NEW,
    element: gatedComponent(
      { enabled: farmEnabled, requires: greenhouseGate.create },
      GreenhouseFormPage,
    ),
    handle: greenhouseDetailNav,
  },
  {
    path: ROUTES.GREENHOUSES.DETAIL,
    element: gatedComponent(
      { enabled: farmEnabled, requires: greenhouseGate.view },
      GreenhouseDetailPage,
    ),
    handle: greenhouseDetailNav,
  },
  {
    path: ROUTES.GREENHOUSES.EDIT,
    element: gatedComponent(
      { enabled: farmEnabled, requires: greenhouseGate.edit },
      GreenhouseFormPage,
    ),
    handle: greenhouseDetailNav,
  },
];

const cropRoutes: RouteObject[] = [
  {
    path: ROUTES.CROPS.LIST,
    element: gatedComponent({ enabled: farmEnabled, requires: cropGate.view }, CropListPage),
  },
];

const cropDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.CROPS.NEW,
    element: gatedComponent({ enabled: farmEnabled, requires: cropGate.create }, CropFormPage),
    handle: cropDetailNav,
  },
  {
    path: ROUTES.CROPS.DETAIL,
    element: gatedComponent({ enabled: farmEnabled, requires: cropGate.view }, CropDetailPage),
    handle: cropDetailNav,
  },
  {
    path: ROUTES.CROPS.EDIT,
    element: gatedComponent({ enabled: farmEnabled, requires: cropGate.edit }, CropFormPage),
    handle: cropDetailNav,
  },
];

const cropDiaryTemplateRoutes: RouteObject[] = [
  {
    path: ROUTES.CROP_DIARY_TEMPLATES.LIST,
    element: gatedComponent(
      { enabled: farmEnabled, requires: cropDiaryTemplateGate.view },
      CropDiaryTemplateListPage,
    ),
  },
];

const cropDiaryTemplateDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.CROP_DIARY_TEMPLATES.NEW,
    element: gatedComponent(
      { enabled: farmEnabled, requires: cropDiaryTemplateGate.create },
      CropDiaryTemplateFormPage,
    ),
    handle: cropDiaryTemplateDetailNav,
  },
  {
    path: ROUTES.CROP_DIARY_TEMPLATES.DETAIL,
    element: gatedComponent(
      { enabled: farmEnabled, requires: cropDiaryTemplateGate.view },
      CropDiaryTemplateDetailPage,
    ),
    handle: cropDiaryTemplateDetailNav,
  },
  {
    path: ROUTES.CROP_DIARY_TEMPLATES.EDIT,
    element: gatedComponent(
      { enabled: farmEnabled, requires: cropDiaryTemplateGate.edit },
      CropDiaryTemplateFormPage,
    ),
    handle: cropDiaryTemplateDetailNav,
  },
];

const customerRoutes: RouteObject[] = [
  {
    path: ROUTES.CUSTOMERS.LIST,
    element: gatedComponent(
      { enabled: customersEnabled, requires: customerGate.view },
      CustomerListPage,
    ),
  },
];

const customerDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.CUSTOMERS.NEW,
    element: gatedComponent(
      { enabled: customersEnabled, requires: customerGate.create },
      CustomerFormPage,
    ),
    handle: customerDetailNav,
  },
  {
    path: ROUTES.CUSTOMERS.DETAIL,
    element: gatedComponent(
      { enabled: customersEnabled, requires: customerGate.view },
      CustomerDetailPage,
    ),
    handle: customerDetailNav,
  },
  {
    path: ROUTES.CUSTOMERS.EDIT,
    element: gatedComponent(
      { enabled: customersEnabled, requires: customerGate.edit },
      CustomerFormPage,
    ),
    handle: customerDetailNav,
  },
];

const vendorRoutes: RouteObject[] = [
  {
    path: ROUTES.VENDORS.LIST,
    element: gatedComponent({ enabled: vendorsEnabled, requires: vendorGate.view }, VendorListPage),
  },
];

const vendorDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.VENDORS.NEW,
    element: gatedComponent(
      { enabled: vendorsEnabled, requires: vendorGate.create },
      VendorFormPage,
    ),
    handle: vendorDetailNav,
  },
  {
    path: ROUTES.VENDORS.DETAIL,
    element: gatedComponent(
      { enabled: vendorsEnabled, requires: vendorGate.view },
      VendorDetailPage,
    ),
    handle: vendorDetailNav,
  },
  {
    path: ROUTES.VENDORS.EDIT,
    element: gatedComponent({ enabled: vendorsEnabled, requires: vendorGate.edit }, VendorFormPage),
    handle: vendorDetailNav,
  },
];

const salesOrderRoutes: RouteObject[] = [
  {
    path: ROUTES.SALES_ORDERS.LIST,
    element: gatedComponent(
      { enabled: salesOrdersEnabled, requires: salesOrderGate.view },
      SalesOrderListPage,
    ),
  },
];

const salesOrderDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.SALES_ORDERS.NEW,
    element: gatedComponent(
      { enabled: salesOrdersEnabled, requires: salesOrderGate.create },
      SalesOrderFormPage,
    ),
    handle: salesOrderDetailNav,
  },
  {
    path: ROUTES.SALES_ORDERS.DETAIL,
    element: gatedComponent(
      { enabled: salesOrdersEnabled, requires: salesOrderGate.view },
      SalesOrderDetailPage,
    ),
    handle: salesOrderDetailNav,
  },
  {
    path: ROUTES.SALES_ORDERS.EDIT,
    element: gatedComponent(
      { enabled: salesOrdersEnabled, requires: salesOrderGate.edit },
      SalesOrderFormPage,
    ),
    handle: salesOrderDetailNav,
  },
];

const deliveryRequestRoutes: RouteObject[] = [
  {
    path: ROUTES.DELIVERY.LIST,
    element: gatedComponent(
      { enabled: deliveryRequestsEnabled, requires: deliveryRequestGate.view },
      DeliveryRequestListPage,
    ),
  },
];

const deliveryRequestDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.DELIVERY.NEW,
    element: gatedComponent(
      { enabled: deliveryRequestsEnabled, requires: deliveryRequestGate.create },
      DeliveryRequestFormPage,
    ),
    handle: deliveryRequestDetailNav,
  },
  {
    path: ROUTES.DELIVERY.DETAIL,
    element: gatedComponent(
      {
        enabled: deliveryRequestsEnabled,

        requires: byClient({ nktu: () => true }, deliveryRequestGate.view),
      },
      DeliveryRequestDetailPage,
    ),
    handle: deliveryRequestDetailNav,
  },
  {
    path: ROUTES.DELIVERY.EDIT,
    element: gatedComponent(
      { enabled: deliveryRequestsEnabled, requires: deliveryRequestGate.edit },
      DeliveryRequestFormPage,
    ),
    handle: deliveryRequestDetailNav,
  },
];

const goodsReceiptRoutes: RouteObject[] = [
  {
    path: ROUTES.GOODS_RECEIPTS.LIST,
    element: gatedComponent(
      { enabled: goodsReceiptsEnabled, requires: goodsReceiptGate.view },
      GoodsReceiptListPage,
    ),
  },
];

const goodsReceiptDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.GOODS_RECEIPTS.NEW,
    element: gatedComponent(
      { enabled: goodsReceiptsEnabled, requires: goodsReceiptGate.create },
      GoodsReceiptFormPage,
    ),
    handle: goodsReceiptDetailNav,
  },
  {
    path: ROUTES.GOODS_RECEIPTS.DETAIL,
    element: gatedComponent(
      { enabled: goodsReceiptsEnabled, requires: goodsReceiptGate.view },
      GoodsReceiptDetailPage,
    ),
    handle: goodsReceiptDetailNav,
  },
  {
    path: ROUTES.GOODS_RECEIPTS.EDIT,
    element: gatedComponent(
      { enabled: goodsReceiptsEnabled, requires: goodsReceiptGate.edit },
      GoodsReceiptFormPage,
    ),
    handle: goodsReceiptDetailNav,
  },
];

const transportOrderRoutes: RouteObject[] = [
  {
    path: ROUTES.TRANSPORT_ORDERS.LIST,
    element: gatedComponent(
      { enabled: transportOrdersEnabled, requires: transportOrderGate.view },
      TransportOrderListPage,
    ),
  },
];

const transportOrderDetailRoutes: RouteObject[] = [
  {
    path: ROUTES.TRANSPORT_ORDERS.NEW,
    element: gatedComponent(
      { enabled: transportOrdersEnabled, requires: transportOrderGate.create },
      TransportOrderFormPage,
    ),
    handle: transportOrderDetailNav,
  },
  {
    path: ROUTES.TRANSPORT_ORDERS.DETAIL,
    element: gatedComponent(
      { enabled: transportOrdersEnabled, requires: transportOrderGate.view },
      TransportOrderDetailPage,
    ),
    handle: transportOrderDetailNav,
  },
  {
    path: ROUTES.TRANSPORT_ORDERS.EDIT,
    element: gatedComponent(
      { enabled: transportOrdersEnabled, requires: transportOrderGate.edit },
      TransportOrderFormPage,
    ),
    handle: transportOrderDetailNav,
  },
];

const router = createBrowserRouter([
  {
    element: <BaseLayout />,

    errorElement: <RouteErrorState />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: ROUTES.APP.MAIN, element: <HomePage /> },
          { path: ROUTES.REPORTS, element: <ReportPage /> },
          ...employeeRoutes,
          ...deliveryRequestRoutes,
          ...salesOrderRoutes,
          ...goodsReceiptRoutes,
          ...transportOrderRoutes,
          {
            path: ROUTES.LOOKUPS.LIST,
            element: gatedComponent(
              { enabled: lookupsEnabled, requires: lookupGate.view },
              LookupsPage,
            ),
          },
          {
            path: ROUTES.LOOKUPS_V2.LIST,
            element: gatedComponent(
              { enabled: lookupV2Enabled, requires: lookupV2Gate.view },
              LookupV2PageRootGuarded,
            ),
          },
          ...productRoutes,
          ...locationRoutes,
          ...materialRoutes,
          ...warehouseReceiptRoutes,
          ...warehouseDeliveryNoteRoutes,
          ...quotationRoutes,
          ...truckAssetRoutes,
          ...oilTankRoutes,
          ...greenhouseRoutes,
          ...cropRoutes,
          ...cropDiaryTemplateRoutes,
          {
            path: ROUTES.INVENTORY.PRODUCTS,
            element: gatedComponent(
              { enabled: productInventoryEnabled, requires: productInventoryGate.view },
              ProductInventoryListPage,
            ),
          },
          {
            path: ROUTES.INVENTORY.MATERIALS,
            element: gatedComponent(
              { enabled: materialInventoryEnabled, requires: materialInventoryGate.view },
              MaterialInventoryListPage,
            ),
          },
          ...customerRoutes,
          ...vendorRoutes,
          { path: ROUTES.MORE, element: conditionalComponent(device.isMobile, MorePage) },
          { path: ROUTES.PROFILE, element: <ProfilePage /> },
          {
            path: ROUTES.CONFIGURATION.APP_CONFIG,
            element: gatedComponent({ enabled: isAdmin }, AppConfigPage),
          },
          {
            path: ROUTES.CONFIGURATION.DEBUG,
            element: gatedComponent({ enabled: isAdmin }, DebugPage),
          },
          {
            path: ROUTES.CONFIGURATION.FAKE_DATA,
            element: gatedComponent({ enabled: isAdmin }, FakeDataPage),
          },
        ],
      },

      {
        element: <AppDetailLayout />,
        children: [
          ...employeeDetailRoutes,
          ...productDetailRoutes,
          ...locationDetailRoutes,
          ...materialDetailRoutes,
          ...warehouseReceiptDetailRoutes,
          ...warehouseDeliveryNoteDetailRoutes,
          ...quotationDetailRoutes,
          ...truckAssetDetailRoutes,
          ...oilTankDetailRoutes,
          ...greenhouseDetailRoutes,
          ...cropDetailRoutes,
          ...cropDiaryTemplateDetailRoutes,
          ...customerDetailRoutes,
          ...vendorDetailRoutes,
          ...salesOrderDetailRoutes,
          ...transportOrderDetailRoutes,
          ...deliveryRequestDetailRoutes,
          ...goodsReceiptDetailRoutes,
        ],
      },

      { path: ROUTES.AUTH.LOGOUT, element: <LogoutPage /> },
      {
        element: <GuestLayout />,
        children: [
          { path: ROUTES.AUTH.LOGIN, element: <LoginPage /> },
          ...(appConfig.auth.register
            ? [{ path: ROUTES.AUTH.REGISTER, element: <RegisterPage /> }]
            : []),
          ...(appConfig.auth.forgotPassword
            ? [{ path: ROUTES.AUTH.FORGOT_PASSWORD, element: <ForgotPasswordPage /> }]
            : []),
          ...(appConfig.auth.resetPassword
            ? [{ path: ROUTES.AUTH.RESET_PASSWORD, element: <ResetPasswordPage /> }]
            : []),
          ...(appConfig.auth.loginViaQRCode
            ? [{ path: ROUTES.AUTH.LOGIN_VIA_QR_CODE, element: <LoginViaQRCodePage /> }]
            : []),
        ],
      },
    ],
  },

  { path: ROUTES.SYSTEM_ADMIN, element: <SystemAdminPage /> },

  { path: ROUTES.ERROR, element: <ErrorPage /> },
  { path: ROUTES.FORBIDDEN, element: <ForbiddenPage /> },
  { path: ROUTES.NOT_FOUND, element: <NotFoundPage /> },
  { path: '*', element: <Navigate to={ROUTES.NOT_FOUND} replace /> },
]);

export default router;
