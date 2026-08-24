import { PORTS } from '@credo/kits/port';

import { createApiGroup } from '../shared/api-group';
import { NOTIFICATION_MANAGER_ROUTES } from './routes';
import type {
  CreateNotificationsRequest,
  CreateNotificationsResponse,
  GetByRecipientRequest,
  GetByRecipientResponse,
  MarkReadRequest,
  MarkReadResponse,
} from './types';

export * from './routes';

const storages = {
  target: '',
  internalAccessKey: '',
  trustedServiceKey: '',
  baseUrl: '',
};

const NOTIFICATION_ROUTES = NOTIFICATION_MANAGER_ROUTES.SUB_ROUTES.NOTIFICATION;

const getBaseUrl = () => storages.baseUrl;

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

  getByRecipient: ({ recipientId, clientId, cursor, limit }: GetByRecipientRequest) =>
    notificationApi<GetByRecipientResponse>(NOTIFICATION_ROUTES.GET_BY_RECIPIENT, {
      params: { recipientId },
      queryParams: buildListQuery({ clientId, cursor, limit }),
    }),

  markRead: ({ clientId, recipientId, notificationIds }: MarkReadRequest) =>
    notificationApi<MarkReadResponse>(NOTIFICATION_ROUTES.MARK_READ, {
      body: { clientId, recipientId, notificationIds },
    }),
};
