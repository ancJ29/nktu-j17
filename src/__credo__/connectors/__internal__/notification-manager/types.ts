

export type DeliveryChannel = 'inbox' | 'slack';
export type DeliveryStatus = 'sent' | 'failed';

export type DeliveryResult = {
  notificationId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  error?: string;
};

export type NotificationEntity = {
  id: string;
  clientId: string;
  recipientId: string;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  channels: string[];
  createdAt: Date | string;
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
  
  channels?: string[];
  
  slackChannel?: string;
  
  timestamp?: string;
};

export type CreateNotificationsRequest = {
  notifications: CreateNotificationInput[];
};
export type CreateNotificationsResponse = {
  ids: string[];
  deliveries: DeliveryResult[];
};

export type GetByRecipientRequest = {
  recipientId: string;
  clientId: string;
  cursor?: string;
  limit?: number;
  type?: string;
};
export type GetByRecipientResponse = {
  notifications: NotificationInboxItem[];
  nextCursor?: string;
};

export type GetUnreadCountRequest = {
  recipientId: string;
  clientId: string;
};
export type GetUnreadCountResponse = {
  count: number;
};

export type MarkReadRequest = {
  clientId: string;
  recipientId: string;
  notificationIds: string[];
};
export type MarkReadResponse = {
  marked: number;
};

export type GetByIdRequest = {
  id: string;
  clientId: string;
};
export type GetByIdResponse = {
  notification: NotificationEntity;
};

export type DeleteByClientRequest = {
  clientId: string;
};
export type DeleteByClientResponse = {
  deleted: number;
};
