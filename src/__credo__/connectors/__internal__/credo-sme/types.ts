import type { CMngtAppConfig, DateTimeInput } from '@credo/kits/types';

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

export type GetAppConfigAdminResponse = {
  success: boolean;
  config: CMngtAppConfig | null;
};

export type SetAppConfigRequest = {
  clientServiceCode: string;
  config: CMngtAppConfig;
};
export type SetAppConfigResponse = {
  success: boolean;
  config: CMngtAppConfig;
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
