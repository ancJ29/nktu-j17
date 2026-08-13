import { PORTS } from '@credo/kits/port';

import { createApiGroup } from '../shared/api-group';

import type {
  GetProfileResponse,
  LoginRequest,
  LoginResponse,
  LoginWithTokenRequest,
  LoginWithTokenResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '../c-sso/types';
import { targets, urls } from '../shared/config';
import { registerStagePrefix } from '../shared/transport-state';
import { C_MNGT_ROUTES } from './routes';
import type {
  CreateEmployeeRequest,
  CreateEmployeeResponse,
  GenerateEmployeeLoginTokenRequest,
  GenerateEmployeeLoginTokenResponse,
  UpdateEmployeeLoginPasswordRequest,
  UpdateEmployeeLoginPasswordResponse,
  GetAllEmployeesRequest,
  GetAllEmployeesResponse,
  GetEmployeeByIdRequest,
  GetEmployeeByIdResponse,
  SearchEmployeesRequest,
  SearchEmployeesResponse,
  UpdateEmployeeRequest,
  UpdateEmployeeResponse,
  CreateProductRequest,
  CreateProductResponse,
  DeleteProductRequest,
  DeleteProductResponse,
  GetAllProductsRequest,
  GetAllProductsResponse,
  GetProductByIdRequest,
  GetProductByIdResponse,
  SearchProductsRequest,
  SearchProductsResponse,
  UpdateProductRequest,
  UpdateProductResponse,
  DisableClientRequest,
  DisableClientResponse,
  EnableClientRequest,
  EnableClientResponse,
  GetAppConfigAdminRequest,
  GetAppConfigAdminResponse,
  GetAllMasterDataRequest,
  GetAllMasterDataResponse,
  ResyncMasterDataResponse,
  GetAppConfigRequest,
  GetAppConfigResponse,
  GetClientByServiceCodeRequest,
  GetClientByServiceCodeResponse,
  ListClientsResponse,
  ProvisionClientRequest,
  ProvisionClientResponse,
  RegisterClientRequest,
  RegisterClientResponse,
  RemoveClientRequest,
  RemoveClientResponse,
  SetAppConfigRequest,
  SetAppConfigResponse,
  SetEmployeeConfigRequest,
  SetEmployeeConfigResponse,
  QuerySalesOrdersRequest,
  QuerySalesOrdersResponse,
  QuerySalesOrdersSyncRequest,
  QuerySalesOrdersSyncResponse,
  GetSalesOrderByIdRequest,
  GetSalesOrderByIdResponse,
  CreateSalesOrderRequest,
  CreateSalesOrderResponse,
  UpdateSalesOrderRequest,
  UpdateSalesOrderResponse,
  QueryDeliveryRequestsRequest,
  QueryDeliveryRequestsResponse,
  QueryDeliveryRequestsSyncRequest,
  QueryDeliveryRequestsSyncResponse,
  GetDeliveryRequestByIdRequest,
  GetDeliveryRequestByIdResponse,
  GetDeliveryRequestsByIdsRequest,
  GetDeliveryRequestsByIdsResponse,
  CreateDeliveryRequestRequest,
  CreateDeliveryRequestResponse,
  UpdateDeliveryRequestRequest,
  UpdateDeliveryRequestResponse,
  QueryGoodsReceiptsRequest,
  QueryGoodsReceiptsResponse,
  QueryGoodsReceiptsSyncRequest,
  QueryGoodsReceiptsSyncResponse,
  GetGoodsReceiptByIdRequest,
  GetGoodsReceiptByIdResponse,
  CreateGoodsReceiptRequest,
  CreateGoodsReceiptResponse,
  UpdateGoodsReceiptRequest,
  UpdateGoodsReceiptResponse,
  ImportBatchEmployeesRequest,
  ImportBatchEmployeesResponse,
  ImportBatchProductsRequest,
  ImportBatchProductsResponse,
  GetAllLocationsRequest,
  GetAllLocationsResponse,
  SearchLocationsRequest,
  SearchLocationsResponse,
  GetLocationByIdRequest,
  GetLocationByIdResponse,
  CreateLocationRequest,
  CreateLocationResponse,
  UpdateLocationRequest,
  UpdateLocationResponse,
  DeleteLocationRequest,
  DeleteLocationResponse,
  ImportBatchLocationsRequest,
  ImportBatchLocationsResponse,
  GetAllProductInventoryRequest,
  GetAllProductInventoryResponse,
  SearchProductInventoryRequest,
  SearchProductInventoryResponse,
  GetProductInventoryByIdRequest,
  GetProductInventoryByIdResponse,
  CreateProductInventoryRequest,
  CreateProductInventoryResponse,
  UpdateProductInventoryRequest,
  UpdateProductInventoryResponse,
  DeleteProductInventoryRequest,
  DeleteProductInventoryResponse,
  ImportBatchProductInventoryRequest,
  ImportBatchProductInventoryResponse,
  GetAllLookupsRequest,
  GetAllLookupsResponse,
  SearchLookupsRequest,
  SearchLookupsResponse,
  GetLookupsByCategoryRequest,
  GetLookupsByCategoryResponse,
  GetLookupByIdRequest,
  GetLookupByIdResponse,
  CreateLookupRequest,
  CreateLookupResponse,
  UpdateLookupRequest,
  UpdateLookupResponse,
  DeleteLookupRequest,
  DeleteLookupResponse,
  ImportBatchLookupsRequest,
  ImportBatchLookupsResponse,
  GetOperationLogsByTargetRequest,
  GetOperationLogsByTargetResponse,
  CreateOperationLogRequest,
  CreateOperationLogResponse,
  UpdateOperationLogRequest,
  UpdateOperationLogResponse,
  DeleteOperationLogRequest,
  DeleteOperationLogResponse,
  QueryGenericRecordsRequest,
  QueryGenericRecordsResponse,
  QueryGenericRecordsSyncRequest,
  QueryGenericRecordsSyncResponse,
  CreateGenericRecordRequest,
  CreateGenericRecordResponse,
  UpdateGenericRecordRequest,
  UpdateGenericRecordResponse,
  DeleteGenericRecordRequest,
  DeleteGenericRecordResponse,
  GetAllSingleRecordsRequest,
  GetAllSingleRecordsResponse,
  GetSingleRecordByIdRequest,
  GetSingleRecordByIdResponse,
  CreateSingleRecordRequest,
  CreateSingleRecordResponse,
  UpdateSingleRecordRequest,
  UpdateSingleRecordResponse,
  DeleteSingleRecordRequest,
  DeleteSingleRecordResponse,
  ImportBatchSingleRecordsRequest,
  ImportBatchSingleRecordsResponse,
  QueryPartitionedRecordsRequest,
  QueryPartitionedRecordsResponse,
  QueryPartitionedRecordsSyncRequest,
  QueryPartitionedRecordsSyncResponse,
  GetPartitionedRecordByIdRequest,
  GetPartitionedRecordByIdResponse,
  CreatePartitionedRecordRequest,
  CreatePartitionedRecordResponse,
  UpdatePartitionedRecordRequest,
  UpdatePartitionedRecordResponse,
  DeletePartitionedRecordRequest,
  DeletePartitionedRecordResponse,
  SingleRecordTarget,
  PartitionedRecordTarget,
} from './types';

export * from './routes';

const storages = {
  target: targets['cMngt'] || '',
  accessKey: '',
  authToken: '',
  clientCode: '',
  trustedServiceKey: '',
  stage: '$default',
  baseUrl: urls['cMngt'] || '',
  beforeRequest: undefined as (() => Promise<unknown>) | undefined,
};

registerStagePrefix(storages.baseUrl, storages.target);

const EMPLOYEE_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.EMPLOYEE;
const PRODUCT_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.PRODUCT;
const MASTER_DATA_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.MASTER_DATA;
const SALES_ORDER_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.SALES_ORDER;
const DELIVERY_REQUEST_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.DELIVERY_REQUEST;
const GOODS_RECEIPT_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.GOODS_RECEIPT;
const LOCATION_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.LOCATION;
const PRODUCT_INVENTORY_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.PRODUCT_INVENTORY;
const LOOKUP_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.LOOKUP;
const OPERATION_LOG_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.OPERATION_LOG;
const GENERIC_RECORD_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.GENERIC_RECORD;
const SINGLE_RECORDS_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.SINGLE_RECORDS;
const PARTITIONED_RECORDS_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.PARTITIONED_RECORDS;
const ADMIN_CLIENT_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.ADMIN_CLIENT;
const ADMIN_CONFIG_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.ADMIN_CONFIG;
const CLIENT_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.CLIENT;
const CONFIG_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.CONFIG;
const AUTH_ROUTES = C_MNGT_ROUTES.SUB_ROUTES.AUTH;

const getBaseUrl = () => storages.baseUrl;

const employeeApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.EMPLOYEE,
  getBaseUrl,
});

const productApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.PRODUCT,
  getBaseUrl,
});

const masterDataApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.MASTER_DATA,
  getBaseUrl,
});

const adminClientApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.ADMIN_CLIENT,
  getBaseUrl,
  defaults: { accessKeyRequired: true },
});

const adminConfigApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.ADMIN_CONFIG,
  getBaseUrl,
  defaults: { accessKeyRequired: true },
});

const clientApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.CLIENT,
  getBaseUrl,
});

const configApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.CONFIG,
  getBaseUrl,
});

const salesOrderApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.SALES_ORDER,
  getBaseUrl,
});

const deliveryRequestApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.DELIVERY_REQUEST,
  getBaseUrl,
});

const goodsReceiptApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.GOODS_RECEIPT,
  getBaseUrl,
});

const locationApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.LOCATION,
  getBaseUrl,
});

const productInventoryApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.PRODUCT_INVENTORY,
  getBaseUrl,
});

const lookupApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.LOOKUP,
  getBaseUrl,
});

const operationLogApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.OPERATION_LOG,
  getBaseUrl,
});

const genericRecordApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.GENERIC_RECORD,
  getBaseUrl,
});

const singleRecordsApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.SINGLE_RECORDS,
  getBaseUrl,
});

const partitionedRecordsApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.PARTITIONED_RECORDS,
  getBaseUrl,
});

const authApi = createApiGroup({
  storages,
  prefix: C_MNGT_ROUTES.PREFIXES.AUTH,
  getBaseUrl,
});

const withAuth = (token: string) => ({ ...storages, authToken: token });

const recordTarget = <T extends { entity: string }>(
  target: T,
): { entity: string; headers: Record<string, string> } => {
  const { entity, ...descriptor } = target;
  return {
    entity,
    headers: {
      'x-client-code': storages.clientCode,
      'x-record-descriptor': JSON.stringify(descriptor),
    },
  };
};

export const cMngtConnector = {
  useLocal: () => {
    return cMngtConnector.setBaseUrl(`http://localhost:${PORTS.C_MNGT}/dev`);
  },

  setTarget: (target: string) => {
    storages.target = target;

    registerStagePrefix(storages.baseUrl, target);
    return cMngtConnector;
  },
  setBaseUrl: (baseUrl: string) => {
    storages.baseUrl = baseUrl;
    registerStagePrefix(baseUrl, storages.target);
    return cMngtConnector;
  },
  setAccessKey: (accessKey: string) => {
    storages.accessKey = accessKey;
    return cMngtConnector;
  },
  setAuthToken: (token: string) => {
    storages.authToken = token;
    return cMngtConnector;
  },

  setBeforeRequest: (hook: (() => Promise<unknown>) | undefined) => {
    storages.beforeRequest = hook;
    return cMngtConnector;
  },
  setClientCode: (clientId: string) => {
    storages.clientCode = clientId;
    return cMngtConnector;
  },
  setTrustedServiceKey: (trustedServiceKey: string) => {
    storages.trustedServiceKey = trustedServiceKey;
    return cMngtConnector;
  },

  getMe: <T extends Record<string, unknown> = Record<string, unknown>>(token: string) =>
    authApi<GetProfileResponse<T>>(AUTH_ROUTES.ME, {
      storages: withAuth(token),
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  login: (body: LoginRequest) =>
    authApi<LoginResponse>(AUTH_ROUTES.LOGIN, {
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  refreshToken: (body: RefreshTokenRequest) =>
    authApi<RefreshTokenResponse>(AUTH_ROUTES.REFRESH, {
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  loginWithToken: (body: LoginWithTokenRequest) =>
    authApi<LoginWithTokenResponse>(AUTH_ROUTES.LOGIN_WITH_TOKEN, {
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getAllEmployees: <TExtra = Record<string, unknown>>(params?: GetAllEmployeesRequest) =>
    employeeApi<GetAllEmployeesResponse<TExtra>>(EMPLOYEE_ROUTES.GET_ALL, {
      ...(params?.hash && { queryParams: { hash: params.hash } }),
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  searchEmployees: <TExtra = Record<string, unknown>>({
    search,
    isActive,
  }: SearchEmployeesRequest) =>
    employeeApi<SearchEmployeesResponse<TExtra>>(EMPLOYEE_ROUTES.SEARCH, {
      queryParams: {
        ...(search !== undefined && { search }),
        ...(isActive !== undefined && { isActive: String(isActive) }),
      },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getEmployeeById: <TExtra = Record<string, unknown>>({ id }: GetEmployeeByIdRequest) =>
    employeeApi<GetEmployeeByIdResponse<TExtra>>(EMPLOYEE_ROUTES.GET_BY_ID, {
      params: { id },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  createEmployee: <TExtra = Record<string, unknown>>(request: CreateEmployeeRequest<TExtra>) =>
    employeeApi<CreateEmployeeResponse<TExtra>>(EMPLOYEE_ROUTES.CREATE, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  updateEmployee: <TExtra = Record<string, unknown>>({
    id,
    ...body
  }: UpdateEmployeeRequest<TExtra>) =>
    employeeApi<UpdateEmployeeResponse<TExtra>>(EMPLOYEE_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  generateEmployeeLoginToken: ({ id, expiration }: GenerateEmployeeLoginTokenRequest) =>
    employeeApi<GenerateEmployeeLoginTokenResponse>(EMPLOYEE_ROUTES.GENERATE_LOGIN_TOKEN, {
      params: { id },
      body: { ...(expiration !== undefined && { expiration }) },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  updateEmployeeLoginPassword: ({ id, password }: UpdateEmployeeLoginPasswordRequest) =>
    employeeApi<UpdateEmployeeLoginPasswordResponse>(EMPLOYEE_ROUTES.UPDATE_LOGIN_PASSWORD, {
      params: { id },
      body: { ...(password !== undefined && { password }) },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  importBatchEmployees: <TExtra = Record<string, unknown>>(
    request: ImportBatchEmployeesRequest<TExtra>,
  ) =>
    employeeApi<ImportBatchEmployeesResponse<TExtra>>(EMPLOYEE_ROUTES.IMPORT_BATCH, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getAllProducts: <TExtra = Record<string, unknown>>(params?: GetAllProductsRequest) =>
    productApi<GetAllProductsResponse<TExtra>>(PRODUCT_ROUTES.GET_ALL, {
      ...(params?.hash && { queryParams: { hash: params.hash } }),
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  searchProducts: <TExtra = Record<string, unknown>>({ search, isActive }: SearchProductsRequest) =>
    productApi<SearchProductsResponse<TExtra>>(PRODUCT_ROUTES.SEARCH, {
      queryParams: {
        ...(search !== undefined && { search }),
        ...(isActive !== undefined && { isActive: String(isActive) }),
      },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getProductById: <TExtra = Record<string, unknown>>({ id }: GetProductByIdRequest) =>
    productApi<GetProductByIdResponse<TExtra>>(PRODUCT_ROUTES.GET_BY_ID, {
      params: { id },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  createProduct: <TExtra = Record<string, unknown>>(request: CreateProductRequest<TExtra>) =>
    productApi<CreateProductResponse<TExtra>>(PRODUCT_ROUTES.CREATE, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  updateProduct: <TExtra = Record<string, unknown>>({
    id,
    ...body
  }: UpdateProductRequest<TExtra>) =>
    productApi<UpdateProductResponse<TExtra>>(PRODUCT_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  deleteProduct: ({ id, ...body }: DeleteProductRequest) =>
    productApi<DeleteProductResponse>(PRODUCT_ROUTES.DELETE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  importBatchProducts: <TExtra = Record<string, unknown>>(
    request: ImportBatchProductsRequest<TExtra>,
  ) =>
    productApi<ImportBatchProductsResponse<TExtra>>(PRODUCT_ROUTES.IMPORT_BATCH, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getAllMasterData: (params?: GetAllMasterDataRequest) => {
    const queryParams: Record<string, string> = {};
    if (params?.employeesHash) queryParams['employeesHash'] = params.employeesHash;
    if (params?.productsHash) queryParams['productsHash'] = params.productsHash;
    if (params?.locationsHash) queryParams['locationsHash'] = params.locationsHash;
    if (params?.lookupsHash) queryParams['lookupsHash'] = params.lookupsHash;

    return masterDataApi<GetAllMasterDataResponse>(MASTER_DATA_ROUTES.GET_ALL, {
      ...(Object.keys(queryParams).length > 0 && { queryParams }),
      extraHeaders: { 'x-client-code': storages.clientCode },
    });
  },

  resyncMasterData: () =>
    masterDataApi<ResyncMasterDataResponse>(MASTER_DATA_ROUTES.RESYNC, {
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  registerClient: <TExtra = Record<string, unknown>>(request: RegisterClientRequest<TExtra>) =>
    adminClientApi<RegisterClientResponse<TExtra>>(ADMIN_CLIENT_ROUTES.REGISTER, {
      body: request,
    }),

  provisionClient: <TExtra = Record<string, unknown>>(request: ProvisionClientRequest<TExtra>) =>
    adminClientApi<ProvisionClientResponse<TExtra>>(ADMIN_CLIENT_ROUTES.PROVISION, {
      body: request,
    }),

  listClients: <TExtra = Record<string, unknown>>() =>
    adminClientApi<ListClientsResponse<TExtra>>(ADMIN_CLIENT_ROUTES.LIST),

  enableClient: <TExtra = Record<string, unknown>>({
    clientServiceCode,
    ...body
  }: EnableClientRequest) =>
    adminClientApi<EnableClientResponse<TExtra>>(ADMIN_CLIENT_ROUTES.ENABLE, {
      params: { clientServiceCode },
      body,
    }),

  disableClient: <TExtra = Record<string, unknown>>({
    clientServiceCode,
    ...body
  }: DisableClientRequest) =>
    adminClientApi<DisableClientResponse<TExtra>>(ADMIN_CLIENT_ROUTES.DISABLE, {
      params: { clientServiceCode },
      body,
    }),

  removeClient: ({ clientServiceCode, ...body }: RemoveClientRequest) =>
    adminClientApi<RemoveClientResponse>(ADMIN_CLIENT_ROUTES.REMOVE, {
      params: { clientServiceCode },
      body,
    }),

  setAppConfig: ({ clientServiceCode, ...body }: SetAppConfigRequest) =>
    adminConfigApi<SetAppConfigResponse>(ADMIN_CONFIG_ROUTES.SET, {
      params: { clientServiceCode },
      body,
    }),

  getAppConfigAdmin: ({ clientServiceCode }: GetAppConfigAdminRequest) =>
    adminConfigApi<GetAppConfigAdminResponse>(ADMIN_CONFIG_ROUTES.GET, {
      params: { clientServiceCode },
    }),

  getClientByServiceCode: <TExtra = Record<string, unknown>>({
    clientServiceCode,
  }: GetClientByServiceCodeRequest) =>
    clientApi<GetClientByServiceCodeResponse<TExtra>>(CLIENT_ROUTES.GET_BY_SERVICE_CODE, {
      params: { clientServiceCode },
    }),

  getAppConfig: ({ clientServiceCode }: GetAppConfigRequest) =>
    configApi<GetAppConfigResponse>(CONFIG_ROUTES.GET, {
      params: { clientServiceCode },
    }),

  setEmployeeConfig: (body: SetEmployeeConfigRequest) =>
    configApi<SetEmployeeConfigResponse>(CONFIG_ROUTES.SET_EMPLOYEE, {
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  querySalesOrders: <TExtra = Record<string, unknown>>({
    fromPeriod,
    toPeriod,
  }: QuerySalesOrdersRequest) =>
    salesOrderApi<QuerySalesOrdersResponse<TExtra>>(SALES_ORDER_ROUTES.QUERY, {
      queryParams: { fromPeriod, toPeriod },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  querySalesOrdersSync: <TExtra = Record<string, unknown>>(request: QuerySalesOrdersSyncRequest) =>
    salesOrderApi<QuerySalesOrdersSyncResponse<TExtra>>(SALES_ORDER_ROUTES.QUERY_SYNC, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getSalesOrderById: <TExtra = Record<string, unknown>>({ id }: GetSalesOrderByIdRequest) =>
    salesOrderApi<GetSalesOrderByIdResponse<TExtra>>(SALES_ORDER_ROUTES.GET_BY_ID, {
      params: { id },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  createSalesOrder: <TExtra = Record<string, unknown>>(request: CreateSalesOrderRequest<TExtra>) =>
    salesOrderApi<CreateSalesOrderResponse<TExtra>>(SALES_ORDER_ROUTES.CREATE, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  updateSalesOrder: <TExtra = Record<string, unknown>>({
    id,
    ...body
  }: UpdateSalesOrderRequest<TExtra>) =>
    salesOrderApi<UpdateSalesOrderResponse<TExtra>>(SALES_ORDER_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  queryDeliveryRequests: <TExtra = Record<string, unknown>>({
    fromPeriod,
    toPeriod,
  }: QueryDeliveryRequestsRequest) =>
    deliveryRequestApi<QueryDeliveryRequestsResponse<TExtra>>(DELIVERY_REQUEST_ROUTES.QUERY, {
      queryParams: { fromPeriod, toPeriod },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  queryDeliveryRequestsSync: <TExtra = Record<string, unknown>>(
    request: QueryDeliveryRequestsSyncRequest,
  ) =>
    deliveryRequestApi<QueryDeliveryRequestsSyncResponse<TExtra>>(
      DELIVERY_REQUEST_ROUTES.QUERY_SYNC,
      {
        body: request,
        extraHeaders: { 'x-client-code': storages.clientCode },
      },
    ),

  getDeliveryRequestById: <TExtra = Record<string, unknown>>({
    id,
  }: GetDeliveryRequestByIdRequest) =>
    deliveryRequestApi<GetDeliveryRequestByIdResponse<TExtra>>(DELIVERY_REQUEST_ROUTES.GET_BY_ID, {
      params: { id },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getDeliveryRequestsByIds: <TExtra = Record<string, unknown>>({
    ids,
  }: GetDeliveryRequestsByIdsRequest) =>
    deliveryRequestApi<GetDeliveryRequestsByIdsResponse<TExtra>>(
      DELIVERY_REQUEST_ROUTES.GET_BY_IDS,
      {
        queryParams: { ids: ids.join(',') },
        extraHeaders: { 'x-client-code': storages.clientCode },
      },
    ),

  createDeliveryRequest: <TExtra = Record<string, unknown>>(
    request: CreateDeliveryRequestRequest<TExtra>,
  ) =>
    deliveryRequestApi<CreateDeliveryRequestResponse<TExtra>>(DELIVERY_REQUEST_ROUTES.CREATE, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  updateDeliveryRequest: <TExtra = Record<string, unknown>>({
    id,
    ...body
  }: UpdateDeliveryRequestRequest<TExtra>) =>
    deliveryRequestApi<UpdateDeliveryRequestResponse<TExtra>>(DELIVERY_REQUEST_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  queryGoodsReceipts: <TExtra = Record<string, unknown>>({
    fromPeriod,
    toPeriod,
    vendorCode,
    locationCode,
    search,
  }: QueryGoodsReceiptsRequest) =>
    goodsReceiptApi<QueryGoodsReceiptsResponse<TExtra>>(GOODS_RECEIPT_ROUTES.QUERY, {
      queryParams: {
        ...(fromPeriod !== undefined && { fromPeriod }),
        ...(toPeriod !== undefined && { toPeriod }),
        ...(vendorCode !== undefined && { vendorCode }),
        ...(locationCode !== undefined && { locationCode }),
        ...(search !== undefined && { search }),
      },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  queryGoodsReceiptsSync: <TExtra = Record<string, unknown>>(
    request: QueryGoodsReceiptsSyncRequest,
  ) =>
    goodsReceiptApi<QueryGoodsReceiptsSyncResponse<TExtra>>(GOODS_RECEIPT_ROUTES.QUERY_SYNC, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getGoodsReceiptById: <TExtra = Record<string, unknown>>({ id }: GetGoodsReceiptByIdRequest) =>
    goodsReceiptApi<GetGoodsReceiptByIdResponse<TExtra>>(GOODS_RECEIPT_ROUTES.GET_BY_ID, {
      params: { id },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  createGoodsReceipt: <TExtra = Record<string, unknown>>(
    request: CreateGoodsReceiptRequest<TExtra>,
  ) =>
    goodsReceiptApi<CreateGoodsReceiptResponse<TExtra>>(GOODS_RECEIPT_ROUTES.CREATE, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  updateGoodsReceipt: <TExtra = Record<string, unknown>>({
    id,
    ...body
  }: UpdateGoodsReceiptRequest<TExtra>) =>
    goodsReceiptApi<UpdateGoodsReceiptResponse<TExtra>>(GOODS_RECEIPT_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getAllLocations: <TExtra = Record<string, unknown>>(params?: GetAllLocationsRequest) =>
    locationApi<GetAllLocationsResponse<TExtra>>(LOCATION_ROUTES.GET_ALL, {
      ...(params?.hash && { queryParams: { hash: params.hash } }),
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  searchLocations: <TExtra = Record<string, unknown>>({
    search,
    isActive,
  }: SearchLocationsRequest) =>
    locationApi<SearchLocationsResponse<TExtra>>(LOCATION_ROUTES.SEARCH, {
      queryParams: {
        ...(search !== undefined && { search }),
        ...(isActive !== undefined && { isActive: String(isActive) }),
      },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getLocationById: <TExtra = Record<string, unknown>>({ id }: GetLocationByIdRequest) =>
    locationApi<GetLocationByIdResponse<TExtra>>(LOCATION_ROUTES.GET_BY_ID, {
      params: { id },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  createLocation: <TExtra = Record<string, unknown>>(request: CreateLocationRequest<TExtra>) =>
    locationApi<CreateLocationResponse<TExtra>>(LOCATION_ROUTES.CREATE, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  updateLocation: <TExtra = Record<string, unknown>>({
    id,
    ...body
  }: UpdateLocationRequest<TExtra>) =>
    locationApi<UpdateLocationResponse<TExtra>>(LOCATION_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  deleteLocation: ({ id, ...body }: DeleteLocationRequest) =>
    locationApi<DeleteLocationResponse>(LOCATION_ROUTES.DELETE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  importBatchLocations: <TExtra = Record<string, unknown>>(
    request: ImportBatchLocationsRequest<TExtra>,
  ) =>
    locationApi<ImportBatchLocationsResponse<TExtra>>(LOCATION_ROUTES.IMPORT_BATCH, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getAllProductInventory: <TExtra = Record<string, unknown>>(
    params?: GetAllProductInventoryRequest,
  ) =>
    productInventoryApi<GetAllProductInventoryResponse<TExtra>>(PRODUCT_INVENTORY_ROUTES.GET_ALL, {
      ...(params?.hash && { queryParams: { hash: params.hash } }),
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  searchProductInventory: <TExtra = Record<string, unknown>>({
    itemCode,
    locationCode,
    search,
  }: SearchProductInventoryRequest) =>
    productInventoryApi<SearchProductInventoryResponse<TExtra>>(PRODUCT_INVENTORY_ROUTES.SEARCH, {
      queryParams: {
        ...(itemCode !== undefined && { itemCode }),
        ...(locationCode !== undefined && { locationCode }),
        ...(search !== undefined && { search }),
      },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getProductInventoryById: <TExtra = Record<string, unknown>>({
    id,
  }: GetProductInventoryByIdRequest) =>
    productInventoryApi<GetProductInventoryByIdResponse<TExtra>>(
      PRODUCT_INVENTORY_ROUTES.GET_BY_ID,
      {
        params: { id },
        extraHeaders: { 'x-client-code': storages.clientCode },
      },
    ),

  createProductInventory: <TExtra = Record<string, unknown>>(
    request: CreateProductInventoryRequest<TExtra>,
  ) =>
    productInventoryApi<CreateProductInventoryResponse<TExtra>>(PRODUCT_INVENTORY_ROUTES.CREATE, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  updateProductInventory: <TExtra = Record<string, unknown>>({
    id,
    ...body
  }: UpdateProductInventoryRequest<TExtra>) =>
    productInventoryApi<UpdateProductInventoryResponse<TExtra>>(PRODUCT_INVENTORY_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  deleteProductInventory: ({ id }: DeleteProductInventoryRequest) =>
    productInventoryApi<DeleteProductInventoryResponse>(PRODUCT_INVENTORY_ROUTES.DELETE, {
      params: { id },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  importBatchProductInventory: <TExtra = Record<string, unknown>>(
    request: ImportBatchProductInventoryRequest<TExtra>,
  ) =>
    productInventoryApi<ImportBatchProductInventoryResponse<TExtra>>(
      PRODUCT_INVENTORY_ROUTES.IMPORT_BATCH,
      {
        body: request,
        extraHeaders: { 'x-client-code': storages.clientCode },
      },
    ),

  getAllLookups: <TExtra = Record<string, unknown>>(params?: GetAllLookupsRequest) =>
    lookupApi<GetAllLookupsResponse<TExtra>>(LOOKUP_ROUTES.GET_ALL, {
      ...(params?.hash && { queryParams: { hash: params.hash } }),
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  searchLookups: <TExtra = Record<string, unknown>>({
    category,
    isActive,
    search,
  }: SearchLookupsRequest) =>
    lookupApi<SearchLookupsResponse<TExtra>>(LOOKUP_ROUTES.SEARCH, {
      queryParams: {
        ...(category !== undefined && { category }),
        ...(isActive !== undefined && { isActive: String(isActive) }),
        ...(search !== undefined && { search }),
      },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getLookupsByCategory: <TExtra = Record<string, unknown>>({
    category,
  }: GetLookupsByCategoryRequest) =>
    lookupApi<GetLookupsByCategoryResponse<TExtra>>(LOOKUP_ROUTES.GET_BY_CATEGORY, {
      params: { category },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getLookupById: <TExtra = Record<string, unknown>>({ id }: GetLookupByIdRequest) =>
    lookupApi<GetLookupByIdResponse<TExtra>>(LOOKUP_ROUTES.GET_BY_ID, {
      params: { id },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  createLookup: <TExtra = Record<string, unknown>>(request: CreateLookupRequest<TExtra>) =>
    lookupApi<CreateLookupResponse<TExtra>>(LOOKUP_ROUTES.CREATE, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  updateLookup: <TExtra = Record<string, unknown>>({ id, ...body }: UpdateLookupRequest<TExtra>) =>
    lookupApi<UpdateLookupResponse<TExtra>>(LOOKUP_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  deleteLookup: ({ id, ...body }: DeleteLookupRequest) =>
    lookupApi<DeleteLookupResponse>(LOOKUP_ROUTES.DELETE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  importBatchLookups: <TExtra = Record<string, unknown>>(
    request: ImportBatchLookupsRequest<TExtra>,
  ) =>
    lookupApi<ImportBatchLookupsResponse<TExtra>>(LOOKUP_ROUTES.IMPORT_BATCH, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getOperationLogsByTarget: <TExtra = Record<string, unknown>>({
    targetId,
    period,
  }: GetOperationLogsByTargetRequest) =>
    operationLogApi<GetOperationLogsByTargetResponse<TExtra>>(OPERATION_LOG_ROUTES.GET_BY_TARGET, {
      params: { targetId, period },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  createOperationLog: <TExtra = Record<string, unknown>>(
    request: CreateOperationLogRequest<TExtra>,
  ) =>
    operationLogApi<CreateOperationLogResponse<TExtra>>(OPERATION_LOG_ROUTES.CREATE, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  updateOperationLog: <TExtra = Record<string, unknown>>({
    id,
    ...body
  }: UpdateOperationLogRequest<TExtra>) =>
    operationLogApi<UpdateOperationLogResponse<TExtra>>(OPERATION_LOG_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  deleteOperationLog: ({ id, ...body }: DeleteOperationLogRequest) =>
    operationLogApi<DeleteOperationLogResponse>(OPERATION_LOG_ROUTES.DELETE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  queryGenericRecords: <TExtra = Record<string, unknown>>({
    recordType,
    fromPeriod,
    toPeriod,
  }: QueryGenericRecordsRequest) =>
    genericRecordApi<QueryGenericRecordsResponse<TExtra>>(GENERIC_RECORD_ROUTES.QUERY, {
      queryParams: {
        recordType,
        ...(fromPeriod !== undefined && { fromPeriod }),
        ...(toPeriod !== undefined && { toPeriod }),
      },
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  queryGenericRecordsSync: <TExtra = Record<string, unknown>>(
    request: QueryGenericRecordsSyncRequest,
  ) =>
    genericRecordApi<QueryGenericRecordsSyncResponse<TExtra>>(GENERIC_RECORD_ROUTES.QUERY_SYNC, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  createGenericRecord: <TExtra = Record<string, unknown>>(
    request: CreateGenericRecordRequest<TExtra>,
  ) =>
    genericRecordApi<CreateGenericRecordResponse<TExtra>>(GENERIC_RECORD_ROUTES.CREATE, {
      body: request,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  updateGenericRecord: <TExtra = Record<string, unknown>>({
    id,
    ...body
  }: UpdateGenericRecordRequest<TExtra>) =>
    genericRecordApi<UpdateGenericRecordResponse<TExtra>>(GENERIC_RECORD_ROUTES.UPDATE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  deleteGenericRecord: ({ id, ...body }: DeleteGenericRecordRequest) =>
    genericRecordApi<DeleteGenericRecordResponse>(GENERIC_RECORD_ROUTES.DELETE, {
      params: { id },
      body,
      extraHeaders: { 'x-client-code': storages.clientCode },
    }),

  getAllSingleRecords: (target: SingleRecordTarget, params?: GetAllSingleRecordsRequest) => {
    const { entity, headers } = recordTarget(target);
    return singleRecordsApi<GetAllSingleRecordsResponse>(SINGLE_RECORDS_ROUTES.GET_ALL, {
      params: { entity },
      queryParams: params?.hash !== undefined ? { hash: params.hash } : undefined,
      extraHeaders: headers,
    });
  },

  getSingleRecordById: (target: SingleRecordTarget, { id }: GetSingleRecordByIdRequest) => {
    const { entity, headers } = recordTarget(target);
    return singleRecordsApi<GetSingleRecordByIdResponse>(SINGLE_RECORDS_ROUTES.GET_BY_ID, {
      params: { entity, id },
      extraHeaders: headers,
    });
  },

  createSingleRecord: (target: SingleRecordTarget, request: CreateSingleRecordRequest) => {
    const { entity, headers } = recordTarget(target);
    return singleRecordsApi<CreateSingleRecordResponse>(SINGLE_RECORDS_ROUTES.CREATE, {
      params: { entity },
      body: request,
      extraHeaders: headers,
    });
  },

  updateSingleRecord: (target: SingleRecordTarget, { id, ...body }: UpdateSingleRecordRequest) => {
    const { entity, headers } = recordTarget(target);
    return singleRecordsApi<UpdateSingleRecordResponse>(SINGLE_RECORDS_ROUTES.UPDATE, {
      params: { entity, id },
      body,
      extraHeaders: headers,
    });
  },

  deleteSingleRecord: (target: SingleRecordTarget, { id, ...body }: DeleteSingleRecordRequest) => {
    const { entity, headers } = recordTarget(target);
    return singleRecordsApi<DeleteSingleRecordResponse>(SINGLE_RECORDS_ROUTES.DELETE, {
      params: { entity, id },
      body,
      extraHeaders: headers,
    });
  },

  importBatchSingleRecords: (
    target: SingleRecordTarget,
    request: ImportBatchSingleRecordsRequest,
  ) => {
    const { entity, headers } = recordTarget(target);
    return singleRecordsApi<ImportBatchSingleRecordsResponse>(SINGLE_RECORDS_ROUTES.IMPORT_BATCH, {
      params: { entity },
      body: request,
      extraHeaders: headers,
    });
  },

  queryPartitionedRecords: (
    target: PartitionedRecordTarget,
    request: QueryPartitionedRecordsRequest,
  ) => {
    const { entity, headers } = recordTarget(target);
    return partitionedRecordsApi<QueryPartitionedRecordsResponse>(
      PARTITIONED_RECORDS_ROUTES.QUERY,
      {
        params: { entity },
        body: request,
        extraHeaders: headers,
      },
    );
  },

  queryPartitionedRecordsSync: (
    target: PartitionedRecordTarget,
    request: QueryPartitionedRecordsSyncRequest,
  ) => {
    const { entity, headers } = recordTarget(target);
    return partitionedRecordsApi<QueryPartitionedRecordsSyncResponse>(
      PARTITIONED_RECORDS_ROUTES.QUERY_SYNC,
      {
        params: { entity },
        body: request,
        extraHeaders: headers,
      },
    );
  },

  getPartitionedRecordById: (
    target: PartitionedRecordTarget,
    { id, partitionKey }: GetPartitionedRecordByIdRequest,
  ) => {
    const { entity, headers } = recordTarget(target);
    return partitionedRecordsApi<GetPartitionedRecordByIdResponse>(
      PARTITIONED_RECORDS_ROUTES.GET_BY_ID,
      {
        params: { entity, id },
        queryParams: partitionKey !== undefined ? { partitionKey } : undefined,
        extraHeaders: headers,
      },
    );
  },

  createPartitionedRecord: (
    target: PartitionedRecordTarget,
    request: CreatePartitionedRecordRequest,
  ) => {
    const { entity, headers } = recordTarget(target);
    return partitionedRecordsApi<CreatePartitionedRecordResponse>(
      PARTITIONED_RECORDS_ROUTES.CREATE,
      {
        params: { entity },
        body: request,
        extraHeaders: headers,
      },
    );
  },

  updatePartitionedRecord: (
    target: PartitionedRecordTarget,
    { id, ...body }: UpdatePartitionedRecordRequest,
  ) => {
    const { entity, headers } = recordTarget(target);
    return partitionedRecordsApi<UpdatePartitionedRecordResponse>(
      PARTITIONED_RECORDS_ROUTES.UPDATE,
      {
        params: { entity, id },
        body,
        extraHeaders: headers,
      },
    );
  },

  deletePartitionedRecord: (
    target: PartitionedRecordTarget,
    { id, ...body }: DeletePartitionedRecordRequest,
  ) => {
    const { entity, headers } = recordTarget(target);
    return partitionedRecordsApi<DeletePartitionedRecordResponse>(
      PARTITIONED_RECORDS_ROUTES.DELETE,
      {
        params: { entity, id },
        body,
        extraHeaders: headers,
      },
    );
  },
};
