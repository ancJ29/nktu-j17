import { ROUTES } from '@/constants/routes';

export type FirstRunRedirectInput = {
  isRoot: boolean;

  initialized: boolean;

  employeeCount: number;

  employeesEnabled: boolean;

  canCreateEmployee: boolean;
};

export function resolveFirstRunRedirect(input: FirstRunRedirectInput): string | null {
  const { isRoot, initialized, employeeCount, employeesEnabled, canCreateEmployee } = input;
  if (!isRoot || !initialized) return null;
  if (employeeCount > 0) return null;
  if (!employeesEnabled || !canCreateEmployee) return null;
  return ROUTES.EMPLOYEES.NEW;
}
