import type { DateTimeInput, NullableDateTimeInput } from '@credo/kits/types';

export type Employee<TExtra = Record<string, unknown>> = {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  isActive: boolean;
  extra: TExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  version: string;
};

type BaseMutationRequest = {
  
  expectedListHash?: string;
};

type BaseMutationResponse = {
  success: boolean;
  
  listHash?: string;
};

type BaseItemMutationRequest = BaseMutationRequest & {
  id: string;
  
  version: string;
};

type BaseDeleteResponse = BaseMutationResponse & {
  message: string;
};

type BaseSearchRequest = {
  search?: string;
  isActive?: boolean;
};

type BaseImportBatchRequest<T> = {
  items: T[];
};

type BaseImportBatchResponse<T> = BaseMutationResponse & {
  summary: { total: number; created: number; errors: number };
  created: T[];
  errors: Array<{ index: number; message: string }>;
};

export type GetAllEmployeesRequest = {
  hash?: string;
};
export type GetAllEmployeesResponse<TExtra = Record<string, unknown>> =
  | { success: true; changed: true; employees: Employee<TExtra>[]; hash?: string | undefined }
  | { success: true; changed: false; hash?: string | undefined };

export type SearchEmployeesRequest = BaseSearchRequest;
export type SearchEmployeesResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  employees: Employee<TExtra>[];
};

export type GetEmployeeByIdRequest = {
  id: string;
};

export type GetEmployeeByIdResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  employee: Employee<TExtra>;
};

export type CreateEmployeeRequest<TExtra = Record<string, unknown>> = BaseMutationRequest & {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  extra?: TExtra;
};
export type CreateEmployeeResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  employee: Employee<TExtra>;
  
  ssoWarning?: string;
  ssoError?: unknown;
};

export type UpdateEmployeeRequest<TExtra = Record<string, unknown>> = BaseItemMutationRequest & {
  name?: string;
  code?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  isActive?: boolean;
  extra?: TExtra;
};

export type UpdateEmployeeResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  employee: Employee<TExtra>;
  
  ssoWarning?: string;
  ssoError?: unknown;
  
  loginPassword?: string;
};

export type ImportBatchEmployeesRequest<TExtra = Record<string, unknown>> = BaseImportBatchRequest<
  CreateEmployeeRequest<TExtra>
>;

export type ImportBatchEmployeesResponse<TExtra = Record<string, unknown>> =
  BaseImportBatchResponse<Employee<TExtra>> & {
    
    ssoFailed?: number;
    
    ssoWarning?: string;
  };

export type GenerateEmployeeLoginTokenRequest = {
  id: string;
  
  expiration?: number;
};
export type GenerateEmployeeLoginTokenResponse = {
  success: boolean;
  token?: string;
  
  message?: string;
};

export type UpdateEmployeeLoginPasswordRequest = {
  id: string;
  
  password?: string;
};
export type UpdateEmployeeLoginPasswordResponse = {
  success: boolean;
  loginPassword?: string;
  
  ssoWarning?: string;
  message?: string;
};

export type Product<TExtra = Record<string, unknown>> = {
  id: string;
  name: string;
  code: string;
  description: string;
  unit: string;
  price: number;
  isActive: boolean;
  extra: TExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  version: string;
};

export type GetAllProductsRequest = {
  hash?: string;
};
export type GetAllProductsResponse<TExtra = Record<string, unknown>> =
  | { success: true; changed: true; products: Product<TExtra>[]; hash?: string | undefined }
  | { success: true; changed: false; hash?: string | undefined };

export type SearchProductsRequest = BaseSearchRequest;
export type SearchProductsResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  products: Product<TExtra>[];
};

export type GetProductByIdRequest = {
  id: string;
};
export type GetProductByIdResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  product: Product<TExtra>;
};

export type CreateProductRequest<TExtra = Record<string, unknown>> = BaseMutationRequest & {
  name: string;
  code: string;
  description?: string;
  unit: string;
  price: number;
  extra?: TExtra;
};
export type CreateProductResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  product: Product<TExtra>;
};

export type ImportBatchProductsRequest<TExtra = Record<string, unknown>> = BaseImportBatchRequest<
  CreateProductRequest<TExtra>
>;

export type ImportBatchProductsResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  summary: { total: number; created: number; updated: number; errors: number };
  created: Product<TExtra>[];
  updated: Product<TExtra>[];
  errors: Array<{ index: number; message: string }>;
};

