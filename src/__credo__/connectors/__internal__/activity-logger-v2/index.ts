import { isBrowser } from '@credo/kits/misc';

import { createApiGroup } from '../shared/api-group';
import { ACTIVITY_LOGGER_V2_ROUTES } from './routes';
import type {
  GetByActorRequest,
  GetByActorResponse,
  GetByTargetRequest,
  GetByTargetResponse,
  LogActivitiesRequest,
  LogActivitiesResponse,
} from './types';

export * from './routes';

const readTarget = {
  baseUrl: '',
};

const writeStorages = {
  internalAccessKey: '',
  baseUrl: '',
};

const ACTIVITY_ROUTES = ACTIVITY_LOGGER_V2_ROUTES.SUB_ROUTES.ACTIVITY;

function buildListQuery(input: {
  clientId: string;
  cursor?: string | undefined;
  limit?: number | undefined;
}): Record<string, string> {
  const query: Record<string, string> = { clientId: input.clientId };
  if (input.cursor) query['cursor'] = input.cursor;
  if (typeof input.limit === 'number') query['limit'] = String(input.limit);
  return query;
}

const readApi = createApiGroup({
  prefix: ACTIVITY_LOGGER_V2_ROUTES.PREFIXES.ACTIVITY,
  getBaseUrl: () => readTarget.baseUrl,
});

const writeApi = createApiGroup({
  storages: writeStorages,
  prefix: ACTIVITY_LOGGER_V2_ROUTES.PREFIXES.ACTIVITY,
  getBaseUrl: () => writeStorages.baseUrl,
  defaults: { internalAccessKeyRequired: true },
});

export const activityLoggerV2Connector = {
  setBaseUrl: (baseUrl: string) => {
    readTarget.baseUrl = baseUrl;
    return activityLoggerV2Connector;
  },

  getByActor: ({ actorId, clientId, cursor, limit }: GetByActorRequest) =>
    readApi<GetByActorResponse>(ACTIVITY_ROUTES.GET_BY_ACTOR, {
      params: { actorId },
      queryParams: buildListQuery({ clientId, cursor, limit }),
    }),

  getByTarget: ({ targetId, clientId, cursor, limit }: GetByTargetRequest) =>
    readApi<GetByTargetResponse>(ACTIVITY_ROUTES.GET_BY_TARGET, {
      params: { targetId },
      queryParams: buildListQuery({ clientId, cursor, limit }),
    }),

  setWriteBaseUrl: (baseUrl: string) => {
    writeStorages.baseUrl = baseUrl;
    return activityLoggerV2Connector;
  },

  setInternalAccessKey: (internalAccessKey: string) => {
    if (isBrowser()) {
      console.warn(
        '[activityLoggerV2Connector] the write key is server-side only. Use credoSmeConnector.logActivities from a browser.',
      );
      return activityLoggerV2Connector;
    }
    writeStorages.internalAccessKey = internalAccessKey;
    return activityLoggerV2Connector;
  },

  logActivities: ({ activities }: LogActivitiesRequest) =>
    writeApi<LogActivitiesResponse>(ACTIVITY_ROUTES.LOG_ACTIVITIES, {
      body: { activities },
    }),
};
