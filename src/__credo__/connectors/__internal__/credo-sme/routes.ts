export const CREDO_SME_ROUTES = {
  PREFIXES: {
    ADMIN_CLIENT: '/admin/clients',
    ADMIN_CONFIG: '/admin/config',
    AUTH: '/auth',
    EMPLOYEE: '/employees',
    ACTIVITY: '/activities',
    LOOKUP: '/lookup',
  },
  SUB_ROUTES: {
    ADMIN_CLIENT: {
      PROVISION: { PATH: '/provision', METHOD: 'POST' },

      LIST: { PATH: '', METHOD: 'GET' },

      REMOVE: { PATH: '/:clientServiceCode', METHOD: 'DELETE' },
    },

    ADMIN_CONFIG: {
      GET: { PATH: '/:clientServiceCode', METHOD: 'GET' },
      SET: { PATH: '/:clientServiceCode', METHOD: 'PUT' },
    },

    AUTH: {
      LOGIN: { PATH: '/login', METHOD: 'POST' },
      LOGIN_WITH_TOKEN: { PATH: '/login-with-token', METHOD: 'POST' },

      ME: { PATH: '/me', METHOD: 'GET' },

      ADOPT_SESSION: { PATH: '/adopt-session', METHOD: 'POST' },

      PERMISSION_MISMATCH: { PATH: '/permission-mismatch', METHOD: 'POST' },
    },

    EMPLOYEE: {
      GENERATE_LOGIN_TOKEN: { PATH: '/:id/generate-login-token', METHOD: 'POST' },
    },

    ACTIVITY: {
      LOG_ACTIVITIES: { PATH: '', METHOD: 'POST' },
    },

    LOOKUP: {
      GET_ALL: { PATH: '', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
      DELETE: { PATH: '/:id', METHOD: 'DELETE' },

      IMPORT_BATCH: { PATH: '/import-batch', METHOD: 'POST' },
    },
  },
};
