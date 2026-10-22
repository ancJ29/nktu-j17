import { featureFlags } from '@/config';
import { useIsRoot } from './useIsRoot';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { getModulePermissions } from '@/utils/permission';
import { resolveFirstRunRedirect } from './firstRunRedirect';

export function useRootFirstRunRedirect(): string | null {
  const isRoot = useIsRoot();
  const initialized = useEmployeeStore((s) => s.initialized);
  const employeeCount = useEmployeeStore((s) => s.items.length);

  return resolveFirstRunRedirect({
    isRoot,
    initialized,
    employeeCount,
    employeesEnabled: featureFlags.employees.enabled,
    canCreateEmployee: getModulePermissions('employee').canCreate ?? false,
  });
}
