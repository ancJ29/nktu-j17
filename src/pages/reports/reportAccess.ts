import { useMemo } from 'react';
import { byClient } from '@/config/client';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { perms } from '@/utils/permission';

export const REPORTS_AVAILABLE = byClient({ nktu: true }, false);

const LEGACY_MANAGER_DEPARTMENT_CODE = 'manager';

const canViewReport = perms.report.canView();

export function useCanAccessReports(): boolean {
  const employees = useEmployeeStore((s) => s.items);
  const isRootUser = useAuthStore((s) => !!s.user?.isRoot);

  const currentEmployee = useMemo(
    () =>
      getCurrentEmployeeId() ? employees.find((e) => e.id === getCurrentEmployeeId()) : undefined,
    [employees],
  );

  const isLegacyManager = currentEmployee?.department === LEGACY_MANAGER_DEPARTMENT_CODE;
  return REPORTS_AVAILABLE && (canViewReport || isRootUser || isLegacyManager);
}