export type UpdateProductRequest<TExtra = Record<string, unknown>> = BaseItemMutationRequest & {
  name?: string;
  code?: string;
  description?: string;
  unit?: string;
  price?: number;
  isActive?: boolean;
  extra?: TExtra;
};
export type UpdateProductResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  product: Product<TExtra>;
};

export type DeleteProductRequest = BaseItemMutationRequest;
export type DeleteProductResponse = BaseDeleteResponse;

export type ClientConfig<TExtra = Record<string, unknown>> = {
  clientServiceCode: string;
  clientName: string;
  description: string;
  contactEmail: string;
  domains: string[];
  isActive: boolean;
  extra: TExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  version: string;
};

export type RegisterClientRequest<TExtra = Record<string, unknown>> = BaseMutationRequest & {
  clientServiceCode: string;
  clientName: string;
  description?: string;
  contactEmail?: string;
  domains: string[];
  extra?: TExtra;
};
export type RegisterClientResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  clientConfig: ClientConfig<TExtra>;
};

export type ProvisionClientRequest<TExtra = Record<string, unknown>> = BaseMutationRequest & {
  clientServiceCode: string;
  clientName: string;
  description?: string;
  contactEmail?: string;
  domains: string[];
  rootEmail: string;
  
  rootPassword?: string;
  
  ssoAdminAccessKey: string;
  extra?: TExtra;
};
export type ProvisionClientResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  clientConfig: ClientConfig<TExtra>;
  ssoServiceCode: string;
  operatorAccessKey: string;
  rootEmail: string;
  rootPassword: string;
};

export type ListClientsResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  clients: ClientConfig<TExtra>[];
};

export type EnableClientRequest = BaseMutationRequest & {
  clientServiceCode: string;
  version: string;
};
export type EnableClientResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  clientConfig: ClientConfig<TExtra>;
};

export type DisableClientRequest = BaseMutationRequest & {
  clientServiceCode: string;
  version: string;
};
export type DisableClientResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  clientConfig: ClientConfig<TExtra>;
};

export type RemoveClientRequest = BaseMutationRequest & {
  clientServiceCode: string;
  version: string;
};
export type RemoveClientResponse = BaseDeleteResponse;

export type GetClientByServiceCodeRequest = {
  clientServiceCode: string;
};
export type GetClientByServiceCodeResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  clientConfig: ClientConfig<TExtra>;
};

import type { CMngtAppConfig, CMngtEmployeeFeatures } from '@credo/kits/types';

export type SetAppConfigRequest = {
  clientServiceCode: string;
  config: CMngtAppConfig;
};
export type SetAppConfigResponse = {
  success: boolean;
  config: CMngtAppConfig;
};

export type GetAppConfigAdminRequest = {
  clientServiceCode: string;
};
export type GetAppConfigAdminResponse = {
  success: boolean;
  config: CMngtAppConfig | null;
};

export type Location<TExtra = Record<string, unknown>> = {
  id: string;
  name: string;
  code: string;
  description: string;
  address: string;
  isActive: boolean;
  extra: TExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  version: string;
};

export type GetAllLocationsRequest = {
  hash?: string;
};
export type GetAllLocationsResponse<TExtra = Record<string, unknown>> =
  | { success: true; changed: true; locations: Location<TExtra>[]; hash?: string | undefined }
  | { success: true; changed: false; hash?: string | undefined };

export type SearchLocationsRequest = BaseSearchRequest;
export type SearchLocationsResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  locations: Location<TExtra>[];
};

export type GetLocationByIdRequest = {
  id: string;
};
export type GetLocationByIdResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  location: Location<TExtra>;
};

export type CreateLocationRequest<TExtra = Record<string, unknown>> = BaseMutationRequest & {
  name: string;
  code: string;
  description?: string;
  address?: string;
  extra?: TExtra;
};
export type CreateLocationResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  location: Location<TExtra>;
};

export type ImportBatchLocationsRequest<TExtra = Record<string, unknown>> = BaseImportBatchRequest<
  CreateLocationRequest<TExtra>
>;
export type ImportBatchLocationsResponse<TExtra = Record<string, unknown>> =
  BaseImportBatchResponse<Location<TExtra>>;

