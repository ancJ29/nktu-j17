import { featureFlags } from '@/config';
import type { Employee, EmployeeExtra } from '@/types';
import { cMngtConnector, credoSmeConnector } from '@credo/connectors/connector';
import { createEntityStore, toEntityConflictError } from './createEntityStore';
import { ONE_MINUTE } from '@credo/kits/time';

type EmployeePatch = Omit<Parameters<typeof cMngtConnector.updateEmployee<EmployeeExtra>>[0], 'id'>;

export type EmployeeUpdateMeta = {
  ssoWarning?: string;

  loginPassword?: string;
};

const usesV2 = featureFlags.employees.v2;

export const employeesOnOwnRegister = usesV2;

const CACHE_KEY = usesV2 ? 'empv2.8c41d7' : 'emp';

const v1 = {
  fetchAll: (hash?: string) =>
    cMngtConnector
      .getAllEmployees<EmployeeExtra>({ hash })
      .then((r) => (r.changed ? { items: r.employees, hash: r.hash } : null)),
  fetchOne: (id: string) =>
    cMngtConnector.getEmployeeById<EmployeeExtra>({ id }).then((r) => r.employee),
  update: (id: string, patch: EmployeePatch) =>
    cMngtConnector.updateEmployee<EmployeeExtra>({ id, ...patch }).then((r) => ({
      item: r.employee,
      listHash: r.listHash,
      meta: { ssoWarning: r.ssoWarning, loginPassword: r.loginPassword },
    })),
};

const v2 = {
  fetchAll: (hash?: string) =>
    credoSmeConnector
      .getAllEmployees(hash !== undefined ? { hash } : undefined)
      .then((r) => (r.changed ? { items: (r.items ?? []) as Employee[], hash: r.hash } : null)),
  fetchOne: (id: string) =>
    credoSmeConnector.getEmployeeById({ id }).then((r) => r.item as Employee),
  update: (id: string, body: EmployeePatch) => {
    const { version, expectedListHash, ...patch } = body as EmployeePatch & {
      version: string;
      expectedListHash?: string;
    };
    return credoSmeConnector
      .updateEmployee({
        id,
        version,
        patch: patch as Record<string, unknown>,
        ...(expectedListHash !== undefined && { expectedListHash }),
      })
      .then((r) => ({
        item: r.item as Employee,
        ...(r.listHash !== undefined && { listHash: r.listHash }),
        meta: { ssoWarning: r.ssoWarning, loginPassword: r.loginPassword },
      }));
  },

  delete: (id: string, version: string, expectedListHash?: string) =>
    credoSmeConnector
      .archiveEmployee({
        id,
        version,
        ...(expectedListHash !== undefined && { expectedListHash }),
      })
      .then((r) => ({ listHash: r.listHash })),
};

export const useEmployeeStore = createEntityStore<
  Employee,
  EmployeePatch,
  Partial<Employee>,
  EmployeeUpdateMeta
>({
  cacheKey: CACHE_KEY,
  cacheTTL: 10 * ONE_MINUTE,
  ...(usesV2 ? v2 : v1),
});

export type EmployeeWriteResult = { employee: Employee; ssoWarning?: string };

export const createEmployee = async (
  input: Partial<Employee> & { extra: EmployeeExtra },
): Promise<EmployeeWriteResult> => {
  const expectedListHash = useEmployeeStore.getState().hash ?? undefined;

  if (!usesV2) {
    const res = await cMngtConnector.createEmployee<EmployeeExtra>({
      ...(input as Parameters<typeof cMngtConnector.createEmployee<EmployeeExtra>>[0]),
      ...(expectedListHash && { expectedListHash }),
    });
    return { employee: res.employee, ...(res.ssoWarning && { ssoWarning: res.ssoWarning }) };
  }

  const res = await credoSmeConnector.createEmployee({
    item: input as Record<string, unknown>,
    ...(expectedListHash !== undefined && { expectedListHash }),
  });
  return { employee: res.item as Employee, ...(res.ssoWarning && { ssoWarning: res.ssoWarning }) };
};

export const archiveEmployee = async (
  employee: Employee,
): Promise<{ item: Employee; meta?: EmployeeUpdateMeta }> => {
  if (usesV2) {
    const store = useEmployeeStore.getState();
    const expectedListHash = store.hash ?? undefined;
    try {
      const res = await credoSmeConnector.archiveEmployee({
        id: employee.id,
        version: employee.version,
        ...(expectedListHash !== undefined && { expectedListHash }),
      });
      const item = res.item as Employee;

      store.upsertItem(item);
      return {
        item,
        ...(res.ssoWarning !== undefined && { meta: { ssoWarning: res.ssoWarning } }),
      };
    } catch (err) {
      store.invalidate();
      throw toEntityConflictError<Employee>(err);
    }
  }

  return useEmployeeStore.getState().updateSafelyWithMeta({
    id: employee.id,
    version: employee.version,
    patch: {
      isActive: false,
      extra: { ...employee.extra, isDeleted: true },
    } as Omit<EmployeePatch, 'version'>,
  });
};

export const updateEmployeeLoginPassword = async (args: {
  id: string;
  password: string;

  version: string;
}): Promise<{ ssoWarning?: string }> => {
  if (!usesV2) {
    const res = await cMngtConnector.updateEmployeeLoginPassword({
      id: args.id,
      password: args.password,
    });
    return { ...(res.ssoWarning && { ssoWarning: res.ssoWarning }) };
  }

  const expectedListHash = useEmployeeStore.getState().hash ?? undefined;
  const res = await credoSmeConnector.updateEmployeeLoginPassword({
    id: args.id,
    version: args.version,
    password: args.password,
    ...(expectedListHash !== undefined && { expectedListHash }),
  });

  useEmployeeStore.getState().upsertItem(res.item as Employee);
  return {};
};

export const fetchEmployeeById = async (id: string): Promise<Employee> =>
  usesV2
    ? ((await credoSmeConnector.getEmployeeById({ id })).item as Employee)
    : (await cMngtConnector.getEmployeeById<EmployeeExtra>({ id })).employee;

export const generateEmployeeLoginToken = async (args: {
  id: string;
  expiration?: number;
}): Promise<{ token?: string }> =>
  usesV2
    ? credoSmeConnector.generateEmployeeLoginToken(args)
    : cMngtConnector.generateEmployeeLoginToken(args);

export const supportsBulkImport = !usesV2;

export const importBatchEmployees = (items: ReadonlyArray<Record<string, unknown>>) =>
  cMngtConnector.importBatchEmployees<EmployeeExtra>({
    items: items as Parameters<
      typeof cMngtConnector.importBatchEmployees<EmployeeExtra>
    >[0]['items'],
  });
