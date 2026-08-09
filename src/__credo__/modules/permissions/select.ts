import type { PartialPermissions } from './types.js';

export type PermissionConfigSource = {
  permissions?: PartialPermissions | null;
  features?: {
    employees?: {
      departmentOptions?: Array<{ value: string; permissions?: PartialPermissions }> | null;
    } | null;
  } | null;
};

export type PermissionEmployeeSource = {
  department?: string | undefined;
  extra?: { permissions?: PartialPermissions } | null | undefined;
};

export type PermissionLayers = {
  client: PartialPermissions | null;
  department: PartialPermissions | null;
  employee: PartialPermissions | null;
};

export function selectPermissionLayers(
  config: PermissionConfigSource | null | undefined,
  employee: PermissionEmployeeSource | null | undefined,
): PermissionLayers {
  const client = config?.permissions ?? null;

  const department = employee?.department
    ? ((config?.features?.employees?.departmentOptions ?? []).find(
        (option) => option.value === employee.department,
      )?.permissions ?? null)
    : null;

  return {
    client,
    department,
    employee: employee?.extra?.permissions ?? null,
  };
}
