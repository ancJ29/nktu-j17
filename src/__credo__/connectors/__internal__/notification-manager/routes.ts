export const NOTIFICATION_MANAGER_ROUTES = {
  PREFIXES: {
    NOTIFICATION: '/api/notifications',
  },
  SUB_ROUTES: {
    NOTIFICATION: {
      CREATE_NOTIFICATIONS: {
        PATH: '',
        METHOD: 'POST',
      },
      MARK_READ: {
        PATH: '/read',
        METHOD: 'POST',
      },
      GET_UNREAD_COUNT: {
        PATH: '/by-recipient/:recipientId/unread-count',
        METHOD: 'GET',
      },
      GET_BY_RECIPIENT: {
        PATH: '/by-recipient/:recipientId',
        METHOD: 'GET',
      },
      GET_BY_ID: {
        PATH: '/:id',
        METHOD: 'GET',
      },
      DELETE_BY_CLIENT: {
        PATH: '/by-client/:clientId',
        METHOD: 'DELETE',
      },
    },
  },
} as const;
