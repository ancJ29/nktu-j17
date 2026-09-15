import type { DateTimeInput } from '@credo/kits/types';

type BaseMutationRequest = {
  expectedListHash?: string;
};

type BaseMutationResponse = {
  success: boolean;

  listHash?: string;
};

type BaseDeleteResponse = BaseMutationResponse & {
  message: string;
};

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

  configIssue?: string;
};

export type ListClientsResponse<TExtra = Record<string, unknown>> = {
  success: boolean;
  clients: ClientConfig<TExtra>[];
};

export type RemoveClientRequest = BaseMutationRequest & {
  clientServiceCode: string;
  version: string;

  ssoAdminAccessKey?: string;
};
export type RemoveClientResponse = BaseDeleteResponse & {
  ssoIssues?: string[];
};

export type CredoAppConfig = {
  [key: string]: unknown;
  version: string;

  date?: DateTimeInput | undefined;

  schemaVersion?: number | undefined;
  app: {
    [key: string]: unknown;
    name: string;
    logoUrl?: string | undefined;
    logoDarkBgUrl?: string | undefined;
    faviconUrl?: string | undefined;
    pwaIcon192Url?: string | undefined;
    pwaIcon512Url?: string | undefined;
    pwaIconMaskableUrl?: string | undefined;
  };
  features?:
    | {
        [key: string]: unknown;

        vendorsV2?:
          | {
              [key: string]: unknown;
              enabled?: boolean | undefined;
              simpleMode?: boolean | undefined;
              codePrefix?: string | undefined;
              codePadLength?: number | undefined;
            }
          | undefined;

        customersV2?:
          | {
              [key: string]: unknown;
              enabled?: boolean | undefined;
              simpleMode?: boolean | undefined;
              codePrefix?: string | undefined;
              codePadLength?: number | undefined;
            }
          | undefined;

        materialsV2?:
          | {
              [key: string]: unknown;
              enabled?: boolean | undefined;
              simpleMode?: boolean | undefined;
              codePrefix?: string | undefined;
              codePadLength?: number | undefined;
              unitCategory?: string | undefined;
            }
          | undefined;

        productsV2?:
          | {
              [key: string]: unknown;
              enabled?: boolean | undefined;
              simpleMode?: boolean | undefined;
              codePrefix?: string | undefined;
              codePadLength?: number | undefined;
              priceManagement?: boolean | undefined;
            }
          | undefined;

        goodsReceiptsV2?:
          | {
              [key: string]: unknown;
              enabled?: boolean | undefined;
              codePrefix?: string | undefined;
              codePadLength?: number | undefined;
              statusFlow?: unknown;
            }
          | undefined;

        salesOrdersV2?:
          | {
              [key: string]: unknown;
              enabled?: boolean | undefined;
              codePrefix?: string | undefined;
              codePadLength?: number | undefined;
              statusFlow?: unknown;
            }
          | undefined;

        deliveryNotesV2?:
          | {
              [key: string]: unknown;
              enabled?: boolean | undefined;
              codePrefix?: string | undefined;
              codePadLength?: number | undefined;
              statusFlow?: unknown;
            }
          | undefined;
      }
    | undefined;
};

export type GetAppConfigAdminResponse = {
  success: boolean;
  config: CredoAppConfig | null;
};

export type SetAppConfigRequest = {
  clientServiceCode: string;
  config: CredoAppConfig;
};

export type SetAppConfigResponse = {
  success: boolean;
  config: CredoAppConfig;
};

export type AuthMintResponse = {
  success: boolean;
  error?: string;
  userUuid?: string;

  authId?: string;

  authExpiresAt?: number;

  token?: string;

  refreshToken?: string;
};

export type GenerateEmployeeLoginTokenRequest = {
  id: string;

  expiration?: number;
};
export type GenerateEmployeeLoginTokenResponse = {
  success: boolean;
  token?: string;
};

export type LogActivitiesRequest = {
  activities: {
    clientId: string;
    actorId: string;
    action: string;
    targetId?: string;
    memo?: Record<string, unknown>;

    timestamp?: string;
  }[];
};

