import { PORTS } from '@credo/kits/port';

import { createApiGroup } from '../shared/api-group';
import { urls } from '../shared/config';
import { ACTIVITY_LOGGER_ROUTES } from './routes';
import type {
  DeleteByClientRequest,
  DeleteByClientResponse,
  GetByActorRequest,
  GetByActorResponse,
  GetByIdRequest,
  GetByIdResponse,
  GetByTargetRequest,
  GetByTargetResponse,
  LogActivitiesRequest,
  LogActivitiesResponse,
} from './types';

export * from './routes';

const storages = {
  internalAccessKey: '',
  trustedServiceKey: '',
  baseUrl: urls['activityLogger'] || '',
};

const ACTIVITY_ROUTES = ACTIVITY_LOGGER_ROUTES.SUB_ROUTES.ACTIVITY;

const getBaseUrl = () => storages.baseUrl;

function buildListQuery(input: {
  clientId: string;
  cursor?: string | undefined;
  limit?: number | undefined;
  action?: string | undefined;
}): Record<string, string> {
  const query: Record<string, string> = { clientId: input.clientId };
  if (input.cursor) query['cursor'] = input.cursor;
  if (typeof input.limit === 'number') query['limit'] = String(input.limit);
  if (input.action) query['action'] = input.action;
  return query;
}

const activityApi = createApiGroup({
  storages,
  prefix: ACTIVITY_LOGGER_ROUTES.PREFIXES.ACTIVITY,
  getBaseUrl,
  defaults: { internalAccessKeyRequired: true },
});

export const activityLoggerConnector = {
  useLocal: () => {
    return activityLoggerConnector.setBaseUrl(`http://localhost:${PORTS.ACTIVITY_LOGGER}`);
  },
  setBaseUrl: (baseUrl: string) => {
    storages.baseUrl = baseUrl;
    return activityLoggerConnector;
  },
  setInternalAccessKey: (internalAccessKey: string) => {
    storages.internalAccessKey = internalAccessKey;
    return activityLoggerConnector;
  },
  setTrustedServiceKey: (trustedServiceKey: string) => {
    storages.trustedServiceKey = trustedServiceKey;
    return activityLoggerConnector;
  },

  logActivities: ({ activities }: LogActivitiesRequest) =>
    activityApi<LogActivitiesResponse>(ACTIVITY_ROUTES.LOG_ACTIVITIES, {
      body: { activities },
    }),

  getByActor: ({ actorId, clientId, cursor, limit, action }: GetByActorRequest) =>
    activityApi<GetByActorResponse>(ACTIVITY_ROUTES.GET_BY_ACTOR, {
      params: { actorId },
      queryParams: buildListQuery({ clientId, cursor, limit, action }),
    }),

  getByTarget: ({ targetId, clientId, cursor, limit }: GetByTargetRequest) =>
    activityApi<GetByTargetResponse>(ACTIVITY_ROUTES.GET_BY_TARGET, {
      params: { targetId },
      queryParams: buildListQuery({ clientId, cursor, limit }),
    }),

  getById: ({ id, clientId, allowNotFound = true }: GetByIdRequest & { allowNotFound?: boolean }) =>
    activityApi<GetByIdResponse>(ACTIVITY_ROUTES.GET_BY_ID, {
      params: { id },
      queryParams: { clientId },
    }).catch((error) => {
      if (allowNotFound && error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }),

  deleteByClient: ({ clientId }: DeleteByClientRequest) =>
    activityApi<DeleteByClientResponse>(ACTIVITY_ROUTES.DELETE_BY_CLIENT, {
      params: { clientId },
    }),
};
