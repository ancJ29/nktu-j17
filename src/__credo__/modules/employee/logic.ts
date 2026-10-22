import type {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeFilter,
} from './types.js';
import { ValidationError } from '../core/errors.js';
import { newVersion } from '@credo/kits/string';
import type { DateTimeInput } from '@credo/kits/types';

export function validateCreateInput(input: CreateEmployeeInput): void {
  const fields: Record<string, string> = {};

  if (typeof input?.name !== 'string' || !input.name.trim()) {
    fields['name'] = 'Name is required';
  }
  if (typeof input?.code !== 'string' || !input.code.trim()) {
    fields['code'] = 'Code is required';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Invalid employee input', fields);
  }
}

export function checkDuplicateCode(employees: Employee[], code: string, excludeId?: string): void {
  const normalized = code.trim().toLowerCase();
  const duplicate = employees.find(
    (e) => e.code.trim().toLowerCase() === normalized && e.id !== excludeId,
  );
  if (duplicate) {
    throw new ValidationError('Duplicate employee code', {
      code: `Employee code "${code.trim()}" already exists`,
    });
  }
}

export function buildEmployee(
  id: string,
  input: CreateEmployeeInput,
  now: DateTimeInput,
): Employee {
  return {
    id,
    name: input.name.trim(),
    code: input.code.trim(),
    email: input.email?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    position: input.position?.trim() ?? '',
    department: input.department?.trim() ?? '',
    isActive: true,
    extra: input.extra ?? {},
    createdAt: now,
    updatedAt: now,
    version: newVersion(),
  };
}

const SERVER_OWNED_EXTRA_KEYS = ['loginPassword'] as const;

function mergeExtra(current: unknown, incoming: unknown): unknown {
  if (typeof incoming !== 'object' || incoming === null || Array.isArray(incoming)) {
    return incoming;
  }
  const prev = (typeof current === 'object' && current !== null ? current : {}) as Record<
    string,
    unknown
  >;
  const next = { ...(incoming as Record<string, unknown>) };
  for (const key of SERVER_OWNED_EXTRA_KEYS) {
    if (!(key in next) && key in prev) {
      next[key] = prev[key];
    }
  }
  return next;
}

export function applyUpdate(
  employee: Employee,
  input: UpdateEmployeeInput,
  now: DateTimeInput,
): Employee {
  return {
    ...employee,
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.code !== undefined ? { code: input.code.trim() } : {}),
    ...(input.email !== undefined ? { email: input.email.trim() } : {}),
    ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
    ...(input.position !== undefined ? { position: input.position.trim() } : {}),
    ...(input.department !== undefined ? { department: input.department.trim() } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.extra !== undefined
      ? { extra: mergeExtra(employee.extra, input.extra) as Employee['extra'] }
      : {}),
    updatedAt: now,
    version: newVersion(),
  };
}

export function filterEmployees(employees: Employee[], filter: EmployeeFilter): Employee[] {
  let result = employees;

  if (filter.isActive !== undefined) {
    result = result.filter((e) => e.isActive === filter.isActive);
  }

  if (filter.search) {
    const term = filter.search.toLowerCase();
    result = result.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.code.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term) ||
        e.position.toLowerCase().includes(term) ||
        e.department.toLowerCase().includes(term),
    );
  }

  return result;
}