export type LogActivitiesResponse = {
  success: boolean;

  ids: string[];
};

export type MyInformation = {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  isActive: boolean;

  userUuid?: string;

  extra: Record<string, unknown>;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  version: string;
};

export type EffectiveModulePermissions = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  actions?: Record<string, boolean> | undefined;
  query?: Record<string, boolean> | undefined;
};

export type EffectivePermissions = Record<string, EffectiveModulePermissions>;

export type GetMeResponse = {
  isRootUser: boolean;

  email: string;

  name: string;
  myInformation: MyInformation | null;

  permissions: EffectivePermissions | null;

  profileHash: string;
};

export type GetMeNoChangeResponse = {
  noChange: true;

  profileHash: string;
};

export type PermissionMismatchEntry = {
  path: string;
  browser: boolean | null;
  server: boolean | null;
};

export type ReportPermissionMismatchRequest = {
  entries: PermissionMismatchEntry[];

  total: number;
  truncated: boolean;

  versions?: { cfg?: string | undefined; emp?: string | undefined };

  browserEmployeeId?: string | undefined;
  browserDepartment?: string | undefined;

  appVersion?: string | undefined;
};

export type ReportPermissionMismatchResponse = { success: boolean };

export type LookupRecord = {
  id: string;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;

  version: string;
} & Record<string, unknown>;

export type GetAllLookupsRequest = {
  hash?: string;
};
export type GetAllLookupsResponse = {
  success: boolean;
  changed: boolean;

  items?: LookupRecord[];
  hash?: string;
};

export type CreateLookupRequest = {
  item: Record<string, unknown>;

  expectedListHash?: string;
};
export type CreateLookupResponse = {
  success: boolean;
  item: LookupRecord;

  listHash?: string;
};

export type UpdateLookupRequest = {
  version: string;

  patch: Record<string, unknown>;
  expectedListHash?: string;
};
export type UpdateLookupResponse = {
  success: boolean;
  item: LookupRecord;
  listHash?: string;
};

export type DeleteLookupRequest = {
  version: string;

  expectedListHash?: string;
};
export type DeleteLookupResponse = {
  success: boolean;
  message: string;
  listHash?: string;
};

export type ImportBatchLookupsRequest = {
  items: Array<Record<string, unknown>>;

  expectedListHash?: string;
};
export type ImportBatchLookupsResponse = {
  success: boolean;
  summary: { total: number; created: number; updated: number; errors: number };

  created: LookupRecord[];
  updated: LookupRecord[];
  errors: Array<{ index: number; message: string }>;

  listHash?: string;
};

export type MasterDataRecord = {
  id: string;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;

  version: string;
} & Record<string, unknown>;

export type GetAllMasterDataRequest = {
  hash?: string;
};
export type GetAllMasterDataResponse = {
  success: boolean;
  changed: boolean;

  items?: MasterDataRecord[];
  hash?: string;
};

export type GetMasterDataByIdResponse = {
  success: boolean;
  item: MasterDataRecord;
};

export type CreateMasterDataRequest = {
  item: Record<string, unknown>;

  expectedListHash?: string;
};
export type CreateMasterDataResponse = {
  success: boolean;
  item: MasterDataRecord;

  listHash?: string;
};

export type UpdateMasterDataRequest = {
  version: string;

  patch: Record<string, unknown>;
  expectedListHash?: string;
};
export type UpdateMasterDataResponse = {
  success: boolean;
  item: MasterDataRecord;
  listHash?: string;
};

export type ArchiveMasterDataRequest = {
  version: string;

  expectedListHash?: string;
};
export type ArchiveMasterDataResponse = {
  success: boolean;
  item: MasterDataRecord;
  listHash?: string;
};

export type EmployeeRecord = MasterDataRecord;
export type GetAllEmployeesRequest = GetAllMasterDataRequest;
export type GetAllEmployeesResponse = GetAllMasterDataResponse;
export type GetEmployeeByIdResponse = GetMasterDataByIdResponse;

