import { defaultAppConfig } from '@/config/schema';
import type { CredoAppConfig } from '../schema';
import { mergeFeature } from './featureMerge';

type EmployeeFlags = NonNullable<NonNullable<CredoAppConfig['features']>['employees']>;

type FlagKey =
  | 'enabled'
  | 'selfManage'
  | 'v2'
  | 'allowLogin'
  | 'email'
  | 'position'
  | 'department'
  | 'bulkImport'
  | 'avatar'
  | 'startDate'
  | 'address'
  | 'dateOfBirth'
  | 'driverProfile';

const _flagsExistOnTheSchema: Partial<Record<FlagKey, boolean>> = {} as Pick<
  EmployeeFlags,
  FlagKey
>;
void _flagsExistOnTheSchema;

export const EMPLOYEE_FLAGS = [
  { key: 'enabled', label: 'Employees module', hint: 'Master toggle for the feature.' },
  {
    key: 'selfManage',
    label: 'Client self-managed org',
    hint: 'Let the client edit its own departments, positions and department overlays in-app instead of only here.',
  },
  {
    key: 'v2',
    label: 'Employees on credo-sme (v2)',
    hint: 'Seeded ON for newly provisioned clients. The v2 register opens EMPTY — turning this on for a client that already has staff hides every one of them until their rows are migrated. Takes up to a minute to apply (the permission answer is cached per user).',
  },
  { key: 'allowLogin', label: 'Allow login', hint: 'Employees can sign in to the app.' },
  { key: 'email', label: 'Email', hint: 'Show the email column and field.' },
  { key: 'position', label: 'Position', hint: 'Show the position column and field.' },
  {
    key: 'department',
    label: 'Department',
    hint: 'Show the department column, field and list filter.',
  },
  {
    key: 'bulkImport',
    label: 'Bulk import',
    hint: 'Allow importing employees from a spreadsheet.',
  },
  {
    key: 'avatar',
    label: 'Profile image',
    hint: 'Allow an avatar upload on the detail page (PC only).',
  },
  { key: 'startDate', label: 'Start date', hint: 'Show the working start date field.' },
  { key: 'address', label: 'Address', hint: 'Show the address field.' },
  { key: 'dateOfBirth', label: 'Date of birth', hint: 'Show the date of birth field.' },
  {
    key: 'driverProfile',
    label: 'Driver management',
    hint: 'Adds the driver tab (licence, linked truck, training) for the selected driver departments.',
  },
] as const satisfies readonly { key: FlagKey; label: string; hint: string }[];

export type EmployeeForm = {
  flags: Record<FlagKey, boolean>;
  codePrefix: string;
  codePadLength: number;
};

const DEFAULT_CODE = { codePrefix: 'EMP-', codePadLength: 4 };

export const readEmployees = (config: CredoAppConfig | null): EmployeeForm => {
  const employees = config?.features?.employees;
  return {
    flags: Object.fromEntries(
      EMPLOYEE_FLAGS.map((f) => [f.key, employees?.[f.key] === true]),
    ) as Record<FlagKey, boolean>,
    codePrefix: employees?.codePrefix ?? DEFAULT_CODE.codePrefix,
    codePadLength: employees?.codePadLength ?? DEFAULT_CODE.codePadLength,
  };
};

export const employeeCodePreview = ({ codePrefix, codePadLength }: EmployeeForm): string =>
  `${codePrefix}${(1).toString().padStart(Math.max(0, codePadLength), '0')}`;

const OMITTED_WHEN_FALSE: readonly FlagKey[] = EMPLOYEE_FLAGS.filter(
  (f) => defaultAppConfig.features.employees[f.key] === false,
).map((f) => f.key);

export const applyEmployees = (
  storedFeatures: CredoAppConfig['features'],
  form: EmployeeForm,
): CredoAppConfig['features'] => {
  const features = mergeFeature(storedFeatures, 'employees', {
    ...form.flags,
    codePrefix: form.codePrefix,
    codePadLength: form.codePadLength,
  });
  const employees = { ...(features?.employees ?? {}) } as Record<string, unknown>;
  for (const key of OMITTED_WHEN_FALSE) {
    if (form.flags[key] === false) delete employees[key];
  }
  return { ...features, employees } as CredoAppConfig['features'];
};
