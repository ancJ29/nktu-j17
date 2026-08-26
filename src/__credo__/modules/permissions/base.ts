import type { Permissions } from './types.js';

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

      canEditItemWarehouseFields: false,
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
      canExport: false,
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
    query: {
      canViewAll: false,
      canViewSelf: false,
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

  transportRoute: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },

  costNorm: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },

  report: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
};
