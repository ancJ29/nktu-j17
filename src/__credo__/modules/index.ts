export { createProductModule } from './product/index.js';
export type {
  Product,
  CreateProductInput,
  UpdateProductInput,
  ProductFilter,
  ProductModuleConfig,
} from './product/index.js';

export { createEmployeeModule } from './employee/index.js';
export type {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeFilter,
  EmployeeModuleConfig,
} from './employee/index.js';

export { createPurchaseOrderModule } from './purchase-order/index.js';
export type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  PurchaseOrderFilter,
  PurchaseOrderModuleConfig,
} from './purchase-order/index.js';

export { createSalesOrderModule } from './sales-order/index.js';
export type {
  SalesOrder,
  SalesOrderItem,
  CreateSalesOrderInput,
  UpdateSalesOrderInput,
  SalesOrderFilter,
  SalesOrderModuleConfig,
} from './sales-order/index.js';

export { createDeliveryRequestModule } from './delivery-request/index.js';
export type {
  DeliveryRequest,
  DeliveryRequestItem,
  CreateDeliveryRequestInput,
  UpdateDeliveryRequestInput,
  DeliveryRequestFilter,
  DeliveryRequestModuleConfig,
} from './delivery-request/index.js';

export { createGoodsReceiptModule } from './goods-receipt/index.js';
export type {
  GoodsReceipt,
  GoodsReceiptItem,
  GoodsReceiptItemType,
  GoodsReceiptStatus,
  CreateGoodsReceiptInput,
  UpdateGoodsReceiptInput,
  GoodsReceiptFilter,
  GoodsReceiptModuleConfig,
} from './goods-receipt/index.js';

export { createLocationModule } from './location/index.js';
export type {
  Location,
  CreateLocationInput,
  UpdateLocationInput,
  LocationFilter,
  LocationModuleConfig,
} from './location/index.js';

export { createProductInventoryModule } from './product-inventory/index.js';
export type {
  ProductInventory,
  CreateProductInventoryInput,
  UpdateProductInventoryInput,
  ProductInventoryFilter,
  ProductInventoryModuleConfig,
} from './product-inventory/index.js';

export { createLookupModule } from './lookup/index.js';
export type {
  LookupItem,
  CreateLookupInput,
  UpdateLookupInput,
  LookupFilter,
  LookupModuleConfig,
} from './lookup/index.js';

export { createOperationLogModule } from './operation-logs/index.js';
export type {
  OperationLog,
  CreateOperationLogInput,
  UpdateOperationLogInput,
  OperationLogFilter,
  OperationLogModuleConfig,
} from './operation-logs/index.js';

export { createGenericRecordModule } from './generic-records/index.js';
export type {
  GenericRecord,
  CreateGenericRecordInput,
  UpdateGenericRecordInput,
  GenericRecordQueryFilter,
  GenericRecordModuleConfig,
} from './generic-records/index.js';

export {
  createSingleModeRecordsModule,
  createPartitionedModeRecordsModule,
} from './mode-records/index.js';
export type {
  ModeRecordItem,
  ModeRecordDescriptor,
  SingleModeRecordDescriptor,
  PartitionedModeRecordDescriptor,
  PartitionLocate,
  CreateModeRecordInput,
  UpdateModeRecordInput,
  SingleModeRecordsModuleConfig,
  PartitionedModeRecordsModuleConfig,
} from './mode-records/index.js';

export { createClientConfigModule } from './client-config/index.js';
export type {
  ClientConfig,
  RegisterClientInput,
  UpdateClientInput,
  ClientConfigModuleConfig,
} from './client-config/index.js';

export { createMasterDataModule, createTrackedStorageAdapter } from './master-data/index.js';
export type {
  MasterDataCache,
  MasterDataHashes,
  MasterDataModuleConfig,
} from './master-data/index.js';

export {
  BASE_PERMISSIONS,
  CRUD_KEYS,
  deepMergePermissions,
  resolvePermissions,
} from './permissions/index.js';
export type {
  ModulePermissions,
  PartialModulePermissions,
  PartialPermissions,
  Permissions,
} from './permissions/index.js';

export { createStorageAdapter } from './core/storage.js';
export { ModuleError, NotFoundError, ValidationError } from './core/errors.js';
export type {
  StorageAdapter,
  StorageMode,
  BaseModuleConfig,
  RecordMeta,
  RecordEnvelope,
} from './core/types.js';
