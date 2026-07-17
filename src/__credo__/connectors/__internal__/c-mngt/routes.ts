export const C_MNGT_ROUTES = {
  PREFIXES: {
    EMPLOYEE: '/employees',
    PRODUCT: '/products',
    ADMIN_CLIENT: '/admin/clients',
    ADMIN_CONFIG: '/admin/config',
    ADMIN_SERVICE: '/admin',
    CLIENT: '/clients',
    CONFIG: '/config',
    MASTER_DATA: '/master-data',
    SALES_ORDER: '/sales-orders',
    DELIVERY_REQUEST: '/delivery-requests',
    GOODS_RECEIPT: '/goods-receipts',
    LOCATION: '/locations',
    PRODUCT_INVENTORY: '/product-inventory',
    LOOKUP: '/lookups',
    OPERATION_LOG: '/operation-logs',
    GENERIC_RECORD: '/generic-records',
    SINGLE_RECORDS: '/single-records',
    PARTITIONED_RECORDS: '/partitioned-records',
  },
  SUB_ROUTES: {
    EMPLOYEE: {
      GET_ALL: { PATH: '', METHOD: 'GET' },
      SEARCH: { PATH: '/search', METHOD: 'GET' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
      
      GENERATE_LOGIN_TOKEN: { PATH: '/:id/generate-login-token', METHOD: 'POST' },
      UPDATE_LOGIN_PASSWORD: { PATH: '/:id/update-login-password', METHOD: 'POST' },
      IMPORT_BATCH: { PATH: '/import-batch', METHOD: 'POST' },
    },
    PRODUCT: {
      GET_ALL: { PATH: '', METHOD: 'GET' },
      SEARCH: { PATH: '/search', METHOD: 'GET' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
      DELETE: { PATH: '/:id', METHOD: 'DELETE' },
      IMPORT_BATCH: { PATH: '/import-batch', METHOD: 'POST' },
    },
    ADMIN_CLIENT: {
      REGISTER: { PATH: '', METHOD: 'POST' },
      PROVISION: { PATH: '/provision', METHOD: 'POST' },
      LIST: { PATH: '', METHOD: 'GET' },
      ENABLE: { PATH: '/:clientServiceCode/enable', METHOD: 'POST' },
      DISABLE: { PATH: '/:clientServiceCode/disable', METHOD: 'POST' },
      REMOVE: { PATH: '/:clientServiceCode', METHOD: 'DELETE' },
    },
    ADMIN_SERVICE: {
      ENSURE_SERVICE: { PATH: '/ensure-service', METHOD: 'POST' },
    },
    CLIENT: {
      GET_BY_SERVICE_CODE: { PATH: '/:clientServiceCode', METHOD: 'GET' },
    },
    ADMIN_CONFIG: {
      SET: { PATH: '/:clientServiceCode', METHOD: 'PUT' },
      GET: { PATH: '/:clientServiceCode', METHOD: 'GET' },
    },
    CONFIG: {
      GET: { PATH: '/:clientServiceCode', METHOD: 'GET' },
      
      
      
      
      SET_EMPLOYEE: { PATH: '/employee', METHOD: 'PUT' },
    },
    MASTER_DATA: {
      GET_ALL: { PATH: '', METHOD: 'GET' },
      RESYNC: { PATH: '/resync', METHOD: 'POST' },
    },
    SALES_ORDER: {
      QUERY: { PATH: '/query', METHOD: 'GET' },
      
      
      QUERY_SYNC: { PATH: '/query-sync', METHOD: 'POST' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
    },
    DELIVERY_REQUEST: {
      QUERY: { PATH: '/query', METHOD: 'GET' },
      QUERY_SYNC: { PATH: '/query-sync', METHOD: 'POST' },
      GET_BY_IDS: { PATH: '/by-ids', METHOD: 'GET' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
    },
    GOODS_RECEIPT: {
      QUERY: { PATH: '/query', METHOD: 'GET' },
      QUERY_SYNC: { PATH: '/query-sync', METHOD: 'POST' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
    },
    LOCATION: {
      GET_ALL: { PATH: '', METHOD: 'GET' },
      SEARCH: { PATH: '/search', METHOD: 'GET' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
      DELETE: { PATH: '/:id', METHOD: 'DELETE' },
      IMPORT_BATCH: { PATH: '/import-batch', METHOD: 'POST' },
    },
    PRODUCT_INVENTORY: {
      GET_ALL: { PATH: '', METHOD: 'GET' },
      SEARCH: { PATH: '/search', METHOD: 'GET' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
      DELETE: { PATH: '/:id', METHOD: 'DELETE' },
      IMPORT_BATCH: { PATH: '/import-batch', METHOD: 'POST' },
    },
    LOOKUP: {
      GET_ALL: { PATH: '', METHOD: 'GET' },
      SEARCH: { PATH: '/search', METHOD: 'GET' },
      GET_BY_ID: { PATH: '/:id', METHOD: 'GET' },
      GET_BY_CATEGORY: { PATH: '/by-category/:category', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
      DELETE: { PATH: '/:id', METHOD: 'DELETE' },
      IMPORT_BATCH: { PATH: '/import-batch', METHOD: 'POST' },
    },
    OPERATION_LOG: {
      GET_BY_TARGET: { PATH: '/by-target/:targetId/:period', METHOD: 'GET' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
      DELETE: { PATH: '/:id', METHOD: 'DELETE' },
    },
    GENERIC_RECORD: {
      QUERY: { PATH: '/query', METHOD: 'GET' },
      
      
      QUERY_SYNC: { PATH: '/query-sync', METHOD: 'POST' },
      CREATE: { PATH: '', METHOD: 'POST' },
      UPDATE: { PATH: '/:id', METHOD: 'PATCH' },
      DELETE: { PATH: '/:id', METHOD: 'DELETE' },
    },
    
    
    
    
    SINGLE_RECORDS: {
      GET_ALL: { PATH: '/:entity', METHOD: 'GET' },
      IMPORT_BATCH: { PATH: '/:entity/import-batch', METHOD: 'POST' },
      GET_BY_ID: { PATH: '/:entity/:id', METHOD: 'GET' },
      CREATE: { PATH: '/:entity', METHOD: 'POST' },
      UPDATE: { PATH: '/:entity/:id', METHOD: 'PATCH' },
      DELETE: { PATH: '/:entity/:id', METHOD: 'DELETE' },
    },
    PARTITIONED_RECORDS: {
      
      
      QUERY: { PATH: '/:entity/query', METHOD: 'POST' },
      QUERY_SYNC: { PATH: '/:entity/query-sync', METHOD: 'POST' },
      GET_BY_ID: { PATH: '/:entity/:id', METHOD: 'GET' },
      CREATE: { PATH: '/:entity', METHOD: 'POST' },
      UPDATE: { PATH: '/:entity/:id', METHOD: 'PATCH' },
      DELETE: { PATH: '/:entity/:id', METHOD: 'DELETE' },
    },
  },
} as const;
