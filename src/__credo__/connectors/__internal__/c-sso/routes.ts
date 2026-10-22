export const C_SSO_ROUTES = {
  PREFIXES: {
    HEALTH: '',
    SSO: '',
    ADMIN: '/admin',
    OPERATOR: '/operator',
  },
  SUB_ROUTES: {
    SSO: {
      GET_PUBLIC_KEY: { PATH: '/public-key', METHOD: 'GET' },
      LOGIN: { PATH: '/login', METHOD: 'POST' },
      GET_PROFILE: { PATH: '/me', METHOD: 'GET' },
      REFRESH_TOKEN: { PATH: '/refresh-token', METHOD: 'POST' },
      LOGIN_WITH_TOKEN: { PATH: '/login-with-token', METHOD: 'POST' },
    },

    OPERATOR: {
      OPERATOR_ADD_USER: { PATH: '/add-user', METHOD: 'POST' },
      OPERATOR_GENERATE_LOGIN_TOKEN: {
        PATH: '/generate-login-token',
        METHOD: 'POST',
      },
      OPERATOR_DELETE_USER: { PATH: '/delete-user', METHOD: 'POST' },
      OPERATOR_CHANGE_PASSWORD: { PATH: '/change-password', METHOD: 'POST' },
      OPERATOR_CHANGE_EMAIL: { PATH: '/change-email', METHOD: 'POST' },
      OPERATOR_UPDATE_PROFILE: { PATH: '/update-profile', METHOD: 'POST' },
    },
    HEALTH: {
      HEALTH_CHECK: { PATH: '/health', METHOD: 'GET' },
    },

    ADMIN: {
      ENSURE_KEYPAIRS: { PATH: '/ensure-keypairs', METHOD: 'POST' },
      ENSURE_SERVICE: { PATH: '/ensure-service', METHOD: 'POST' },
      ADD_SERVICE: { PATH: '/config/services', METHOD: 'POST' },
      ADD_CONFIG_RECORD: { PATH: '/config', METHOD: 'POST' },
      DELETE_SERVICE: { PATH: '/delete-service', METHOD: 'POST' },
      DISABLE_SERVICE: { PATH: '/disable-service', METHOD: 'POST' },
    },
  },
} as const;
