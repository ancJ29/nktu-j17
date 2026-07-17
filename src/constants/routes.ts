

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
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
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
  LOOKUPS: {
    LIST: '/lookups',
  },
  LOOKUPS_V2: {
    LIST: '/lookups-v2',
  },
  CONFIGURATION: {
    APP_CONFIG: '/app-config',
    DEBUG: '/debug',
    FAKE_DATA: '/fake-data',
  },
  NOT_FOUND: '/404-not-found',
  FORBIDDEN: '/403-forbidden',
  ERROR: '/error',
  SYSTEM_ADMIN: '/8dc52354/system-admin',
} as const;
