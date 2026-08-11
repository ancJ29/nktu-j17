import { useMemo } from 'react';
import { byClient } from '@/config/client';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';

const MANAGER_DEPARTMENT_CODE = 'manager';

export const REPORTS_AVAILABLE = byClient({ nktu: true }, false);

export function useCanAccessReports(): boolean {
  const employees = useEmployeeStore((s) => s.items);
  const isRootUser = useAuthStore((s) => !!s.user?.isRoot);

  const currentEmployee = useMemo(
    () =>
      getCurrentEmployeeId() ? employees.find((e) => e.id === getCurrentEmployeeId()) : undefined,
    [employees],
  );

  return (
    REPORTS_AVAILABLE && (currentEmployee?.department === MANAGER_DEPARTMENT_CODE || isRootUser)
  );
}
