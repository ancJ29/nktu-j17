import { PORTS } from '@credo/kits/port';

import { createApiGroup } from '../shared/api-group';

import type { LoginRequest, LoginWithTokenRequest } from '../c-sso/types';
import { targets, urls } from '../shared/config';
import { registerStagePrefix } from '../shared/transport-state';
import { CREDO_SME_ROUTES } from './routes';
import type {
  ArchiveCustomerRequest,
  ArchiveCustomerResponse,
  ArchiveMaterialRequest,
  ArchiveMaterialResponse,
  ArchiveProductRequest,
  ArchiveProductResponse,
  ArchiveVendorRequest,
  ArchiveVendorResponse,
  AuthMintResponse,
  CreateCustomerRequest,
  CreateCustomerResponse,
  CreateMaterialRequest,
  CreateMaterialResponse,
  CreateProductRequest,
  CreateProductResponse,
  CreateLookupRequest,
  CreateLookupResponse,
  CreateVendorRequest,
  CreateVendorResponse,
  DeleteLookupRequest,
  DeleteLookupResponse,
  GetAllCustomersRequest,
  GetAllCustomersResponse,
  GetAllMaterialInventoryRequest,
  GetAllMaterialInventoryResponse,
  GetAllMaterialsRequest,
  GetAllMaterialsResponse,
  GetAllProductInventoryRequest,
  GetAllProductInventoryResponse,
  GetAllProductsRequest,
  GetAllProductsResponse,
  GetAllLookupsRequest,
  GetAllLookupsResponse,
  ArchiveEmployeeRequest,
  GenerateEmployeeLoginTokenRequest,
  GenerateEmployeeLoginTokenResponse,
  ArchiveEmployeeResponse,
  CreateEmployeeRequest,
  CreateEmployeeResponse,
  GetAllEmployeesRequest,
  GetAllEmployeesResponse,
  GetEmployeeByIdResponse,
  UpdateEmployeeLoginPasswordRequest,
  UpdateEmployeeLoginPasswordResponse,
  UpdateEmployeeRequest,
  UpdateEmployeeResponse,
  GetAllVendorsRequest,
  GetAllVendorsResponse,
  GetAppConfigAdminResponse,
  GetMeNoChangeResponse,
  GetMeResponse,
  ImportBatchLookupsRequest,
  ImportBatchLookupsResponse,
  ListClientsResponse,
  LogActivitiesRequest,
  LogActivitiesResponse,
  ProvisionClientRequest,
  ProvisionClientResponse,
  RemoveClientRequest,
  RemoveClientResponse,
  ReportPermissionMismatchRequest,
  ReportPermissionMismatchResponse,
  SetAppConfigRequest,
  SetAppConfigResponse,
  SetMaterialInventoryRequest,
  SetMaterialInventoryResponse,
  SetProductInventoryRequest,
  SetProductInventoryResponse,
  CreateGoodsReceiptRequest,
  CreateGoodsReceiptResponse,
  CreateDeliveryNoteRequest,
  CreateDeliveryNoteResponse,
  CreateSalesOrderRequest,
  CreateSalesOrderResponse,
  GetGoodsReceiptByIdResponse,
  DeliveryNoteInventoryRequest,
  DeliveryNoteInventoryResponse,
  GetDeliveryNoteByIdResponse,
  GetSalesOrderByIdResponse,
  QuerySyncGoodsReceiptsRequest,
  QuerySyncGoodsReceiptsResponse,
  QuerySyncDeliveryNotesRequest,
  QuerySyncDeliveryNotesResponse,
  QuerySyncSalesOrdersRequest,
  QuerySyncSalesOrdersResponse,
  SalesOrderInventoryRequest,
  SalesOrderInventoryResponse,
  SetSalesOrderPaymentRequest,
  SetSalesOrderPaymentResponse,
  TransitionGoodsReceiptRequest,
  TransitionGoodsReceiptResponse,
  TransitionDeliveryNoteRequest,
  TransitionDeliveryNoteResponse,
  TransitionSalesOrderRequest,
  TransitionSalesOrderResponse,
  UpdateGoodsReceiptRequest,
  UpdateGoodsReceiptResponse,
  UpdateDeliveryNoteRequest,
  UpdateDeliveryNoteResponse,
  UpdateSalesOrderRequest,
  UpdateSalesOrderResponse,
  UpdateCustomerRequest,
  UpdateCustomerResponse,
  UpdateMaterialRequest,
  UpdateMaterialResponse,
  UpdateProductRequest,
  UpdateProductResponse,
  UpdateLookupRequest,
  UpdateLookupResponse,
  UpdateVendorRequest,
  UpdateVendorResponse,
} from './types';

