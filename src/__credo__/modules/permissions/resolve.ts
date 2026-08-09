import type { PartialPermissions, Permissions } from './types.js';

export function deepMergePermissions(
  base: Permissions,
  overlay: PartialPermissions | undefined | null,
): Permissions {
  if (!overlay) return base;

  const result: Permissions = {};

  for (const [mod, basePerms] of Object.entries(base)) {
    const over = overlay[mod];
    if (!over) {
      result[mod] = {
        ...basePerms,
        actions: { ...basePerms.actions },
        query: { ...basePerms.query },
      };
      continue;
    }

    result[mod] = {
      canView: over.canView ?? basePerms.canView,
      canCreate: over.canCreate ?? basePerms.canCreate,
      canEdit: over.canEdit ?? basePerms.canEdit,
      canDelete: over.canDelete ?? basePerms.canDelete,
      actions:
        basePerms.actions || over.actions ? { ...basePerms.actions, ...over.actions } : undefined,
      query: basePerms.query || over.query ? { ...basePerms.query, ...over.query } : undefined,
    };
  }

  for (const [mod, overPerms] of Object.entries(overlay)) {
    if (!result[mod] && overPerms) {
      result[mod] = {
        canView: overPerms.canView ?? false,
        canCreate: overPerms.canCreate ?? false,
        canEdit: overPerms.canEdit ?? false,
        canDelete: overPerms.canDelete ?? false,
        actions: overPerms.actions,
        query: overPerms.query,
      };
    }
  }

  return result;
}

export function resolvePermissions(params: {
  base: Permissions;
  client?: PartialPermissions | null;
  department?: PartialPermissions | null;
  employee?: PartialPermissions | null;
}): Permissions {
  const { base, client, department, employee } = params;
  const afterClient = deepMergePermissions(base, client);
  const afterDept = deepMergePermissions(afterClient, department);
  return deepMergePermissions(afterDept, employee);
}
