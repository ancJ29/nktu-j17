import { lazy } from 'react';

import { byClient } from '@/config/client';

export const HomePage = lazy(() => import('../pages/HomePage'));
export const ReportPage = lazy(() => import('../pages/ReportPage'));
export const MorePage = lazy(() => import('../pages/MorePage'));

export const EmployeeListPage = lazy(() =>
  import('../pages/employees').then((m) => ({ default: m.EmployeeListPage })),
);
export const EmployeeDetailPage = lazy(() =>
  import('../pages/employees').then((m) => ({ default: m.EmployeeDetailPage })),
);
export const EmployeeFormPage = lazy(() =>
  import('../pages/employees').then((m) => ({ default: m.EmployeeFormPage })),
);
export const EmployeeOrgSettingsPage = lazy(() =>
  import('../pages/employees').then((m) => ({ default: m.EmployeeOrgSettingsPage })),
);

export const ProductListPage = lazy(() =>
  import('../pages/products').then((m) => ({ default: m.ProductListPage })),
);
export const ProductDetailPage = lazy(() =>
  import('../pages/products').then((m) => ({ default: m.ProductDetailPage })),
);
const ProductFormPageDefault = lazy(() =>
  import('../pages/products').then((m) => ({ default: m.ProductFormPage })),
);
const ProductFormPageNKTU = lazy(() =>
  import('../pages/products/NKTUProductFormPage').then((m) => ({
    default: m.NKTUProductFormPage,
  })),
);
export const ProductFormPage = byClient({ nktu: ProductFormPageNKTU }, ProductFormPageDefault);

const ProductInventoryListPageDefault = lazy(() =>
  import('../pages/product-inventory').then((m) => ({ default: m.ProductInventoryListPage })),
);
const ProductInventoryListPageNKTU = lazy(() =>
  import('../pages/product-inventory/NKTUProductInventoryListPage').then((m) => ({
    default: m.NKTUProductInventoryListPage,
  })),
);
export const ProductInventoryListPage = byClient(
  { nktu: ProductInventoryListPageNKTU },
  ProductInventoryListPageDefault,
);

export const LocationListPage = lazy(() =>
  import('../pages/locations').then((m) => ({ default: m.LocationListPage })),
);
export const LocationDetailPage = lazy(() =>
  import('../pages/locations').then((m) => ({ default: m.LocationDetailPage })),
);
export const LocationFormPage = lazy(() =>
  import('../pages/locations').then((m) => ({ default: m.LocationFormPage })),
);

export const MaterialListPage = lazy(() =>
  import('../pages/materials').then((m) => ({ default: m.MaterialListPage })),
);
export const MaterialDetailPage = lazy(() =>
  import('../pages/materials').then((m) => ({ default: m.MaterialDetailPage })),
);
export const MaterialFormPage = lazy(() =>
  import('../pages/materials').then((m) => ({ default: m.MaterialFormPage })),
);

export const MaterialInventoryListPage = lazy(() =>
  import('../pages/material-inventory').then((m) => ({ default: m.MaterialInventoryListPage })),
);

export const WarehouseReceiptListPage = lazy(() =>
  import('../pages/warehouse-docs').then((m) => ({ default: m.WarehouseReceiptListPage })),
);
export const WarehouseReceiptDetailPage = lazy(() =>
  import('../pages/warehouse-docs').then((m) => ({ default: m.WarehouseReceiptDetailPage })),
);
export const WarehouseReceiptFormPage = lazy(() =>
  import('../pages/warehouse-docs').then((m) => ({ default: m.WarehouseReceiptFormPage })),
);
export const WarehouseDeliveryNoteListPage = lazy(() =>
  import('../pages/warehouse-docs').then((m) => ({ default: m.WarehouseDeliveryNoteListPage })),
);
export const WarehouseDeliveryNoteDetailPage = lazy(() =>
  import('../pages/warehouse-docs').then((m) => ({ default: m.WarehouseDeliveryNoteDetailPage })),
);
export const WarehouseDeliveryNoteFormPage = lazy(() =>
  import('../pages/warehouse-docs').then((m) => ({ default: m.WarehouseDeliveryNoteFormPage })),
);

export const TruckAssetListPage = lazy(() =>
  import('../pages/assets/truck').then((m) => ({ default: m.TruckAssetListPage })),
);
export const TruckAssetDetailPage = lazy(() =>
  import('../pages/assets/truck').then((m) => ({ default: m.TruckAssetDetailPage })),
);
export const TruckAssetFormPage = lazy(() =>
  import('../pages/assets/truck').then((m) => ({ default: m.TruckAssetFormPage })),
);

