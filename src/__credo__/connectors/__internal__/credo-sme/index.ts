import { PORTS } from '@credo/kits/port';

import { createApiGroup } from '../shared/api-group';

import type { LoginRequest, LoginWithTokenRequest } from '../c-sso/types';
import { targets, urls } from '../shared/config';
import { registerStagePrefix } from '../shared/transport-state';
import { CREDO_SME_ROUTES } from './routes';
import type {
  AuthMintResponse,
  CreateLookupRequest,
  CreateLookupResponse,
  DeleteLookupRequest,
  DeleteLookupResponse,
  GetAllLookupsRequest,
  GetAllLookupsResponse,
  GetLookupByIdResponse,
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
  UpdateLookupRequest,
  UpdateLookupResponse,
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
const AUTH_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.AUTH;
const ACTIVITY_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.ACTIVITY;
const LOOKUP_ROUTES = CREDO_SME_ROUTES.SUB_ROUTES.LOOKUP;

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

const lookupApi = createApiGroup({
  storages,
  prefix: CREDO_SME_ROUTES.PREFIXES.LOOKUP,
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

  getLookupById: ({ id }: { id: string }) =>
    lookupApi<GetLookupByIdResponse>(LOOKUP_ROUTES.GET_BY_ID, {
      params: { id },
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
};
