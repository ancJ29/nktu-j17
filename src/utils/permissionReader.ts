import { resolvePermissions } from '@credo/modules/permissions';

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

export { deepMergePermissions, resolvePermissions } from '@credo/modules/permissions';

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
