import { PORTS } from '@credo/kits/port';

import { createApiGroup } from '../shared/api-group';
import { targets, urls } from '../shared/config';
import { NOTIFICATION_MANAGER_ROUTES } from './routes';
import type {
  CreateNotificationsRequest,
  CreateNotificationsResponse,
  DeleteByClientRequest,
  DeleteByClientResponse,
  GetByIdRequest,
  GetByIdResponse,
  GetByRecipientRequest,
  GetByRecipientResponse,
  GetUnreadCountRequest,
  GetUnreadCountResponse,
  MarkReadRequest,
  MarkReadResponse,
} from './types';

export * from './routes';

const storages = {
  target: targets['notificationManager'] || '',
  internalAccessKey: '',
  trustedServiceKey: '',
  baseUrl: urls['notificationManager'] || '',
};

const NOTIFICATION_ROUTES = NOTIFICATION_MANAGER_ROUTES.SUB_ROUTES.NOTIFICATION;

const getBaseUrl = () => storages.baseUrl;

function buildListQuery(input: {
  clientId: string;
  cursor?: string | undefined;
  limit?: number | undefined;
  type?: string | undefined;
}): Record<string, string> {
  const query: Record<string, string> = { clientId: input.clientId };
  if (input.cursor) query['cursor'] = input.cursor;
  if (typeof input.limit === 'number') query['limit'] = String(input.limit);
  if (input.type) query['type'] = input.type;
  return query;
}

const notificationApi = createApiGroup({
  storages,
  prefix: NOTIFICATION_MANAGER_ROUTES.PREFIXES.NOTIFICATION,
  getBaseUrl,
  defaults: { internalAccessKeyRequired: true },
});

export const notificationManagerConnector = {
  useLocal: () => {
    return notificationManagerConnector.setBaseUrl(
      `http://localhost:${PORTS.NOTIFICATION_MANAGER}`,
    );
  },

  setTarget: (target: string) => {
    storages.target = target;
    return notificationManagerConnector;
  },
  setBaseUrl: (baseUrl: string) => {
    storages.baseUrl = baseUrl;
    return notificationManagerConnector;
  },
  setInternalAccessKey: (internalAccessKey: string) => {
    storages.internalAccessKey = internalAccessKey;
    return notificationManagerConnector;
  },
  setTrustedServiceKey: (trustedServiceKey: string) => {
    storages.trustedServiceKey = trustedServiceKey;
    return notificationManagerConnector;
  },

  createNotifications: ({ notifications }: CreateNotificationsRequest) =>
    notificationApi<CreateNotificationsResponse>(NOTIFICATION_ROUTES.CREATE_NOTIFICATIONS, {
      body: { notifications },
    }),

  getByRecipient: ({ recipientId, clientId, cursor, limit, type }: GetByRecipientRequest) =>
    notificationApi<GetByRecipientResponse>(NOTIFICATION_ROUTES.GET_BY_RECIPIENT, {
      params: { recipientId },
      queryParams: buildListQuery({ clientId, cursor, limit, type }),
    }),

  getUnreadCount: ({ recipientId, clientId }: GetUnreadCountRequest) =>
    notificationApi<GetUnreadCountResponse>(NOTIFICATION_ROUTES.GET_UNREAD_COUNT, {
      params: { recipientId },
      queryParams: { clientId },
    }),

  markRead: ({ clientId, recipientId, notificationIds }: MarkReadRequest) =>
    notificationApi<MarkReadResponse>(NOTIFICATION_ROUTES.MARK_READ, {
      body: { clientId, recipientId, notificationIds },
    }),

  getById: ({ id, clientId, allowNotFound = true }: GetByIdRequest & { allowNotFound?: boolean }) =>
    notificationApi<GetByIdResponse>(NOTIFICATION_ROUTES.GET_BY_ID, {
      params: { id },
      queryParams: { clientId },
    }).catch((error) => {
      if (allowNotFound && error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }),

  deleteByClient: ({ clientId }: DeleteByClientRequest) =>
    notificationApi<DeleteByClientResponse>(NOTIFICATION_ROUTES.DELETE_BY_CLIENT, {
      params: { clientId },
    }),
};
