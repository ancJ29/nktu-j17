import { isBrowser } from '@credo/kits/misc';
import { PORTS } from '@credo/kits/port';

import { createApiGroup } from '../shared/api-group';
import { targets, urls } from '../shared/config';
import { C_STORAGE_ROUTES } from './routes';
import type {
  DisableServiceRequest,
  DisableServiceResponse,
  GetAllServicesRequest,
  GetAllServicesResponse,
  GetPrivateRecordsRequest,
  GetPrivateRecordsResponse,
  GetPublicRecordsRequest,
  GetPublicRecordsResponse,
  GetRecordByKeyRequest,
  GetRecordByKeyResponse,
  GetRecordsByKeysRequest,
  GetRecordsByKeysResponse,
  GetSeriesRequest,
  GetSeriesResponse,
  GetServiceByKeyRequest,
  GetServiceByKeyResponse,
  PurgeServiceRequest,
  PurgeServiceResponse,
  PushRecordRequest,
  PushRecordResponse,
  PushToSeriesRequest,
  PushToSeriesResponse,
  RegisterServiceRequest,
  RegisterServiceResponse,
  RemoveRecordRequest,
  RemoveRecordResponse,
  RemoveRecordsByPrefixRequest,
  RemoveRecordsByPrefixResponse,
  RemoveSeriesItemRequest,
  RemoveSeriesItemResponse,
  RemoveSeriesRequest,
  UpdateAccessKeyRequest,
  UpdateAccessKeyResponse,
} from './types';

export * from './routes';

const storages = {
  target: targets['cStorage'] || '',
  accessKey: '',
  callerService: '',
  internalAccessKey: '',
  superAdminAccessKey: '',
  trustedServiceKey: '',
  baseUrl: urls['cStorage'] || '',
};

const RECORD_ROUTES = C_STORAGE_ROUTES.SUB_ROUTES.RECORD;
const SERVICE_ROUTES = C_STORAGE_ROUTES.SUB_ROUTES.SERVICE;

const getBaseUrl = () => storages.baseUrl;

function buildPaginationQuery(input: {
  cursor?: string | undefined;
  limit?: number | undefined;
  noData?: boolean | undefined;
}): Record<string, string> | undefined {
  const query: Record<string, string> = {};
  if (input.cursor) query['cursor'] = input.cursor;
  if (typeof input.limit === 'number') query['limit'] = String(input.limit);
  if (input.noData) query['noData'] = 'true';
  return Object.keys(query).length > 0 ? query : undefined;
}

const recordApi = createApiGroup({
  storages,
  prefix: C_STORAGE_ROUTES.PREFIXES.RECORD,
  getBaseUrl,
  defaults: { internalAccessKeyRequired: true },
});

const serviceApi = createApiGroup({
  storages,
  prefix: C_STORAGE_ROUTES.PREFIXES.SERVICE,
  getBaseUrl,
  defaults: {
    superAdminAccessKeyRequired: true,
    internalAccessKeyRequired: true,
  },
});