export type EmployeeSsoOutcome = {
  ssoWarning?: string;

  ssoError?: unknown;

  loginPassword?: string;
};

export type CreateEmployeeRequest = CreateMasterDataRequest;
export type CreateEmployeeResponse = CreateMasterDataResponse & EmployeeSsoOutcome;

export type UpdateEmployeeRequest = UpdateMasterDataRequest;
export type UpdateEmployeeResponse = UpdateMasterDataResponse & EmployeeSsoOutcome;

export type ArchiveEmployeeRequest = ArchiveMasterDataRequest;
export type ArchiveEmployeeResponse = ArchiveMasterDataResponse & EmployeeSsoOutcome;

export type UpdateEmployeeLoginPasswordRequest = {
  id: string;

  version: string;
  password: string;
  expectedListHash?: string;
};
export type UpdateEmployeeLoginPasswordResponse = {
  success: boolean;
  item: MasterDataRecord;
  listHash?: string;
} & EmployeeSsoOutcome;

export type VendorRecord = MasterDataRecord;
export type GetAllVendorsRequest = GetAllMasterDataRequest;
export type GetAllVendorsResponse = GetAllMasterDataResponse;
export type GetVendorByIdResponse = GetMasterDataByIdResponse;
export type CreateVendorRequest = CreateMasterDataRequest;
export type CreateVendorResponse = CreateMasterDataResponse;
export type UpdateVendorRequest = UpdateMasterDataRequest;
export type UpdateVendorResponse = UpdateMasterDataResponse;
export type ArchiveVendorRequest = ArchiveMasterDataRequest;
export type ArchiveVendorResponse = ArchiveMasterDataResponse;

export type ProductRecord = MasterDataRecord;
export type GetAllProductsRequest = GetAllMasterDataRequest;
export type GetAllProductsResponse = GetAllMasterDataResponse;
export type GetProductByIdResponse = GetMasterDataByIdResponse;
export type CreateProductRequest = CreateMasterDataRequest;
export type CreateProductResponse = CreateMasterDataResponse;
export type UpdateProductRequest = UpdateMasterDataRequest;
export type UpdateProductResponse = UpdateMasterDataResponse;
export type ArchiveProductRequest = ArchiveMasterDataRequest;
export type ArchiveProductResponse = ArchiveMasterDataResponse;

export type MaterialRecord = MasterDataRecord;
export type GetAllMaterialsRequest = GetAllMasterDataRequest;
export type GetAllMaterialsResponse = GetAllMasterDataResponse;
export type GetMaterialByIdResponse = GetMasterDataByIdResponse;
export type CreateMaterialRequest = CreateMasterDataRequest;
export type CreateMaterialResponse = CreateMasterDataResponse;
export type UpdateMaterialRequest = UpdateMasterDataRequest;
export type UpdateMaterialResponse = UpdateMasterDataResponse;
export type ArchiveMaterialRequest = ArchiveMasterDataRequest;
export type ArchiveMaterialResponse = ArchiveMasterDataResponse;

export type CustomerRecord = MasterDataRecord;
export type GetAllCustomersRequest = GetAllMasterDataRequest;
export type GetAllCustomersResponse = GetAllMasterDataResponse;
export type GetCustomerByIdResponse = GetMasterDataByIdResponse;
export type CreateCustomerRequest = CreateMasterDataRequest;
export type CreateCustomerResponse = CreateMasterDataResponse;
export type UpdateCustomerRequest = UpdateMasterDataRequest;
export type UpdateCustomerResponse = UpdateMasterDataResponse;
export type ArchiveCustomerRequest = ArchiveMasterDataRequest;
export type ArchiveCustomerResponse = ArchiveMasterDataResponse;

export type InventoryRecord = {
  id: string;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;

  version: string;

  itemId: string;

  itemCode: string;

  onHand: number;

  incoming?: number;

  incomingBy?: Array<{ receiptId: string; receiptNumber: string; quantity: number }>;

  outgoing?: number;

  outgoingBy?: Array<{ orderId: string; orderNumber: string; quantity: number }>;

  note?: string;
};