export type UpdateLocationRequest<TExtra = Record<string, unknown>> = BaseItemMutationRequest & {
  name?: string;
  code?: string;
  description?: string;
  address?: string;
  isActive?: boolean;
  extra?: TExtra;
};
export type UpdateLocationResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  location: Location<TExtra>;
};

export type DeleteLocationRequest = BaseItemMutationRequest;
export type DeleteLocationResponse = BaseDeleteResponse;

export type OperationLog<TExtra = Record<string, unknown>> = {
  id: string;
  
  targetId: string;
  
  targetCode: string;
  
  logType: string;
  
  logDate: DateTimeInput;
  extra: TExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  version: string;
};

export type GetOperationLogsByTargetRequest = {
  targetId: string;
  
  period: string;
};
export type GetOperationLogsByTargetResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  operationLogs: OperationLog<TExtra>[];
};

export type CreateOperationLogRequest<TExtra = Record<string, unknown>> = {
  
  targetId: string;
  
  targetCode: string;
  logType: string;
  logDate: DateTimeInput;
  extra?: TExtra;
};
export type CreateOperationLogResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  operationLog: OperationLog<TExtra>;
};

export type UpdateOperationLogRequest<TExtra = Record<string, unknown>> = {
  id: string;
  
  targetId: string;
  
  period: string;
  version: string;
  logType?: string;
  
  logDate?: DateTimeInput;
  extra?: TExtra;
};
export type UpdateOperationLogResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  operationLog: OperationLog<TExtra>;
};

export type DeleteOperationLogRequest = {
  id: string;
  
  targetId: string;
  
  period: string;
  version: string;
};
export type DeleteOperationLogResponse = {
  success: boolean;
  message: string;
};

export type GenericRecord<TExtra = Record<string, unknown>> = {
  id: string;
  
  recordType: string;
  
  targetId?: string;
  
  targetCode?: string;
  
  recordDate: DateTimeInput;
  extra: TExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  version: string;
};

export type QueryGenericRecordsRequest = {
  
  recordType: string;
  fromPeriod?: string;
  toPeriod?: string;
};
export type QueryGenericRecordsResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  records: GenericRecord<TExtra>[];
};

export type QueryGenericRecordsSyncRequest = PartitionedQuerySyncRequest & {
  
  recordType: string;
};
export type QueryGenericRecordsSyncResponse<TExtra = Record<string, unknown>> =
  PartitionedQuerySyncResponse<GenericRecord<TExtra>>;

export type CreateGenericRecordRequest<TExtra = Record<string, unknown>> = {
  recordType: string;
  targetId?: string;
  targetCode?: string;
  recordDate: DateTimeInput;
  extra?: TExtra;
};
export type CreateGenericRecordResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  record: GenericRecord<TExtra>;
};

export type UpdateGenericRecordRequest<TExtra = Record<string, unknown>> = {
  id: string;
  
  recordType: string;
  period: string;
  version: string;
  recordDate?: DateTimeInput;
  targetCode?: string;
  extra?: TExtra;
};
export type UpdateGenericRecordResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  record: GenericRecord<TExtra>;
};

export type DeleteGenericRecordRequest = {
  id: string;
  
  recordType: string;
  period: string;
  version: string;
};
export type DeleteGenericRecordResponse = {
  success: boolean;
  message: string;
};

export type ProductInventory<TExtra = Record<string, unknown>> = {
  id: string;
  itemCode: string;
  locationCode: string;
  onHand: number;
  extra: TExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  version: string;
};

export type GetAllProductInventoryRequest = {
  hash?: string;
};
export type GetAllProductInventoryResponse<TExtra = Record<string, unknown>> =
  | {
      success: true;
      changed: true;
      productInventory: ProductInventory<TExtra>[];
      hash?: string | undefined;
    }
  | { success: true; changed: false; hash?: string | undefined };

export type SearchProductInventoryRequest = {
  search?: string;
  itemCode?: string;
  locationCode?: string;
};
export type SearchProductInventoryResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  productInventory: ProductInventory<TExtra>[];
};

export type GetProductInventoryByIdRequest = {
  id: string;
};
export type GetProductInventoryByIdResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  entry: ProductInventory<TExtra>;
};

export type CreateProductInventoryRequest<TExtra = Record<string, unknown>> =
  BaseMutationRequest & {
    itemCode: string;
    locationCode: string;
    onHand: number;
    extra?: TExtra;
  };
