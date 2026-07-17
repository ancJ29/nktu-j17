export const C_STORAGE_ROUTES = {
  PREFIXES: {
    RECORD: '/api/records',
    SERVICE: '/api/services',
  },
  SUB_ROUTES: {
    RECORD: {
      GET_PUBLIC_RECORDS: {
        PATH: '/:serviceCode/public',
        METHOD: 'GET',
      },
      GET_PRIVATE_RECORDS: {
        PATH: '/:serviceCode/private',
        METHOD: 'GET',
      },
      PUSH_NEW_RECORD: {
        PATH: '/:serviceCode',
        METHOD: 'POST',
      },
      GET_RECORD_BY_KEY: {
        PATH: '/:serviceCode/:key',
        METHOD: 'GET',
      },
      GET_RECORDS_BY_KEYS: {
        PATH: '/:serviceCode/batch',
        METHOD: 'POST',
      },
      PUSH_TO_SERIES: {
        PATH: '/:serviceCode/series/:key',
        METHOD: 'POST',
      },
      GET_SERIES: {
        PATH: '/:serviceCode/series/:key',
        METHOD: 'GET',
      },
      REMOVE_RECORDS_BY_PREFIX: {
        PATH: '/:serviceCode/remove-by-prefix',
        METHOD: 'POST',
      },
      REMOVE_RECORD_BY_KEY: {
        PATH: '/:serviceCode/:key',
        METHOD: 'DELETE',
      },
      REMOVE_SERIES: {
        PATH: '/:serviceCode/series/:key',
        METHOD: 'DELETE',
      },
      REMOVE_SERIES_ITEM: {
        PATH: '/:serviceCode/series/:key/items/:itemKey',
        METHOD: 'DELETE',
      },
    },
    SERVICE: {
      GET_ALL_SERVICES: {
        PATH: '/',
        METHOD: 'GET',
      },
      REGISTER_NEW_SERVICE: {
        PATH: '/register',
        METHOD: 'POST',
      },
      GET_SERVICE_BY_ID: {
        PATH: '/:serviceCode',
        METHOD: 'GET',
      },
      UPDATE_ACCESS_KEY: {
        PATH: '/:serviceCode/update-access-key',
        METHOD: 'PATCH',
      },
      DISABLE_SERVICE: {
        PATH: '/:serviceCode/disable',
        METHOD: 'DELETE',
      },
      PURGE_SERVICE: {
        PATH: '/:serviceCode/purge',
        METHOD: 'DELETE',
      },
    },
  },
} as const;
