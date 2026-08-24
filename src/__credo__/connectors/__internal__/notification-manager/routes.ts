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
      GET_BY_RECIPIENT: {
        PATH: '/by-recipient/:recipientId',
        METHOD: 'GET',
      },
    },
  },
} as const;
