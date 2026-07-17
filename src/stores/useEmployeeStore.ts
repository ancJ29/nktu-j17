

import type { Employee, EmployeeExtra } from '@/types';
import { cMngtConnector } from '@credo/connectors/connector';
import { createEntityStore } from './createEntityStore';
import { ONE_MINUTE } from '@credo/kits/time';

type EmployeePatch = Omit<Parameters<typeof cMngtConnector.updateEmployee<EmployeeExtra>>[0], 'id'>;

export type EmployeeUpdateMeta = {
  
  ssoWarning?: string;
  
  loginPassword?: string;
};

export const useEmployeeStore = createEntityStore<
  Employee,
  EmployeePatch,
  Partial<Employee>,
  EmployeeUpdateMeta
>({
  cacheKey: 'emp',
  cacheTTL: 10 * ONE_MINUTE,
  fetchAll: (hash) =>
    cMngtConnector
      .getAllEmployees<EmployeeExtra>({ hash })
      .then((r) => (r.changed ? { items: r.employees, hash: r.hash } : null)),
  fetchOne: (id) => cMngtConnector.getEmployeeById<EmployeeExtra>({ id }).then((r) => r.employee),
  update: (id, patch) =>
    cMngtConnector.updateEmployee<EmployeeExtra>({ id, ...patch }).then((r) => ({
      item: r.employee,
      listHash: r.listHash,
      meta: { ssoWarning: r.ssoWarning, loginPassword: r.loginPassword },
    })),
});