export type GetAllInventoryRequest = {
  hash?: string;
};
export type GetAllInventoryResponse = {
  success: boolean;
  changed: boolean;

  items?: InventoryRecord[];
  hash?: string;
};

export type SetInventoryRequest = {
  onHand: number;
  note?: string;

  version?: string;

  expectedListHash?: string;
};
export type SetInventoryResponse = {
  success: boolean;
  item: InventoryRecord;

  listHash?: string;
};

export type ProductInventoryRecord = InventoryRecord;
export type GetAllProductInventoryRequest = GetAllInventoryRequest;
export type GetAllProductInventoryResponse = GetAllInventoryResponse;
export type SetProductInventoryRequest = SetInventoryRequest;
export type SetProductInventoryResponse = SetInventoryResponse;

export type MaterialInventoryRecord = InventoryRecord;
export type GetAllMaterialInventoryRequest = GetAllInventoryRequest;
export type GetAllMaterialInventoryResponse = GetAllInventoryResponse;
export type SetMaterialInventoryRequest = SetInventoryRequest;
export type SetMaterialInventoryResponse = SetInventoryResponse;

export type GoodsReceiptItemType = 'product' | 'material';

export type GoodsReceiptLine = {
  itemType: GoodsReceiptItemType;
  itemId: string;
  itemCode: string;
  itemName: string;

  quantity: number;

  unit?: string;
  note?: string;
};

export type GoodsReceiptLineInput = {
  itemType?: GoodsReceiptItemType;
  itemId: string;
  quantity: number;
  note?: string;
};

export type GoodsReceiptStatus = string;

export type GoodsReceiptRecord = {
  id: string;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;

  version: string;

  receiptNumber: string;
  status: GoodsReceiptStatus;

  vendorId?: string;

  vendorCode?: string;
  vendorName?: string;

  receivedDate?: string;
  reference?: string;
  notes?: string;
  items: GoodsReceiptLine[];

  totalQuantity: number;

  receivedAt?: DateTimeInput;
  receivedBy?: string;
  cancelledAt?: DateTimeInput;
  cancelledBy?: string;

  derivativesPending?: boolean;

  extra?: Record<string, unknown>;
};

export type QuerySyncGoodsReceiptsRequest = {
  days: string[];

  knownHashes?: Record<string, string>;
};
export type GoodsReceiptDaySync =
  { changed: false; hash: string } | { changed: true; items: GoodsReceiptRecord[]; hash: string };
export type QuerySyncGoodsReceiptsResponse = {
  success: boolean;
  days: Record<string, GoodsReceiptDaySync>;
};

export type GetGoodsReceiptByIdResponse = {
  success: boolean;
  item: GoodsReceiptRecord;

  day: string;
};

export type CreateGoodsReceiptRequest = {
  vendorId?: string;
  receivedDate?: string;
  reference?: string;
  notes?: string;

  items: GoodsReceiptLineInput[];

  extra?: Record<string, unknown>;
};
export type CreateGoodsReceiptResponse = {
  success: boolean;
  item: GoodsReceiptRecord;

  day: string;

  listHash?: string;
};

export type UpdateGoodsReceiptRequest = {
  version: string;
  patch: {
    vendorId?: string | null;
    receivedDate?: string;
    reference?: string;
    notes?: string;

    items?: GoodsReceiptLineInput[];

    extra?: Record<string, unknown>;
  };

  expectedListHash?: string;
};
export type UpdateGoodsReceiptResponse = {
  success: boolean;
  item: GoodsReceiptRecord;
  day: string;
  listHash?: string;
};

export type TransitionGoodsReceiptRequest = {
  to: string;

  version?: string;

  expectedListHash?: string;
};
export type TransitionGoodsReceiptResponse = {
  success: boolean;
  item: GoodsReceiptRecord;
  day: string;
  listHash?: string;
};

export type SalesOrderItemType = 'product' | 'material';

