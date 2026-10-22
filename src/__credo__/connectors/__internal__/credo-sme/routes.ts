export const CREDO_SME_ROUTES = {
  PREFIXES: {
    ADMIN_CLIENT: '/admin/clients',
    ADMIN_CONFIG: '/admin/config',
    AUTH: '/auth',
    EMPLOYEE: '/employees',
    ACTIVITY: '/activities',
    LOOKUP: '/lookup',
    VENDOR: '/vendors',
    CUSTOMER: '/customers',
    PRODUCT: '/products',
    MATERIAL: '/materials',
    PRODUCT_INVENTORY: '/inventory/products',
    MATERIAL_INVENTORY: '/inventory/materials',
    GOODS_RECEIPT: '/goods-receipts',
    SALES_ORDER: '/sales-orders',
    DELIVERY_NOTE: '/delivery-notes',
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
      GET_ALL: { PATH: '', METHOD: 'GET' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },

      ARCHIVE: { PATH: '/:id', METHOD: 'DELETE' },

      UPDATE_LOGIN_PASSWORD: { PATH: '/:id/update-login-password', METHOD: 'POST' },
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

    VENDOR: {
      GET_ALL: { PATH: '', METHOD: 'GET' },

      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },

      ARCHIVE: { PATH: '/:id', METHOD: 'DELETE' },
    },

    CUSTOMER: {
      GET_ALL: { PATH: '', METHOD: 'GET' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
      ARCHIVE: { PATH: '/:id', METHOD: 'DELETE' },
    },

    PRODUCT: {
      GET_ALL: { PATH: '', METHOD: 'GET' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
      ARCHIVE: { PATH: '/:id', METHOD: 'DELETE' },
    },

    MATERIAL: {
      GET_ALL: { PATH: '', METHOD: 'GET' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
      ARCHIVE: { PATH: '/:id', METHOD: 'DELETE' },
    },

    PRODUCT_INVENTORY: {
      GET_ALL: { PATH: '', METHOD: 'GET' },

      SET: { PATH: '/:itemId', METHOD: 'PUT' },
    },

    MATERIAL_INVENTORY: {
      GET_ALL: { PATH: '', METHOD: 'GET' },
      SET: { PATH: '/:itemId', METHOD: 'PUT' },
    },

    GOODS_RECEIPT: {
      QUERY_SYNC: { PATH: '/query-sync', METHOD: 'POST' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },

      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },

      TRANSITION: { PATH: '/:id/transition', METHOD: 'POST' },
    },

    SALES_ORDER: {
      QUERY_SYNC: { PATH: '/query-sync', METHOD: 'POST' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
      TRANSITION: { PATH: '/:id/transition', METHOD: 'POST' },
      INVENTORY: { PATH: '/:id/inventory', METHOD: 'POST' },
      PAYMENT: { PATH: '/:id/payment', METHOD: 'POST' },
    },

    DELIVERY_NOTE: {
      QUERY_SYNC: { PATH: '/query-sync', METHOD: 'POST' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
      TRANSITION: { PATH: '/:id/transition', METHOD: 'POST' },
      INVENTORY: { PATH: '/:id/inventory', METHOD: 'POST' },
    },
  },
};