export const OilTankListPage = lazy(() =>
  import('../pages/oil-tanks').then((m) => ({ default: m.OilTankListPage })),
);
export const OilTankDetailPage = lazy(() =>
  import('../pages/oil-tanks').then((m) => ({ default: m.OilTankDetailPage })),
);
export const OilTankFormPage = lazy(() =>
  import('../pages/oil-tanks').then((m) => ({ default: m.OilTankFormPage })),
);

export const GreenhouseListPage = lazy(() =>
  import('../pages/greenhouses').then((m) => ({ default: m.GreenhouseListPage })),
);
export const GreenhouseDetailPage = lazy(() =>
  import('../pages/greenhouses').then((m) => ({ default: m.GreenhouseDetailPage })),
);
export const GreenhouseFormPage = lazy(() =>
  import('../pages/greenhouses').then((m) => ({ default: m.GreenhouseFormPage })),
);

export const CropListPage = lazy(() =>
  import('../pages/crops').then((m) => ({ default: m.CropListPage })),
);
export const CropDetailPage = lazy(() =>
  import('../pages/crops').then((m) => ({ default: m.CropDetailPage })),
);
export const CropFormPage = lazy(() =>
  import('../pages/crops').then((m) => ({ default: m.CropFormPage })),
);

export const CropDiaryTemplateListPage = lazy(() =>
  import('../pages/crop-diary-templates').then((m) => ({ default: m.CropDiaryTemplateListPage })),
);
export const CropDiaryTemplateDetailPage = lazy(() =>
  import('../pages/crop-diary-templates').then((m) => ({ default: m.CropDiaryTemplateDetailPage })),
);
export const CropDiaryTemplateFormPage = lazy(() =>
  import('../pages/crop-diary-templates').then((m) => ({ default: m.CropDiaryTemplateFormPage })),
);

export const CustomerListPage = lazy(() =>
  import('../pages/customers').then((m) => ({ default: m.CustomerListPage })),
);
export const CustomerDetailPage = lazy(() =>
  import('../pages/customers').then((m) => ({ default: m.CustomerDetailPage })),
);
export const CustomerFormPage = lazy(() =>
  import('../pages/customers').then((m) => ({ default: m.CustomerFormPage })),
);

const VendorListPageDefault = lazy(() =>
  import('../pages/vendors').then((m) => ({ default: m.VendorListPage })),
);
const VendorListPageNKTU = lazy(() =>
  import('../pages/vendors/NKTUVendorListPage').then((m) => ({
    default: m.NKTUVendorListPage,
  })),
);
export const VendorListPage = byClient({ nktu: VendorListPageNKTU }, VendorListPageDefault);
export const VendorDetailPage = lazy(() =>
  import('../pages/vendors').then((m) => ({ default: m.VendorDetailPage })),
);
const VendorFormPageDefault = lazy(() =>
  import('../pages/vendors').then((m) => ({ default: m.VendorFormPage })),
);
const VendorFormPageNKTU = lazy(() =>
  import('../pages/vendors/NKTUVendorFormPage').then((m) => ({
    default: m.NKTUVendorFormPage,
  })),
);
export const VendorFormPage = byClient({ nktu: VendorFormPageNKTU }, VendorFormPageDefault);

const SalesOrderListPageDefault = lazy(() =>
  import('../pages/sales-orders').then((m) => ({ default: m.SalesOrderListPage })),
);
const SalesOrderListPageNKTU = lazy(() =>
  import('../pages/sales-orders/NKTUSalesOrderListPage').then((m) => ({
    default: m.NKTUSalesOrderListPage,
  })),
);
export const SalesOrderListPage = byClient(
  { nktu: SalesOrderListPageNKTU },
  SalesOrderListPageDefault,
);
const SalesOrderDetailPageDefault = lazy(() =>
  import('../pages/sales-orders').then((m) => ({ default: m.SalesOrderDetailPage })),
);
const SalesOrderDetailPageNKTU = lazy(() =>
  import('../pages/sales-orders/NKTUSalesOrderDetailPage').then((m) => ({
    default: m.NKTUSalesOrderDetailPage,
  })),
);
export const SalesOrderDetailPage = byClient(
  { nktu: SalesOrderDetailPageNKTU },
  SalesOrderDetailPageDefault,
);
const SalesOrderFormPageDefault = lazy(() =>
  import('../pages/sales-orders').then((m) => ({ default: m.SalesOrderFormPage })),
);
const SalesOrderFormPageNKTU = lazy(() =>
  import('../pages/sales-orders/NKTUSalesOrderFormPage').then((m) => ({
    default: m.NKTUSalesOrderFormPage,
  })),
);
export const SalesOrderFormPage = byClient(
  { nktu: SalesOrderFormPageNKTU },
  SalesOrderFormPageDefault,
);