export type CreateProductInventoryResponse<TExtra = Record<string, unknown>> =
  BaseMutationResponse & {
    entry: ProductInventory<TExtra>;
  };

export type ImportBatchProductInventoryRequest<TExtra = Record<string, unknown>> =
  BaseImportBatchRequest<CreateProductInventoryRequest<TExtra>>;

export type ImportBatchProductInventoryResponse<TExtra = Record<string, unknown>> =
  BaseMutationResponse & {
    summary: { total: number; created: number; updated: number; errors: number };
    created: ProductInventory<TExtra>[];
    updated: ProductInventory<TExtra>[];
    errors: Array<{ index: number; message: string }>;
  };

export type UpdateProductInventoryRequest<TExtra = Record<string, unknown>> =
  BaseItemMutationRequest & {
    onHand?: number;
    extra?: TExtra;
  };
export type UpdateProductInventoryResponse<TExtra = Record<string, unknown>> =
  BaseMutationResponse & {
    entry: ProductInventory<TExtra>;
  };

export type DeleteProductInventoryRequest = BaseItemMutationRequest;
export type DeleteProductInventoryResponse = BaseDeleteResponse;

export type LookupItem<TExtra = Record<string, unknown>> = {
  id: string;
  category: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  extra: TExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  version: string;
};

export type GetAllLookupsRequest = {
  hash?: string;
};
export type GetAllLookupsResponse<TExtra = Record<string, unknown>> =
  | { success: true; changed: true; lookups: LookupItem<TExtra>[]; hash?: string | undefined }
  | { success: true; changed: false; hash?: string | undefined };

export type SearchLookupsRequest = BaseSearchRequest & {
  category?: string;
};
export type SearchLookupsResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  lookups: LookupItem<TExtra>[];
};

export type GetLookupsByCategoryRequest = {
  category: string;
};
export type GetLookupsByCategoryResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  lookups: LookupItem<TExtra>[];
};

export type GetLookupByIdRequest = {
  id: string;
};
export type GetLookupByIdResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  lookup: LookupItem<TExtra>;
};

export type CreateLookupRequest<TExtra = Record<string, unknown>> = BaseMutationRequest & {
  category: string;
  value: string;
  label: string;
  sortOrder?: number;
  extra?: TExtra;
};
export type CreateLookupResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  lookup: LookupItem<TExtra>;
};

export type ImportBatchLookupsRequest<TExtra = Record<string, unknown>> = BaseImportBatchRequest<
  CreateLookupRequest<TExtra>
>;
export type ImportBatchLookupsResponse<TExtra = Record<string, unknown>> = BaseImportBatchResponse<
  LookupItem<TExtra>
>;

export type UpdateLookupRequest<TExtra = Record<string, unknown>> = BaseItemMutationRequest & {
  value?: string;
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
  extra?: TExtra;
};
export type UpdateLookupResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  lookup: LookupItem<TExtra>;
};

export type DeleteLookupRequest = BaseItemMutationRequest;
export type DeleteLookupResponse<TExtra = Record<string, unknown>> = BaseDeleteResponse & {
  lookup: LookupItem<TExtra>;
};

export type MasterDataHashes = {
  employees?: string;
  products?: string;
  locations?: string;
  lookups?: string;
};

export type MasterDataEntities = {
  employees?: Employee[];
  products?: Product[];
  locations?: Location[];
  lookups?: LookupItem[];
};

export type GetAllMasterDataRequest = {
  employeesHash?: string;
  productsHash?: string;
  locationsHash?: string;
  lookupsHash?: string;
};

export type GetAllMasterDataResponse =
  | { success: true; changed: false; hashes: MasterDataHashes }
  | { success: true; changed: true; updated: MasterDataEntities; hashes: MasterDataHashes };

export type ResyncMasterDataResponse = {
  success: boolean;
  resynced: string[];
};

export type GetAppConfigRequest = {
  clientServiceCode: string;
};
export type GetAppConfigResponse = {
  success: boolean;
  config: CMngtAppConfig | null;
};

export type SetEmployeeConfigRequest = {
  employees: Pick<
    CMngtEmployeeFeatures,
    'departmentOptions' | 'positionOptions' | 'driverDepartments'
  >;
};
export type SetEmployeeConfigResponse = {
  success: boolean;
  
  config: CMngtAppConfig;
};

export type SalesOrderItem = {
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  
  fromLocationCode?: string;
};