export * from './routes';

const storages = {
  target: targets['cCredoSme'] || '',
  accessKey: '',
  deviceId: '',
  clientCode: '',

  authId: '',
  stage: '$default',
  baseUrl: urls['cCredoSme'] || '',
};

registerStagePrefix(storages.baseUrl, storages.target);

const ADMIN_CLIENT_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.ADMIN_CLIENT;
const ADMIN_CONFIG_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.ADMIN_CONFIG;
const AUTH_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.AUTH;
const ACTIVITY_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.ACTIVITY;
const EMPLOYEE_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.EMPLOYEE;
const LOOKUP_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.LOOKUP;
const VENDOR_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.VENDOR;
const CUSTOMER_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.CUSTOMER;
const PRODUCT_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.PRODUCT;
const MATERIAL_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.MATERIAL;
const GOODS_RECEIPT_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.GOODS_RECEIPT;
const SALES_ORDER_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.SALES_ORDER;
const DELIVERY_NOTE_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.DELIVERY_NOTE;
const PRODUCT_INVENTORY_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.PRODUCT_INVENTORY;
const MATERIAL_INVENTORY_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.MATERIAL_INVENTORY;

const getBaseUrl = () => storages.baseUrl;

const sessionHeaders = (): Record<string, string> => ({
  'x-client-code': storages.clientCode,
  ...(storages.authId ? { 'x-auth-id': storages.authId } : {}),
});

const adminClientApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.ADMIN_CLIENT,
  getBaseUrl,
  defaults: { accessKeyRequired: true },
});

const adminConfigApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.ADMIN_CONFIG,
  getBaseUrl,
  defaults: { accessKeyRequired: true },
});

const authApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.AUTH,
  getBaseUrl,
});

const activityApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.ACTIVITY,
  getBaseUrl,
});

const employeeApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.EMPLOYEE,
  getBaseUrl,
});

const lookupApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.LOOKUP,
  getBaseUrl,
});

const vendorApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.VENDOR,
  getBaseUrl,
});

const customerApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.CUSTOMER,
  getBaseUrl,
});

const productApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.PRODUCT,
  getBaseUrl,
});

const materialApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.MATERIAL,
  getBaseUrl,
});

const productInventoryApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.PRODUCT_INVENTORY,
  getBaseUrl,
});

const materialInventoryApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.MATERIAL_INVENTORY,
  getBaseUrl,
});

const goodsReceiptApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.GOODS_RECEIPT,
  getBaseUrl,
});

const salesOrderApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.SALES_ORDER,
  getBaseUrl,
});

const deliveryNoteApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.DELIVERY_NOTE,
  getBaseUrl,
});

