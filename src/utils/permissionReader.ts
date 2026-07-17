

import { cacheGet, cacheSet, cacheClear } from '@/utils/appCache';
import { sharedUserStorage, SharedStorageKey } from '@/utils/storage';
import {
  BASE_PERMISSIONS,
  type ModulePermissions,
  type PartialPermissions,
  type Permissions,
} from '@/types/permissions';

export function getEffectivePermissions(): Permissions {
  return (cacheGet('prm') as Permissions | undefined) ?? BASE_PERMISSIONS;
}

export function getModulePermissions(module: string): ModulePermissions {
  const perms = getEffectivePermissions();
  return perms[module] ?? { canView: false, canCreate: false, canEdit: false, canDelete: false };
}

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

type BootstrapDeptOption = { value: string; permissions?: PartialPermissions };

export function bootstrapPermissionCache(params: {
  clientPerms?: PartialPermissions | null;
  departmentOptions?: BootstrapDeptOption[];
  cfgVersion?: string;
}): void {
  const cachedPrv = cacheGet('prv') as { cfg?: string; emp?: string } | undefined;
  const cfgChanged = cachedPrv != null && cachedPrv.cfg !== params.cfgVersion;

  if (cachedPrv && !cfgChanged) return;

  if (cfgChanged) cacheClear('prv');

  const deptValue = sharedUserStorage.get<string>(SharedStorageKey.DEPARTMENT);
  const deptOption = deptValue
    ? params.departmentOptions?.find((d) => d.value === deptValue)
    : undefined;

  const cachedEmo = cacheGet('emo') as { o?: PartialPermissions; v?: string } | undefined;

  const bootstrapPerms = resolvePermissions({
    base: BASE_PERMISSIONS,
    client: params.clientPerms,
    department: deptOption?.permissions,
    employee: cachedEmo?.o,
  });
  cacheSet('prm', bootstrapPerms);

  
  
  
  
  if (cachedEmo?.o && cachedEmo.v && params.cfgVersion) {
    cacheSet('prv', { cfg: params.cfgVersion, emp: cachedEmo.v });
  }
}
