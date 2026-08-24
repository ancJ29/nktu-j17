import { useMyEmployee } from '@/hooks/useMyEmployee';
import { byClient } from '@/config/client';
import { useIsRoot } from '@/hooks/useIsRoot';
import { perms } from '@/utils/permission';

export const REPORTS_AVAILABLE = byClient({ nktu: true }, false);

const LEGACY_MANAGER_DEPARTMENT_CODE = 'manager';

const canViewReport = perms.report.canView();

export function useCanAccessReports(): boolean {
  const isRootUser = useIsRoot();

  const currentEmployee = useMyEmployee();

  const isLegacyManager = currentEmployee?.department === LEGACY_MANAGER_DEPARTMENT_CODE;
  return REPORTS_AVAILABLE && (canViewReport || isRootUser || isLegacyManager);
}