export const credoSmeConnector = {
  useLocal: () => {
    return credoSmeConnector.setBaseUrl(`http://localhost:${PORTS.CREDO_SME}/dev`);
  },

  setTarget: (target: string) => {
    storages.target = target;

    registerStagePrefix(storages.baseUrl, target);
    return credoSmeConnector;
  },

  setBaseUrl: (baseUrl: string) => {
    storages.baseUrl = baseUrl;
    registerStagePrefix(baseUrl, storages.target);
    return credoSmeConnector;
  },
  setAccessKey: (accessKey: string) => {
    storages.accessKey = accessKey;
    return credoSmeConnector;
  },
  setClientCode: (clientCode: string) => {
    storages.clientCode = clientCode;
    return credoSmeConnector;
  },

  setDeviceId: (deviceId: string) => {
    storages.deviceId = deviceId;
    return credoSmeConnector;
  },

  setAuthId: (authId: string) => {
    storages.authId = authId;
    return credoSmeConnector;
  },

  provisionClient: <TExtra = Record<string, unknown>>(request: ProvisionClientRequest<TExtra>) =>
    adminClientApi<ProvisionClientResponse<TExtra>>(ADMIN_CLIENT_ROUTES.PROVISION, {
      body: request,
    }),

  listClients: <TExtra = Record<string, unknown>>() =>
    adminClientApi<ListClientsResponse<TExtra>>(ADMIN_CLIENT_ROUTES.LIST),

  removeClient: ({ clientServiceCode, ...body }: RemoveClientRequest) =>
    adminClientApi<RemoveClientResponse>(ADMIN_CLIENT_ROUTES.REMOVE, {
      params: { clientServiceCode },
      body,
    }),

  getAppConfigAdmin: ({ clientServiceCode }: { clientServiceCode: string }) =>
    adminConfigApi<GetAppConfigAdminResponse>(ADMIN_CONFIG_ROUTES.GET, {
      params: { clientServiceCode },
    }),

  setAppConfig: ({ clientServiceCode, config }: SetAppConfigRequest) =>
    adminConfigApi<SetAppConfigResponse>(ADMIN_CONFIG_ROUTES.SET, {
      params: { clientServiceCode },
      body: { config },
    }),

  login: (body: LoginRequest) =>
    authApi<AuthMintResponse>(AUTH_ROUTES.LOGIN, {
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  loginWithToken: (body: LoginWithTokenRequest) =>
    authApi<AuthMintResponse>(AUTH_ROUTES.LOGIN_WITH_TOKEN, {
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getMe: (knownHash?: string) =>
    authApi<GetMeResponse | GetMeNoChangeResponse>(AUTH_ROUTES.ME, {
      extraHeaders: sessionHeaders(),
      ...(knownHash ? { queryParams: { knownHash } } : {}),
    }),

  reportPermissionMismatch: (body: ReportPermissionMismatchRequest) =>
    authApi<ReportPermissionMismatchResponse>(AUTH_ROUTES.PERMISSION_MISMATCH, {
      body,
      extraHeaders: sessionHeaders(),
    }),

  adoptSession: (body: { refreshToken: string; serviceCode: string }) =>
    authApi<AuthMintResponse>(AUTH_ROUTES.ADOPT_SESSION, {
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  logActivities: (body: LogActivitiesRequest) =>
    activityApi<LogActivitiesResponse>(ACTIVITY_ROUTES.LOG_ACTIVITIES, {
      body,

      extraHeaders: sessionHeaders(),
    }),

  getAllLookups: (params?: GetAllLookupsRequest) =>
    lookupApi<GetAllLookupsResponse>(LOOKUP_ROUTES.GET_ALL, {
      ...(params?.hash !== undefined ? { queryParams: { hash: params.hash } } : {}),
      extraHeaders: sessionHeaders(),
    }),

  createLookup: (request: CreateLookupRequest) =>
    lookupApi<CreateLookupResponse>(LOOKUP_ROUTES.CREATE, {
      body: request,
      extraHeaders: sessionHeaders(),
    }),

  updateLookup: ({ id, ...body }: { id: string } & UpdateLookupRequest) =>
    lookupApi<UpdateLookupResponse>(LOOKUP_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  deleteLookup: ({ id, ...body }: { id: string } & DeleteLookupRequest) =>
    lookupApi<DeleteLookupResponse>(LOOKUP_ROUTES.DELETE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  importBatchLookups: (request: ImportBatchLookupsRequest) =>
    lookupApi<ImportBatchLookupsResponse>(LOOKUP_ROUTES.IMPORT_BATCH, {
      body: request,
      extraHeaders: sessionHeaders(),
    }),

  getAllVendors: (params?: GetAllVendorsRequest) =>
    vendorApi<GetAllVendorsResponse>(VENDOR_ROUTES.GET_ALL, {
      ...(params?.hash !== undefined ? { queryParams: { hash: params.hash } } : {}),
      extraHeaders: sessionHeaders(),
    }),

  createVendor: (request: CreateVendorRequest) =>
    vendorApi<CreateVendorResponse>(VENDOR_ROUTES.CREATE, {
      body: request,
      extraHeaders: sessionHeaders(),
    }),

  updateVendor: ({ id, ...body }: { id: string } & UpdateVendorRequest) =>
    vendorApi<UpdateVendorResponse>(VENDOR_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  archiveVendor: ({ id, ...body }: { id: string } & ArchiveVendorRequest) =>
    vendorApi<ArchiveVendorResponse>(VENDOR_ROUTES.ARCHIVE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  getAllEmployees: (params?: GetAllEmployeesRequest) =>
    employeeApi<GetAllEmployeesResponse>(EMPLOYEE_ROUTES.GET_ALL, {
      ...(params?.hash !== undefined ? { queryParams: { hash: params.hash } } : {}),
      extraHeaders: sessionHeaders(),
    }),

  getEmployeeById: ({ id }: { id: string }) =>
    employeeApi<GetEmployeeByIdResponse>(EMPLOYEE_ROUTES.GET_BY_ID, {
      params: { id },
      extraHeaders: sessionHeaders(),
    }),

  createEmployee: (request: CreateEmployeeRequest) =>
    employeeApi<CreateEmployeeResponse>(EMPLOYEE_ROUTES.CREATE, {
      body: request,
      extraHeaders: sessionHeaders(),
    }),

  updateEmployee: ({ id, ...body }: { id: string } & UpdateEmployeeRequest) =>
    employeeApi<UpdateEmployeeResponse>(EMPLOYEE_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  archiveEmployee: ({ id, ...body }: { id: string } & ArchiveEmployeeRequest) =>
    employeeApi<ArchiveEmployeeResponse>(EMPLOYEE_ROUTES.ARCHIVE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  updateEmployeeLoginPassword: ({
    id,
    ...body
  }: { id: string } & Omit<UpdateEmployeeLoginPasswordRequest, 'id'>) =>
    employeeApi<UpdateEmployeeLoginPasswordResponse>(EMPLOYEE_ROUTES.UPDATE_LOGIN_PASSWORD, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  generateEmployeeLoginToken: ({
    id,
    ...body
  }: { id: string } & Omit<GenerateEmployeeLoginTokenRequest, 'id'>) =>
    employeeApi<GenerateEmployeeLoginTokenResponse>(EMPLOYEE_ROUTES.GENERATE_LOGIN_TOKEN, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  getAllCustomers: (params?: GetAllCustomersRequest) =>
    customerApi<GetAllCustomersResponse>(CUSTOMER_ROUTES.GET_ALL, {
      ...(params?.hash !== undefined ? { queryParams: { hash: params.hash } } : {}),
      extraHeaders: sessionHeaders(),
    }),

  createCustomer: (request: CreateCustomerRequest) =>
    customerApi<CreateCustomerResponse>(CUSTOMER_ROUTES.CREATE, {
      body: request,
      extraHeaders: sessionHeaders(),
    }),

  updateCustomer: ({ id, ...body }: { id: string } & UpdateCustomerRequest) =>
    customerApi<UpdateCustomerResponse>(CUSTOMER_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  archiveCustomer: ({ id, ...body }: { id: string } & ArchiveCustomerRequest) =>
    customerApi<ArchiveCustomerResponse>(CUSTOMER_ROUTES.ARCHIVE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  getAllProducts: (params?: GetAllProductsRequest) =>
    productApi<GetAllProductsResponse>(PRODUCT_ROUTES.GET_ALL, {
      ...(params?.hash !== undefined ? { queryParams: { hash: params.hash } } : {}),
      extraHeaders: sessionHeaders(),
    }),

  createProduct: (request: CreateProductRequest) =>
    productApi<CreateProductResponse>(PRODUCT_ROUTES.CREATE, {
      body: request,
      extraHeaders: sessionHeaders(),
    }),

  updateProduct: ({ id, ...body }: { id: string } & UpdateProductRequest) =>
    productApi<UpdateProductResponse>(PRODUCT_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  archiveProduct: ({ id, ...body }: { id: string } & ArchiveProductRequest) =>
    productApi<ArchiveProductResponse>(PRODUCT_ROUTES.ARCHIVE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  getAllMaterials: (params?: GetAllMaterialsRequest) =>
    materialApi<GetAllMaterialsResponse>(MATERIAL_ROUTES.GET_ALL, {
      ...(params?.hash !== undefined ? { queryParams: { hash: params.hash } } : {}),
      extraHeaders: sessionHeaders(),
    }),

  createMaterial: (request: CreateMaterialRequest) =>
    materialApi<CreateMaterialResponse>(MATERIAL_ROUTES.CREATE, {
      body: request,
      extraHeaders: sessionHeaders(),
    }),

  updateMaterial: ({ id, ...body }: { id: string } & UpdateMaterialRequest) =>
    materialApi<UpdateMaterialResponse>(MATERIAL_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  archiveMaterial: ({ id, ...body }: { id: string } & ArchiveMaterialRequest) =>
    materialApi<ArchiveMaterialResponse>(MATERIAL_ROUTES.ARCHIVE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  getAllProductInventory: (params?: GetAllProductInventoryRequest) =>
    productInventoryApi<GetAllProductInventoryResponse>(PRODUCT_INVENTORY_ROUTES.GET_ALL, {
      ...(params?.hash !== undefined ? { queryParams: { hash: params.hash } } : {}),
      extraHeaders: sessionHeaders(),
    }),

  setProductInventory: ({ itemId, ...body }: { itemId: string } & SetProductInventoryRequest) =>
    productInventoryApi<SetProductInventoryResponse>(PRODUCT_INVENTORY_ROUTES.SET, {
      params: { itemId },
      body,
      extraHeaders: sessionHeaders(),
    }),

  getAllMaterialInventory: (params?: GetAllMaterialInventoryRequest) =>
    materialInventoryApi<GetAllMaterialInventoryResponse>(MATERIAL_INVENTORY_ROUTES.GET_ALL, {
      ...(params?.hash !== undefined ? { queryParams: { hash: params.hash } } : {}),
      extraHeaders: sessionHeaders(),
    }),

  setMaterialInventory: ({ itemId, ...body }: { itemId: string } & SetMaterialInventoryRequest) =>
    materialInventoryApi<SetMaterialInventoryResponse>(MATERIAL_INVENTORY_ROUTES.SET, {
      params: { itemId },
      body,
      extraHeaders: sessionHeaders(),
    }),

  querySyncGoodsReceipts: (body: QuerySyncGoodsReceiptsRequest) =>
    goodsReceiptApi<QuerySyncGoodsReceiptsResponse>(GOODS_RECEIPT_ROUTES.QUERY_SYNC, {
      body,
      extraHeaders: sessionHeaders(),
    }),

  getGoodsReceiptById: ({ id }: { id: string }) =>
    goodsReceiptApi<GetGoodsReceiptByIdResponse>(GOODS_RECEIPT_ROUTES.GET_BY_ID, {
      params: { id },
      extraHeaders: sessionHeaders(),
    }),

  createGoodsReceipt: (body: CreateGoodsReceiptRequest) =>
    goodsReceiptApi<CreateGoodsReceiptResponse>(GOODS_RECEIPT_ROUTES.CREATE, {
      body,
      extraHeaders: sessionHeaders(),
    }),

  updateGoodsReceipt: ({ id, ...body }: { id: string } & UpdateGoodsReceiptRequest) =>
    goodsReceiptApi<UpdateGoodsReceiptResponse>(GOODS_RECEIPT_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  transitionGoodsReceipt: ({ id, ...body }: { id: string } & TransitionGoodsReceiptRequest) =>
    goodsReceiptApi<TransitionGoodsReceiptResponse>(GOODS_RECEIPT_ROUTES.TRANSITION, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  querySyncSalesOrders: (body: QuerySyncSalesOrdersRequest) =>
    salesOrderApi<QuerySyncSalesOrdersResponse>(SALES_ORDER_ROUTES.QUERY_SYNC, {
      body,
      extraHeaders: sessionHeaders(),
    }),

  getSalesOrderById: ({ id }: { id: string }) =>
    salesOrderApi<GetSalesOrderByIdResponse>(SALES_ORDER_ROUTES.GET_BY_ID, {
      params: { id },
      extraHeaders: sessionHeaders(),
    }),

  createSalesOrder: (body: CreateSalesOrderRequest) =>
    salesOrderApi<CreateSalesOrderResponse>(SALES_ORDER_ROUTES.CREATE, {
      body,
      extraHeaders: sessionHeaders(),
    }),

  updateSalesOrder: ({ id, ...body }: { id: string } & UpdateSalesOrderRequest) =>
    salesOrderApi<UpdateSalesOrderResponse>(SALES_ORDER_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  transitionSalesOrder: ({ id, ...body }: { id: string } & TransitionSalesOrderRequest) =>
    salesOrderApi<TransitionSalesOrderResponse>(SALES_ORDER_ROUTES.TRANSITION, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  salesOrderInventory: ({ id, ...body }: { id: string } & SalesOrderInventoryRequest) =>
    salesOrderApi<SalesOrderInventoryResponse>(SALES_ORDER_ROUTES.INVENTORY, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  setSalesOrderPayment: ({ id, ...body }: { id: string } & SetSalesOrderPaymentRequest) =>
    salesOrderApi<SetSalesOrderPaymentResponse>(SALES_ORDER_ROUTES.PAYMENT, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  querySyncDeliveryNotes: (body: QuerySyncDeliveryNotesRequest) =>
    deliveryNoteApi<QuerySyncDeliveryNotesResponse>(DELIVERY_NOTE_ROUTES.QUERY_SYNC, {
      body,
      extraHeaders: sessionHeaders(),
    }),

  getDeliveryNoteById: ({ id }: { id: string }) =>
    deliveryNoteApi<GetDeliveryNoteByIdResponse>(DELIVERY_NOTE_ROUTES.GET_BY_ID, {
      params: { id },
      extraHeaders: sessionHeaders(),
    }),

  createDeliveryNote: (body: CreateDeliveryNoteRequest) =>
    deliveryNoteApi<CreateDeliveryNoteResponse>(DELIVERY_NOTE_ROUTES.CREATE, {
      body,
      extraHeaders: sessionHeaders(),
    }),

  updateDeliveryNote: ({ id, ...body }: { id: string } & UpdateDeliveryNoteRequest) =>
    deliveryNoteApi<UpdateDeliveryNoteResponse>(DELIVERY_NOTE_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  transitionDeliveryNote: ({ id, ...body }: { id: string } & TransitionDeliveryNoteRequest) =>
    deliveryNoteApi<TransitionDeliveryNoteResponse>(DELIVERY_NOTE_ROUTES.TRANSITION, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),

  deliveryNoteInventory: ({ id, ...body }: { id: string } & DeliveryNoteInventoryRequest) =>
    deliveryNoteApi<DeliveryNoteInventoryResponse>(DELIVERY_NOTE_ROUTES.INVENTORY, {
      params: { id },
      body,
      extraHeaders: sessionHeaders(),
    }),
};
