import type { PermissionConfigSource, PermissionEmployeeSource } from './select.js';

export const FIXTURE: {
  config: PermissionConfigSource;
  employee: PermissionEmployeeSource;
} = {
  config: {
    permissions: {
      salesOrder: { canView: true, canCreate: true, canEdit: true },
      employee: { canView: true },
    },
    features: {
      employees: {
        departmentOptions: [
          { value: 'warehouse', permissions: { salesOrder: { canEdit: false } } },
          { value: 'sales', permissions: { employee: { canView: false } } },
        ],
      },
    },
  },
  employee: {
    department: 'warehouse',
    extra: { permissions: { salesOrder: { canDelete: true } } },
  },
};

export const EXPECTED_LAYERS = {
  client: {
    salesOrder: { canView: true, canCreate: true, canEdit: true },
    employee: { canView: true },
  },
  department: { salesOrder: { canEdit: false } },
  employee: { salesOrder: { canDelete: true } },
};
