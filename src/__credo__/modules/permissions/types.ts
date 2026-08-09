export type ModulePermissions = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  actions?: Record<string, boolean> | undefined;
  query?: Record<string, boolean> | undefined;
};

export type Permissions = Record<string, ModulePermissions>;

export type PartialModulePermissions = {
  canView?: boolean | undefined;
  canCreate?: boolean | undefined;
  canEdit?: boolean | undefined;
  canDelete?: boolean | undefined;
  actions?: Record<string, boolean> | undefined;
  query?: Record<string, boolean> | undefined;
};

export type PartialPermissions = Record<string, PartialModulePermissions>;

export const CRUD_KEYS = ['canView', 'canCreate', 'canEdit', 'canDelete'] as const;
