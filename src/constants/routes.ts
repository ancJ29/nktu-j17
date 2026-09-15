export const ROUTES = {
  APP: {
    MAIN: '/',
  },
  EMPLOYEES: {
    LIST: '/employees',
    NEW: '/employees/new',

    ORG_SETTINGS: '/employees/organization',
    DETAIL: '/employees/:id',
    EDIT: '/employees/:id/edit',
  },
  PROFILE: '/profile',
  MORE: '/more',
  REPORTS: '/reports',

  AUTH: {
    LOGIN: '/login',
    LOGOUT: '/logout',
    LOGIN_VIA_QR_CODE: '/login-via-qr-code',
  },
  DELIVERY: {
    LIST: '/delivery',
    NEW: '/delivery/new',
    DETAIL: '/delivery/:id',
    EDIT: '/delivery/:id/edit',
  },
  SALES_ORDERS: {
    LIST: '/sales-orders',
    NEW: '/sales-orders/new',
    DETAIL: '/sales-orders/:id',
    EDIT: '/sales-orders/:id/edit',
  },
  GOODS_RECEIPTS: {
    LIST: '/goods-receipts',
    NEW: '/goods-receipts/new',
    DETAIL: '/goods-receipts/:id',
    EDIT: '/goods-receipts/:id/edit',
  },
  TRANSPORT_ORDERS: {
    LIST: '/transport-orders',
    NEW: '/transport-orders/new',
    DETAIL: '/transport-orders/:id',
    EDIT: '/transport-orders/:id/edit',

    NEW_MULTI_DROP: '/transport-orders/new-multi-drop',
    EDIT_MULTI_DROP: '/transport-orders/:id/edit-multi-drop',
  },

  TRANSPORT_ROUTES: {
    LIST: '/transport-routes',
    NEW: '/transport-routes/new',
    EDIT: '/transport-routes/:id/edit',
  },

  COST_NORMS: {
    LIST: '/cost-norms',
  },
  INVENTORY: {
    PRODUCTS: '/inventory/products',
    MATERIALS: '/inventory/materials',
  },

  QUOTATIONS: {
    LIST: '/quotations',
    NEW: '/quotations/new',
    DETAIL: '/quotations/:id',
    EDIT: '/quotations/:id/edit',
  },
  WAREHOUSE_RECEIPTS: {
    LIST: '/warehouse-receipts',
    NEW: '/warehouse-receipts/new',
    DETAIL: '/warehouse-receipts/:id',
    EDIT: '/warehouse-receipts/:id/edit',
  },
  WAREHOUSE_DELIVERY_NOTES: {
    LIST: '/warehouse-delivery-notes',
    NEW: '/warehouse-delivery-notes/new',
    DETAIL: '/warehouse-delivery-notes/:id',
    EDIT: '/warehouse-delivery-notes/:id/edit',
  },
  LOCATIONS: {
    LIST: '/locations',
    NEW: '/locations/new',
    DETAIL: '/locations/:id',
    EDIT: '/locations/:id/edit',
  },
  ASSETS: {
    TRUCKS: {
      LIST: '/assets/trucks',
      NEW: '/assets/trucks/new',
      DETAIL: '/assets/trucks/:id',
      EDIT: '/assets/trucks/:id/edit',
    },
  },
  OIL_TANKS: {
    LIST: '/oil-tanks',
    NEW: '/oil-tanks/new',
    DETAIL: '/oil-tanks/:id',
    EDIT: '/oil-tanks/:id/edit',
  },
  GREENHOUSES: {
    LIST: '/greenhouses',
    NEW: '/greenhouses/new',
    DETAIL: '/greenhouses/:id',
    EDIT: '/greenhouses/:id/edit',
  },
  CROPS: {
    LIST: '/crops',
    NEW: '/crops/new',
    DETAIL: '/crops/:id',
    EDIT: '/crops/:id/edit',
  },
  CROP_DIARY_TEMPLATES: {
    LIST: '/crop-diary-templates',
    NEW: '/crop-diary-templates/new',
    DETAIL: '/crop-diary-templates/:id',
    EDIT: '/crop-diary-templates/:id/edit',
  },
  PRODUCTS: {
    LIST: '/products',
    NEW: '/products/new',
    DETAIL: '/products/:id',
    EDIT: '/products/:id/edit',
  },
  MATERIALS: {
    LIST: '/materials',
    NEW: '/materials/new',
    DETAIL: '/materials/:id',
    EDIT: '/materials/:id/edit',
  },
  CUSTOMERS: {
    LIST: '/customers',
    NEW: '/customers/new',
    DETAIL: '/customers/:id',
    EDIT: '/customers/:id/edit',
  },
  VENDORS: {
    LIST: '/vendors',
    NEW: '/vendors/new',
    DETAIL: '/vendors/:id',
    EDIT: '/vendors/:id/edit',
  },
  VENDORS_V2: {
    LIST: '/vendors-v2',
    NEW: '/vendors-v2/new',
    DETAIL: '/vendors-v2/:id',
    EDIT: '/vendors-v2/:id/edit',
  },
  CUSTOMERS_V2: {
    LIST: '/customers-v2',
    NEW: '/customers-v2/new',
    DETAIL: '/customers-v2/:id',
    EDIT: '/customers-v2/:id/edit',
  },
  PRODUCTS_V2: {
    LIST: '/products-v2',
    NEW: '/products-v2/new',
    DETAIL: '/products-v2/:id',
    EDIT: '/products-v2/:id/edit',
  },
  MATERIALS_V2: {
    LIST: '/materials-v2',
    NEW: '/materials-v2/new',
    DETAIL: '/materials-v2/:id',
    EDIT: '/materials-v2/:id/edit',
  },
  GOODS_RECEIPTS_V2: {
    LIST: '/goods-receipts-v2',
    NEW: '/goods-receipts-v2/new',
    DETAIL: '/goods-receipts-v2/:id',
    EDIT: '/goods-receipts-v2/:id/edit',
  },
  SALES_ORDERS_V2: {
    LIST: '/sales-orders-v2',
    NEW: '/sales-orders-v2/new',
    DETAIL: '/sales-orders-v2/:id',
    EDIT: '/sales-orders-v2/:id/edit',
  },

  DELIVERY_NOTES_V2: {
    LIST: '/delivery-notes-v2',
    DETAIL: '/delivery-notes-v2/:id',
  },
  LOOKUPS_V2: {
    LIST: '/lookups-v2',
  },
  CONFIGURATION: {
    APP_CONFIG: '/app-config',
    DEBUG: '/debug',
  },
  NOT_FOUND: '/404-not-found',
  FORBIDDEN: '/403-forbidden',
  ERROR: '/error',
  SYSTEM_ADMIN: '/8dc52354/system-admin',

  CREDO_SME: {
    CLIENT_CONFIG: '/5fdb0520ef6/client-config',
  },
} as const;