export const cStorageConnector = {
  useLocal: () => {
    return cStorageConnector.setBaseUrl(`http://localhost:${PORTS.C_STORAGE}`);
  },

  setTarget: (target: string) => {
    if (target) {
      storages.target = target;
    }
    return cStorageConnector;
  },
  setBaseUrl: (baseUrl: string) => {
    if (baseUrl) {
      storages.baseUrl = baseUrl;
    }
    return cStorageConnector;
  },
  setSuperAdminAccessKey: (superAdminAccessKey: string) => {
    if (superAdminAccessKey) {
      storages.superAdminAccessKey = superAdminAccessKey;
    }
    return cStorageConnector;
  },
  clearSuperAdminAccessKey: () => {
    storages.superAdminAccessKey = '';
    return cStorageConnector;
  },
  setCallerService: (service: string) => {
    if (service) {
      storages.callerService = service;
    }
    return cStorageConnector;
  },
  setAccessKey: (accessKey: string) => {
    if (!accessKey) {
      return cStorageConnector;
    }
    storages.accessKey = accessKey;
    return cStorageConnector;
  },
  setInternalAccessKey: (internalAccessKey: string) => {
    if (!internalAccessKey) {
      return cStorageConnector;
    }

    if (isBrowser()) {
      console.warn(
        '[cStorageConnector] setInternalAccessKey is disabled in browser context. c-storage is not intended for direct FE access.',
      );
      return cStorageConnector;
    }
    storages.internalAccessKey = internalAccessKey;
    return cStorageConnector;
  },
  setTrustedServiceKey: (trustedServiceKey: string) => {
    if (trustedServiceKey) {
      storages.trustedServiceKey = trustedServiceKey;
    }
    return cStorageConnector;
  },

  getPublicRecords: <T>({ serviceCode, cursor, limit, noData }: GetPublicRecordsRequest) =>
    recordApi<GetPublicRecordsResponse<T>>(RECORD_ROUTES.GET_PUBLIC_RECORDS, {
      params: { serviceCode },
      queryParams: buildPaginationQuery({ cursor, limit, noData }),
      noContentType: true,
    }),

  getPrivateRecords: <T>({
    serviceCode,
    accessKey,
    cursor,
    limit,
    noData,
  }: GetPrivateRecordsRequest) =>
    recordApi<GetPrivateRecordsResponse<T>>(RECORD_ROUTES.GET_PRIVATE_RECORDS, {
      params: { serviceCode },
      queryParams: buildPaginationQuery({ cursor, limit, noData }),
      accessKey,
      accessKeyRequired: true,
    }),

  getRecordByKey: <T>({
    serviceCode,
    key,
    accessKey,
    allowNotFound = true,
  }: GetRecordByKeyRequest) =>
    recordApi<GetRecordByKeyResponse<T>>(RECORD_ROUTES.GET_RECORD_BY_KEY, {
      params: { serviceCode, key },
      accessKey,
    }).catch((error) => {
      if (allowNotFound && error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }),

  getRecordsByKeys: <T>({ serviceCode, keys, accessKey }: GetRecordsByKeysRequest) =>
    recordApi<GetRecordsByKeysResponse<T>>(RECORD_ROUTES.GET_RECORDS_BY_KEYS, {
      params: { serviceCode },
      body: { keys },
      accessKey,
      accessKeyRequired: true,
    }),

  pushRecord: ({ serviceCode, key, isPrivate, data, description }: PushRecordRequest) =>
    recordApi<PushRecordResponse>(RECORD_ROUTES.PUSH_NEW_RECORD, {
      params: { serviceCode, key },
      body: {
        key,
        data,
        isPrivate: isPrivate ?? true,
        description: description ?? '',
      },
      accessKeyRequired: true,
    }),

  removeRecordsByPrefix: ({ serviceCode, prefix, dryRun }: RemoveRecordsByPrefixRequest) =>
    recordApi<RemoveRecordsByPrefixResponse>(RECORD_ROUTES.REMOVE_RECORDS_BY_PREFIX, {
      params: { serviceCode },
      body: { prefix, dryRun: dryRun ?? false },
      accessKeyRequired: true,
    }),

  removeRecord: ({ serviceCode, key }: RemoveRecordRequest) =>
    recordApi<RemoveRecordResponse>(RECORD_ROUTES.REMOVE_RECORD_BY_KEY, {
      params: { serviceCode, key },
      noContentType: true,
      accessKeyRequired: true,
    }),

  pushToSeries: ({ serviceCode, key, items, isPrivate, description }: PushToSeriesRequest) =>
    recordApi<PushToSeriesResponse>(RECORD_ROUTES.PUSH_TO_SERIES, {
      params: { serviceCode, key },
      body: {
        items,
        isPrivate: isPrivate ?? true,
        description: description ?? '',
      },
      accessKeyRequired: true,
    }),

  getSeries: ({ serviceCode, key, accessKey }: GetSeriesRequest) =>
    recordApi<GetSeriesResponse>(RECORD_ROUTES.GET_SERIES, {
      params: { serviceCode, key },
      accessKey,
    }),

  removeSeries: ({ serviceCode, key, accessKey }: RemoveSeriesRequest) =>
    recordApi<void>(RECORD_ROUTES.REMOVE_SERIES, {
      params: { serviceCode, key },
      accessKey,
      accessKeyRequired: true,
    }),

  removeSeriesItem: ({ serviceCode, key, itemKey, accessKey }: RemoveSeriesItemRequest) =>
    recordApi<RemoveSeriesItemResponse>(RECORD_ROUTES.REMOVE_SERIES_ITEM, {
      params: { serviceCode, key, itemKey: String(itemKey) },
      accessKey,
      accessKeyRequired: true,
    }),

  getAllServices: ({ fullData }: GetAllServicesRequest = {}) =>
    serviceApi<GetAllServicesResponse>(SERVICE_ROUTES.GET_ALL_SERVICES, {
      queryParams: fullData ? { fullData: '1' } : undefined,
    }),

  registerService: ({ name, code, description, accessKey, memo }: RegisterServiceRequest) =>
    serviceApi<RegisterServiceResponse>(SERVICE_ROUTES.REGISTER_NEW_SERVICE, {
      body: {
        name,
        code,
        description: description ?? '',
        accessKey,
        memo: memo ?? {},
      },
    }),

  getServiceByKey: ({ serviceCode }: GetServiceByKeyRequest) =>
    serviceApi<GetServiceByKeyResponse>(SERVICE_ROUTES.GET_SERVICE_BY_ID, {
      params: { serviceCode },
    }),

  updateAccessKey: ({ serviceCode, accessKey }: UpdateAccessKeyRequest) =>
    serviceApi<UpdateAccessKeyResponse>(SERVICE_ROUTES.UPDATE_ACCESS_KEY, {
      params: { serviceCode },
      body: { accessKey },
    }),

  disableService: ({ serviceCode }: DisableServiceRequest) =>
    serviceApi<DisableServiceResponse>(SERVICE_ROUTES.DISABLE_SERVICE, {
      params: { serviceCode },
    }),

  purgeService: ({ serviceCode }: PurgeServiceRequest) =>
    serviceApi<PurgeServiceResponse>(SERVICE_ROUTES.PURGE_SERVICE, {
      params: { serviceCode },
    }),
};
