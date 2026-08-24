export type NotificationEntity = {
  id: string;
  clientId: string;
  recipientId: string;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;

  createdAt: Date | string;

  readAt: string | null;
};

export type NotificationInboxItem = NotificationEntity & {
  unread: boolean;
};

export type CreateNotificationInput = {
  clientId: string;
  recipientId: string;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;

  timestamp?: string;
};

export type CreateNotificationsRequest = {
  notifications: CreateNotificationInput[];
};
export type CreateNotificationsResponse = {
  ids: string[];
};

export type GetByRecipientRequest = {
  recipientId: string;
  clientId: string;

  cursor?: string;

  limit?: number;
};
export type GetByRecipientResponse = {
  notifications: NotificationInboxItem[];
  nextCursor?: string;
};

export type MarkReadRequest = {
  clientId: string;
  recipientId: string;
  notificationIds: string[];
};
export type MarkReadResponse = {
  marked: number;
};