export type SalesOrderLine = {
  itemType: SalesOrderItemType;
  itemId: string;
  itemCode: string;
  itemName: string;

  quantity: number;
  unit?: string;

  unitPrice?: number;

  lineTotal?: number;

  deliveredQuantity?: number;
  note?: string;
};

export type SalesOrderLineInput = {
  itemType?: SalesOrderItemType;
  itemId: string;
  quantity: number;

  unitPrice?: number;
  note?: string;
};

export type SalesOrderStatus = string;

export type SalesOrderRecord = {
  id: string;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  version: string;

  orderNumber: string;
  status: SalesOrderStatus;

  customerId?: string;
  customerCode?: string;
  customerName?: string;

  customerPhone?: string;
  customerAddress?: string;

  orderDate?: string;

  requestedDate?: string;
  reference?: string;
  notes?: string;
  items: SalesOrderLine[];

  totalQuantity: number;

  totalAmount?: number;

  confirmedAt?: DateTimeInput;
  confirmedBy?: string;
  fulfilledAt?: DateTimeInput;
  fulfilledBy?: string;
  cancelledAt?: DateTimeInput;
  cancelledBy?: string;

  deliveryNotes?: SalesOrderDeliveryNoteRef[];

  remainderReduced?: SalesOrderRemainderReduced;

  paymentStatus?: SalesOrderPaymentStatus;
  paidAmount?: number;
  paidAt?: DateTimeInput;
  paidBy?: string;

  derivativesPending?: boolean;

  extra?: Record<string, unknown>;
};

export type SalesOrderRemainderReduced = {
  at: DateTimeInput;
  by: string;
  lines: Array<{
    itemType: SalesOrderItemType;
    itemId: string;
    itemCode: string;

    quantity: number;
  }>;
};

export type SalesOrderDeliveryNoteRef = {
  id: string;
  number: string;
};

export type QuerySyncSalesOrdersRequest = {
  days: string[];
  knownHashes?: Record<string, string>;
};
export type SalesOrderDaySync =
  { changed: false; hash: string } | { changed: true; items: SalesOrderRecord[]; hash: string };
export type QuerySyncSalesOrdersResponse = {
  success: boolean;
  days: Record<string, SalesOrderDaySync>;
};

export type GetSalesOrderByIdResponse = {
  success: boolean;
  item: SalesOrderRecord;
  day: string;
};

export type CreateSalesOrderRequest = {
  customerId?: string;

  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  orderDate?: string;
  requestedDate?: string;
  reference?: string;
  notes?: string;
  items: SalesOrderLineInput[];
  extra?: Record<string, unknown>;
};
export type CreateSalesOrderResponse = {
  success: boolean;
  item: SalesOrderRecord;
  day: string;
  listHash?: string;
};

export type UpdateSalesOrderRequest = {
  version: string;
  patch: {
    customerId?: string | null;

    customerName?: string;

    customerPhone?: string;
    customerAddress?: string;
    orderDate?: string;
    requestedDate?: string;
    reference?: string;
    notes?: string;
    items?: SalesOrderLineInput[];

    extra?: Record<string, unknown>;
  };
  expectedListHash?: string;
};
export type UpdateSalesOrderResponse = {
  success: boolean;
  item: SalesOrderRecord;
  day: string;
  listHash?: string;
};

export type TransitionSalesOrderRequest = {
  to: string;

  reduceRemaining?: boolean;
  version?: string;
  expectedListHash?: string;
};
export type TransitionSalesOrderResponse = {
  success: boolean;
  item: SalesOrderRecord;
  day: string;
  listHash?: string;
};

export type SalesOrderInventoryRequest = {
  action: 'lock' | 'release';

  lines?: Array<{ itemType?: SalesOrderItemType; itemId: string }>;
  version?: string;
  expectedListHash?: string;
};
export type SalesOrderInventoryResponse = {
  success: boolean;
  item: SalesOrderRecord;
  day: string;
  listHash?: string;
};

export type SalesOrderPaymentStatus = 'unpaid' | 'partial' | 'paid';

