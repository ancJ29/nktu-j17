import type { CredoAppConfig } from '../schema';
import { mergeFeature } from './featureMerge';
import { applyOverlay, readOverlay, type PermissionForm } from './permissionFields';

type Employees = NonNullable<NonNullable<CredoAppConfig['features']>['employees']>;
export type DepartmentOption = NonNullable<Employees['departmentOptions']>[number];
export type PositionOption = NonNullable<Employees['positionOptions']>[number];

export const readLanguageCodes = (config: CredoAppConfig | null): string[] => {
  const languages = (config?.['languages'] ?? []) as Array<{ code?: unknown }>;
  const codes = languages.map((l) => l.code).filter((c): c is string => typeof c === 'string');

  return codes.length > 0 ? codes : ['vi'];
};

export const readDepartmentOptions = (config: CredoAppConfig | null): DepartmentOption[] =>
  config?.features?.employees?.departmentOptions ?? [];

export const readPositionOptions = (config: CredoAppConfig | null): PositionOption[] =>
  config?.features?.employees?.positionOptions ?? [];

export const applyOptions = (
  storedFeatures: CredoAppConfig['features'],
  departmentOptions: DepartmentOption[],
  positionOptions: PositionOption[],
): CredoAppConfig['features'] =>
  mergeFeature(storedFeatures, 'employees', { departmentOptions, positionOptions });

export const readDepartmentPermissions = (option: DepartmentOption): PermissionForm =>
  readOverlay(option.permissions as Record<string, unknown> | undefined, false);

export const applyDepartmentPermissions = (
  option: DepartmentOption,
  form: PermissionForm,
): DepartmentOption => {
  const permissions = applyOverlay(
    option.permissions as Record<string, unknown> | undefined,
    form,
    false,
  );
  const { permissions: _dropped, ...rest } = option;
  return Object.keys(permissions).length > 0 ? { ...rest, permissions } : rest;
};

export const readAllDepartmentPermissions = (
  options: readonly DepartmentOption[],
): { form: PermissionForm; mixed: PermissionForm } => {
  const forms = options.map(readDepartmentPermissions);
  const blank = readOverlay(undefined, false);

  const form = {} as PermissionForm;
  const mixed = {} as PermissionForm;

  for (const moduleKey of Object.keys(blank) as Array<keyof PermissionForm>) {
    const flags = Object.keys(blank[moduleKey]);
    form[moduleKey] = {};
    mixed[moduleKey] = {};
    for (const flag of flags) {
      const states = forms.map((f) => f[moduleKey][flag] === true);
      const every = states.every(Boolean);
      form[moduleKey][flag] = every;

      mixed[moduleKey][flag] = states.length > 0 && !every && states.some(Boolean);
    }
  }

  return { form, mixed };
};

export const applyAllDepartmentPermissions = (
  options: readonly DepartmentOption[],
  before: PermissionForm,
  after: PermissionForm,
): DepartmentOption[] => {
  const changed: Array<{ moduleKey: keyof PermissionForm; flag: string; allowed: boolean }> = [];
  for (const moduleKey of Object.keys(after) as Array<keyof PermissionForm>) {
    for (const [flag, allowed] of Object.entries(after[moduleKey])) {
      if (before[moduleKey][flag] !== allowed) changed.push({ moduleKey, flag, allowed });
    }
  }
  if (changed.length === 0) return [...options];

  return options.map((option) => {
    const form = readDepartmentPermissions(option);
    const next = { ...form };
    for (const { moduleKey, flag, allowed } of changed) {
      next[moduleKey] = { ...next[moduleKey], [flag]: allowed };
    }
    return applyDepartmentPermissions(option, next);
  });
};
