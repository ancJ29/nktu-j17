export const C_SSO_ROUTES = {
  PREFIXES: {
    HEALTH: '',
    SSO: '',
    ADMIN: '/admin',

    V2: '/v2',
  },
  SUB_ROUTES: {
    SSO: {
      LOGIN: { PATH: '/login', METHOD: 'POST' },
      GET_PROFILE: { PATH: '/me', METHOD: 'GET' },
      REFRESH_TOKEN: { PATH: '/refresh-token', METHOD: 'POST' },
      LOGIN_WITH_TOKEN: { PATH: '/login-with-token', METHOD: 'POST' },
    },

    V2: {
      GET_PUBLIC_KEY: { PATH: '/public-key', METHOD: 'GET' },

      ADD_SERVICE: { PATH: '/config/services', METHOD: 'POST' },
      ADD_CONFIG_RECORD: { PATH: '/config', METHOD: 'POST' },
      DELETE_SERVICE: { PATH: '/admin/delete-service', METHOD: 'POST' },
      DISABLE_SERVICE: { PATH: '/admin/disable-service', METHOD: 'POST' },

      OPERATOR_ADD_USER: { PATH: '/operator/add-user', METHOD: 'POST' },
      OPERATOR_GENERATE_LOGIN_TOKEN: {
        PATH: '/operator/generate-login-token',
        METHOD: 'POST',
      },
      OPERATOR_DELETE_USER: { PATH: '/operator/delete-user', METHOD: 'POST' },
      OPERATOR_CHANGE_PASSWORD: { PATH: '/operator/change-password', METHOD: 'POST' },
      OPERATOR_CHANGE_EMAIL: { PATH: '/operator/change-email', METHOD: 'POST' },
      OPERATOR_UPDATE_PROFILE: { PATH: '/operator/update-profile', METHOD: 'POST' },
    },
    HEALTH: {
      HEALTH_CHECK: { PATH: '/health', METHOD: 'GET' },
    },

    ADMIN: {
      ENSURE_KEYPAIRS: { PATH: '/ensure-keypairs', METHOD: 'POST' },
      ENSURE_SERVICE: { PATH: '/ensure-service', METHOD: 'POST' },
    },
  },
} as const;
