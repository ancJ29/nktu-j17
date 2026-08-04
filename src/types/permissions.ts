export type ModulePermissions = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  actions?: Record<string, boolean>;
  query?: Record<string, boolean>;
};

export type Permissions = Record<string, ModulePermissions>;

export type PartialModulePermissions = {
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  actions?: Record<string, boolean>;
  query?: Record<string, boolean>;
};

export type PartialPermissions = Record<string, PartialModulePermissions>;

export const BASE_PERMISSIONS: Permissions = {
  employee: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    actions: {
      canSetPassword: false,
      canIssueMagicLink: false,
      canToggleStatus: false,
      canViewActivityLog: false,
    },
  },
  product: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    actions: {
      canViewPrice: false,
      canManagePrice: false,
    },
  },
  material: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    actions: {
      canManageInventory: false,
    },
  },
  customer: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  vendor: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  salesOrder: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    actions: {
      canTransitionStatus: false,
      canCancel: false,
      canManualRelease: false,
      canExport: false,

      canViewPrice: false,

      canViewSetComponentInventory: false,

      canTakePhoto: false,

      canEditDeliveryPackageSize: false,
    },
    query: {
      canViewAll: false,
      canViewSelf: false,
    },
  },
  deliveryRequest: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    actions: {
      canManagePhotos: false,
      canReorder: false,
    },
    query: {
      canViewAll: false,
      canViewSelf: false,
    },
  },
  goodsReceipt: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    actions: {
      canConfirmReceived: false,
      canCancel: false,
    },
  },
  warehouseReceipt: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  warehouseDeliveryNote: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  transportOrder: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    actions: {
      canTransitionStatus: false,
      canCancel: false,
      canViewPrice: false,
    },
  },
  location: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  productInventory: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    actions: {
      canBulkImport: false,
    },
  },
  materialInventory: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  permissionManagement: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    actions: {
      canModify: false,
    },
  },
  lookup: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  lookupV2: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  truck: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    actions: {
      canExport: false,
    },
  },

  oilTank: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  greenhouse: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  crop: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  cropDiaryTemplate: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  cropDiary: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
};

export const DEFAULT_PERMISSIONS: Permissions = {
  employee: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    actions: {
      canSetPassword: false,
      canIssueMagicLink: true,
      canToggleStatus: true,
      canViewActivityLog: false,
    },
  },
  product: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    actions: {
      canViewPrice: false,
      canManagePrice: false,
    },
  },
  material: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    actions: {
      canManageInventory: false,
    },
  },
  customer: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
  },
  vendor: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
  },
  salesOrder: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    actions: {
      canTransitionStatus: true,
      canCancel: true,
      canManualRelease: true,
      canExport: true,

      canViewPrice: true,
      canViewSetComponentInventory: true,

      canTakePhoto: true,

      canEditDeliveryPackageSize: false,
    },
    query: {
      canViewAll: true,
      canViewSelf: true,
    },
  },
  deliveryRequest: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    actions: {
      canManagePhotos: true,
      canReorder: false,
    },
    query: {
      canViewAll: true,
      canViewSelf: true,
    },
  },
  goodsReceipt: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    actions: {
      canConfirmReceived: true,
      canCancel: true,
    },
  },
  warehouseReceipt: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  warehouseDeliveryNote: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  location: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
  },
  productInventory: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    actions: {
      canBulkImport: true,
    },
  },
  materialInventory: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
  },
  permissionManagement: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    actions: {
      canModify: true,
    },
  },
  lookup: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
  },
  lookupV2: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
  },

  truck: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  oilTank: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  transportOrder: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    actions: {
      canTransitionStatus: false,
      canCancel: false,
      canViewPrice: false,
    },
  },
  greenhouse: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  crop: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  cropDiaryTemplate: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  cropDiary: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
};

export const CRUD_KEYS = ['canView', 'canCreate', 'canEdit', 'canDelete'] as const;