export type SalesOrder<TExtra = Record<string, unknown>> = {
  id: string;
  orderNumber: string;
  
  customerName: string;
  items: SalesOrderItem[];
  isClosed: boolean;
  totalAmount: number;
  notes: string;
  extra: TExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  closedAt?: NullableDateTimeInput;
  version: string;
};

export type PartitionHashMap = Record<string, string>;

export type PartitionedQuerySyncRequest = {
  fromPeriod: string;
  toPeriod: string;
  
  partitionHashes?: PartitionHashMap;
};

export type PartitionedQuerySyncResponse<T> =
  | {
      success: true;
      changed: true;
      updated: Record<string, T[]>;
      hashes: PartitionHashMap;
      emptyDates: string[];
    }
  | {
      success: true;
      changed: false;
      hashes: PartitionHashMap;
      emptyDates: string[];
    };

export type QuerySalesOrdersRequest = {
  fromPeriod: string;
  toPeriod: string;
};
export type QuerySalesOrdersResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  salesOrders: SalesOrder<TExtra>[];
};

export type QuerySalesOrdersSyncRequest = PartitionedQuerySyncRequest;
export type QuerySalesOrdersSyncResponse<TExtra = Record<string, unknown>> =
  PartitionedQuerySyncResponse<SalesOrder<TExtra>>;

export type GetSalesOrderByIdRequest = {
  id: string;
};
export type GetSalesOrderByIdResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  salesOrder: SalesOrder<TExtra>;
};

export type CreateSalesOrderRequest<TExtra = Record<string, unknown>> = {
  orderNumber: string;
  customerName: string;
  items: SalesOrderItem[];
  notes?: string;
  extra?: TExtra;
};

export type CreateSalesOrderResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  salesOrder: SalesOrder<TExtra>;
};

export type UpdateSalesOrderRequest<TExtra = Record<string, unknown>> = {
  id: string;
  version: string;
  customerName?: string;
  items?: SalesOrderItem[];
  notes?: string;
  isClosed?: boolean;
  extra?: TExtra;
};

export type UpdateSalesOrderResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  salesOrder: SalesOrder<TExtra>;
};

export type DeliveryRequestItem = {
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  
  fromLocationCode?: string;
};

export type DeliveryRequestDirection = 'outbound' | 'inbound';

export type DeliveryRequest<TExtra = Record<string, unknown>> = {
  id: string;
  requestNumber: string;
  
  direction?: DeliveryRequestDirection;
  
  salesOrderId?: string;
  salesOrderNumber?: string;
  
  customerName?: string;
  
  vendorCode?: string;
  vendorName?: string;
  items: DeliveryRequestItem[];
  scheduledDate?: DateTimeInput | undefined;
  isClosed: boolean;
  totalAmount: number;
  notes: string;
  extra: TExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  closedAt?: NullableDateTimeInput;
  version: string;
};

export type QueryDeliveryRequestsRequest = {
  fromPeriod: string;
  toPeriod: string;
};
export type QueryDeliveryRequestsResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  deliveryRequests: DeliveryRequest<TExtra>[];
};

export type QueryDeliveryRequestsSyncRequest = PartitionedQuerySyncRequest;
export type QueryDeliveryRequestsSyncResponse<TExtra = Record<string, unknown>> =
  PartitionedQuerySyncResponse<DeliveryRequest<TExtra>>;

export type GetDeliveryRequestByIdRequest = {
  id: string;
};
export type GetDeliveryRequestByIdResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  deliveryRequest: DeliveryRequest<TExtra>;
};

export type GetDeliveryRequestsByIdsRequest = {
  ids: string[];
};
export type GetDeliveryRequestsByIdsResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  deliveryRequests: DeliveryRequest<TExtra>[];
};

export type CreateDeliveryRequestRequest<TExtra = Record<string, unknown>> = {
  requestNumber: string;
  
  direction?: DeliveryRequestDirection;
  
  salesOrderId?: string;
  salesOrderNumber?: string;
  customerName?: string;
  
  vendorCode?: string;
  vendorName?: string;
  items: DeliveryRequestItem[];
  scheduledDate?: DateTimeInput | undefined;
  notes?: string;
  extra?: TExtra;
};
export type CreateDeliveryRequestResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  deliveryRequest: DeliveryRequest<TExtra>;
};