const DeliveryRequestListPageDefault = lazy(() =>
  import('../pages/delivery-requests').then((m) => ({ default: m.DeliveryRequestListPage })),
);
const DeliveryRequestListPageNKTU = lazy(() =>
  import('../pages/delivery-requests/NKTUDeliveryRequestListPage').then((m) => ({
    default: m.NKTUDeliveryRequestListPage,
  })),
);
export const DeliveryRequestListPage = byClient(
  { nktu: DeliveryRequestListPageNKTU },
  DeliveryRequestListPageDefault,
);
const DeliveryRequestDetailPageDefault = lazy(() =>
  import('../pages/delivery-requests').then((m) => ({ default: m.DeliveryRequestDetailPage })),
);
const DeliveryRequestDetailPageNKTU = lazy(() =>
  import('../pages/delivery-requests/NKTUDeliveryRequestDetailPage').then((m) => ({
    default: m.NKTUDeliveryRequestDetailPage,
  })),
);
export const DeliveryRequestDetailPage = byClient(
  { nktu: DeliveryRequestDetailPageNKTU },
  DeliveryRequestDetailPageDefault,
);
const DeliveryRequestFormPageDefault = lazy(() =>
  import('../pages/delivery-requests').then((m) => ({ default: m.DeliveryRequestFormPage })),
);
const DeliveryRequestFormPageNKTU = lazy(() =>
  import('../pages/delivery-requests/NKTUDeliveryRequestFormPage').then((m) => ({
    default: m.NKTUDeliveryRequestFormPage,
  })),
);
export const DeliveryRequestFormPage = byClient(
  { nktu: DeliveryRequestFormPageNKTU },
  DeliveryRequestFormPageDefault,
);

const GoodsReceiptListPageDefault = lazy(() =>
  import('../pages/goods-receipts').then((m) => ({ default: m.GoodsReceiptListPage })),
);
const GoodsReceiptListPageNKTU = lazy(() =>
  import('../pages/goods-receipts/NKTUGoodsReceiptListPage').then((m) => ({
    default: m.NKTUGoodsReceiptListPage,
  })),
);
export const GoodsReceiptListPage = byClient(
  { nktu: GoodsReceiptListPageNKTU },
  GoodsReceiptListPageDefault,
);
export const GoodsReceiptDetailPage = lazy(() =>
  import('../pages/goods-receipts').then((m) => ({ default: m.GoodsReceiptDetailPage })),
);
export const GoodsReceiptFormPage = lazy(() =>
  import('../pages/goods-receipts').then((m) => ({ default: m.GoodsReceiptFormPage })),
);

export const TransportOrderListPage = lazy(() =>
  import('../pages/transport-orders').then((m) => ({ default: m.TransportOrderListPage })),
);
export const TransportOrderDetailPage = lazy(() =>
  import('../pages/transport-orders').then((m) => ({ default: m.TransportOrderDetailPage })),
);
export const TransportOrderFormPage = lazy(() =>
  import('../pages/transport-orders').then((m) => ({ default: m.TransportOrderFormPage })),
);
export const TransportRouteListPage = lazy(() =>
  import('../pages/transport-routes').then((m) => ({ default: m.TransportRouteListPage })),
);
export const TransportRouteFormPage = lazy(() =>
  import('../pages/transport-routes').then((m) => ({ default: m.TransportRouteFormPage })),
);

export const ProfilePage = lazy(() =>
  import('../pages/profile').then((m) => ({ default: m.ProfilePage })),
);

export const AppConfigPage = lazy(() =>
  import('../pages/config').then((m) => ({ default: m.AppConfigPage })),
);
export const DebugPage = lazy(() =>
  import('../pages/config').then((m) => ({ default: m.DebugPage })),
);
export const LookupsPage = lazy(() =>
  import('../pages/lookups').then((m) => ({ default: m.LookupsPage })),
);
export const LookupV2Page = lazy(() =>
  import('../pages/lookup-v2').then((m) => ({ default: m.LookupV2Page })),
);

export const ErrorPage = lazy(() =>
  import('../pages/ErrorPage').then((m) => ({ default: m.ErrorPage })),
);
export const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
export const ForbiddenPage = lazy(() =>
  import('../pages/ForbiddenPage').then((m) => ({ default: m.ForbiddenPage })),
);
export const SystemAdminPage = lazy(() =>
  import('../pages/SystemAdminPage').then((m) => ({ default: m.SystemAdminPage })),
);

export const QuotationListPage = lazy(() =>
  import('../pages/quotations').then((m) => ({ default: m.QuotationListPage })),
);
export const QuotationDetailPage = lazy(() =>
  import('../pages/quotations').then((m) => ({ default: m.QuotationDetailPage })),
);
export const QuotationFormPage = lazy(() =>
  import('../pages/quotations').then((m) => ({ default: m.QuotationFormPage })),
);