export type SetSalesOrderPaymentRequest = {
  status: SalesOrderPaymentStatus;

  paidAmount?: number;
  version?: string;
  expectedListHash?: string;
};
export type SetSalesOrderPaymentResponse = {
  success: boolean;
  item: SalesOrderRecord;
  day: string;
  listHash?: string;
};

export type DeliveryNoteItemType = 'product' | 'material';

export type DeliveryNoteType = 'internal' | 'external';

export type DeliveryNoteLine = {
  itemType: DeliveryNoteItemType;
  itemId: string;
  itemCode: string;
  itemName: string;

  quantity: number;
  unit?: string;

  reducedQuantity: number;
  note?: string;
};

export type DeliveryNoteLineInput = {
  itemType?: DeliveryNoteItemType;
  itemId: string;
  quantity: number;
  note?: string;
};

export type DeliveryNoteStatus = string;

export type DeliveryNoteRecord = {
  id: string;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  version: string;

  noteNumber: string;
  status: DeliveryNoteStatus;

  salesOrderId: string;
  salesOrderNumber: string;

  customerId?: string;
  customerCode?: string;
  customerName?: string;
  deliveryType: DeliveryNoteType;

  assignedTo?: string;
  assignedToName?: string;

  carrier?: string;

  deliveryDate?: string;
  reference?: string;
  notes?: string;
  items: DeliveryNoteLine[];

  totalQuantity: number;

  completesSalesOrder: boolean;

  photoRefs?: string[];

  deliveredAt?: DateTimeInput;
  deliveredBy?: string;
  cancelledAt?: DateTimeInput;
  cancelledBy?: string;

  derivativesPending?: boolean;

  extra?: Record<string, unknown>;
};

export type QuerySyncDeliveryNotesRequest = {
  days: string[];
  knownHashes?: Record<string, string>;
};
export type DeliveryNoteDaySync =
  { changed: false; hash: string } | { changed: true; items: DeliveryNoteRecord[]; hash: string };
export type QuerySyncDeliveryNotesResponse = {
  success: boolean;
  days: Record<string, DeliveryNoteDaySync>;
};

export type GetDeliveryNoteByIdResponse = {
  success: boolean;
  item: DeliveryNoteRecord;
  day: string;
};

export type CreateDeliveryNoteRequest = {
  salesOrderId: string;
  deliveryType: DeliveryNoteType;
  assignedTo?: string;
  carrier?: string;
  deliveryDate?: string;
  reference?: string;
  notes?: string;
  items?: DeliveryNoteLineInput[];

  completesSalesOrder?: boolean;
  extra?: Record<string, unknown>;
};
export type CreateDeliveryNoteResponse = {
  success: boolean;
  item: DeliveryNoteRecord;
  day: string;
  listHash?: string;
};

export type UpdateDeliveryNoteRequest = {
  version: string;
  patch: {
    deliveryType?: DeliveryNoteType;

    assignedTo?: string | null;
    carrier?: string;
    deliveryDate?: string;
    reference?: string;
    notes?: string;
    items?: DeliveryNoteLineInput[];
    completesSalesOrder?: boolean;

    extra?: Record<string, unknown>;
  };
  expectedListHash?: string;
};
export type UpdateDeliveryNoteResponse = {
  success: boolean;
  item: DeliveryNoteRecord;
  day: string;
  listHash?: string;
};

export type TransitionDeliveryNoteRequest = {
  to: string;

  photoRefs?: string[];

  acknowledge?: string[];
  version?: string;
  expectedListHash?: string;
};
export type TransitionDeliveryNoteResponse = {
  success: boolean;
  item: DeliveryNoteRecord;
  day: string;
  listHash?: string;
};

export type DeliveryNoteInventoryRequest = {
  action: 'reduce';

  amounts?: Array<{ itemType?: DeliveryNoteItemType; itemId: string; quantity: number }>;
  version?: string;
  expectedListHash?: string;
};
export type DeliveryNoteInventoryResponse = {
  success: boolean;
  item: DeliveryNoteRecord;
  day: string;
  listHash?: string;
};