export type UpdateDeliveryRequestRequest<TExtra = Record<string, unknown>> = {
  id: string;
  version: string;
  customerName?: string;
  
  vendorCode?: string;
  vendorName?: string;
  items?: DeliveryRequestItem[];
  scheduledDate?: DateTimeInput | undefined;
  notes?: string;
  isClosed?: boolean;
  extra?: TExtra;
};
export type UpdateDeliveryRequestResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  deliveryRequest: DeliveryRequest<TExtra>;
};

export type GoodsReceiptItemType = 'product';

export type GoodsReceiptItem = {
  itemType: GoodsReceiptItemType;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  note?: string;
};

export type GoodsReceiptStatus = 'draft' | 'received' | 'cancelled';

export type GoodsReceipt<TExtra = Record<string, unknown>> = {
  id: string;
  receiptNumber: string;
  vendorCode: string;
  vendorName: string;
  locationCode: string;
  locationName: string;
  receivedDate: NullableDateTimeInput;
  reference: string;
  status: GoodsReceiptStatus;
  items: GoodsReceiptItem[];
  totalQuantity: number;
  notes: string;
  extra: TExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  receivedAt: DateTimeInput | null;
  cancelledAt: DateTimeInput | null;
  version: string;
};

export type QueryGoodsReceiptsRequest = {
  fromPeriod?: string;
  toPeriod?: string;
  vendorCode?: string;
  locationCode?: string;
  search?: string;
};
export type QueryGoodsReceiptsResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  goodsReceipts: GoodsReceipt<TExtra>[];
};

export type QueryGoodsReceiptsSyncRequest = PartitionedQuerySyncRequest;
export type QueryGoodsReceiptsSyncResponse<TExtra = Record<string, unknown>> =
  PartitionedQuerySyncResponse<GoodsReceipt<TExtra>>;

export type GetGoodsReceiptByIdRequest = {
  id: string;
};
export type GetGoodsReceiptByIdResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  goodsReceipt: GoodsReceipt<TExtra>;
};

export type CreateGoodsReceiptRequest<TExtra = Record<string, unknown>> = {
  receiptNumber: string;
  vendorCode: string;
  vendorName: string;
  locationCode: string;
  locationName: string;
  receivedDate: string;
  items: GoodsReceiptItem[];
  reference?: string;
  notes?: string;
  extra?: TExtra;
};
export type CreateGoodsReceiptResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  goodsReceipt: GoodsReceipt<TExtra>;
};

export type UpdateGoodsReceiptRequest<TExtra = Record<string, unknown>> = {
  id: string;
  version: string;
  status?: GoodsReceiptStatus;
  vendorCode?: string;
  vendorName?: string;
  locationCode?: string;
  locationName?: string;
  receivedDate?: NullableDateTimeInput;
  items?: GoodsReceiptItem[];
  reference?: string;
  notes?: string;
  extra?: TExtra;
};
export type UpdateGoodsReceiptResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  goodsReceipt: GoodsReceipt<TExtra>;
};

export type PurchaseOrderItem = {
  quantity: number;
  unit: string;
  unitPrice: number;
};

export type PurchaseOrderStatus = 'draft' | 'confirmed' | 'received' | 'closed';

export type PurchaseOrder<TExtra = Record<string, unknown>> = {
  id: string;
  orderNumber: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  status: PurchaseOrderStatus;
  totalAmount: number;
  notes: string;
  extra: TExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  closedAt?: NullableDateTimeInput;
};

export type QueryPurchaseOrdersRequest = {
  fromPeriod: string;
  toPeriod: string;
};
export type QueryPurchaseOrdersResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  purchaseOrders: PurchaseOrder<TExtra>[];
};

export type GetPurchaseOrderByIdRequest = {
  id: string;
};
export type GetPurchaseOrderByIdResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  purchaseOrder: PurchaseOrder<TExtra>;
};

export type CreatePurchaseOrderRequest<TExtra = Record<string, unknown>> = {
  orderNumber: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  notes?: string;
  extra?: TExtra;
};
export type CreatePurchaseOrderResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  purchaseOrder: PurchaseOrder<TExtra>;
};

export type UpdatePurchaseOrderRequest<TExtra = Record<string, unknown>> = {
  id: string;
  supplierName?: string;
  items?: PurchaseOrderItem[];
  notes?: string;
  status?: 'confirmed' | 'received';
  extra?: TExtra;
};
export type UpdatePurchaseOrderResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  purchaseOrder: PurchaseOrder<TExtra>;
};

export type ClosePurchaseOrderRequest = {
  id: string;
};
export type ClosePurchaseOrderResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  purchaseOrder: PurchaseOrder<TExtra>;
};

export type ModeRecordItem = {
  id: string;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  
  version: string;
} & Record<string, unknown>;

export type RecordPartitionLocate =
  | 'creation:day'
  | 'creation:month'
  | 'creation:year'
  | 'explicit';

export type SingleRecordDescriptorHeader = {
  
  uniqueField?: string | string[];
};

export type PartitionedRecordDescriptorHeader = {
  
  partitionLocate: RecordPartitionLocate;
  uniqueField?: string | string[];
};

export type SingleRecordTarget = { entity: string } & SingleRecordDescriptorHeader;

export type PartitionedRecordTarget = { entity: string } & PartitionedRecordDescriptorHeader;

export type GetAllSingleRecordsRequest = {
  
  hash?: string;
};
export type GetAllSingleRecordsResponse = {
  success: boolean;
  changed: boolean;
  
  items?: ModeRecordItem[];
  hash?: string;
};

export type GetSingleRecordByIdRequest = {
  id: string;
};
export type GetSingleRecordByIdResponse = {
  success: boolean;
  item: ModeRecordItem;
};

export type CreateSingleRecordRequest = {
  
  item: Record<string, unknown>;
  
  expectedListHash?: string;
};
export type CreateSingleRecordResponse = {
  success: boolean;
  item: ModeRecordItem;
  
  listHash?: string;
};

export type UpdateSingleRecordRequest = {
  id: string;
  
  version: string;
  
  patch: Record<string, unknown>;
  expectedListHash?: string;
};
export type UpdateSingleRecordResponse = {
  success: boolean;
  item: ModeRecordItem;
  listHash?: string;
};

export type DeleteSingleRecordRequest = {
  id: string;
  version?: string;
  expectedListHash?: string;
};
export type DeleteSingleRecordResponse = {
  success: boolean;
  message: string;
  listHash?: string;
};

export type ImportBatchSingleRecordsRequest = {
  
  items: Array<Record<string, unknown>>;
};
export type ImportBatchSingleRecordsResponse = {
  success: boolean;
  summary: { total: number; created: number; updated: number; errors: number };
  created: ModeRecordItem[];
  updated: ModeRecordItem[];
  errors: Array<{ index: number; message: string }>;
  
  listHash?: string;
};

export type QueryPartitionedRecordsRequest = {
  
  partitionKeys: string[];
};
export type QueryPartitionedRecordsResponse = {
  success: boolean;
  items: ModeRecordItem[];
};

export type QueryPartitionedRecordsSyncRequest = {
  partitionKeys: string[];
  
  partitionHashes?: PartitionHashMap;
};

export type QueryPartitionedRecordsSyncResponse =
  | {
      success: true;
      changed: true;
      updated: Record<string, ModeRecordItem[]>;
      hashes: PartitionHashMap;
      emptyKeys: string[];
    }
  | {
      success: true;
      changed: false;
      hashes: PartitionHashMap;
      emptyKeys: string[];
    };

export type GetPartitionedRecordByIdRequest = {
  id: string;
  
  partitionKey?: string;
};
export type GetPartitionedRecordByIdResponse = {
  success: boolean;
  item: ModeRecordItem;
  partitionKey: string;
};

export type CreatePartitionedRecordRequest = {
  item: Record<string, unknown>;
  
  partitionKey?: string;
  expectedListHash?: string;
};
export type CreatePartitionedRecordResponse = {
  success: boolean;
  item: ModeRecordItem;
  
  partitionKey: string;
  
  listHash?: string;
};

export type UpdatePartitionedRecordRequest = {
  id: string;
  version: string;
  patch: Record<string, unknown>;
  
  partitionKey?: string;
  
  newPartitionKey?: string;
  expectedListHash?: string;
};
export type UpdatePartitionedRecordResponse = {
  success: boolean;
  item: ModeRecordItem;
  
  partitionKey: string;
  listHash?: string;
};

export type DeletePartitionedRecordRequest = {
  id: string;
  version?: string;
  partitionKey?: string;
  expectedListHash?: string;
};
export type DeletePartitionedRecordResponse = {
  success: boolean;
  message: string;
  
  partitionKey?: string;
  listHash?: string;
};
