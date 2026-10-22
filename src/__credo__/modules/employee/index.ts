import type { StorageAdapter } from '../core/types.js';
import {
  buildKey,
  loadItems,
  loadEnvelope,
  saveItems,
  findWithVersionCheck,
  checkListVersion,
} from '../core/record-helpers.js';
import { generateId, newVersion } from '@credo/kits/string';
import { ValidationError } from '../core/errors.js';
import {
  validateCreateInput,
  checkDuplicateCode,
  buildEmployee,
  applyUpdate,
  filterEmployees,
} from './logic.js';
import type {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeFilter,
} from './types.js';

export type {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeFilter,
} from './types.js';

export interface EmployeeModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  keyPrefix?: string;
}

export function createEmployeeModule(config: EmployeeModuleConfig) {
  const { storage, serviceCode, keyPrefix = 'employees' } = config;

  function key(scope: string): string {
    return buildKey(keyPrefix, scope);
  }

  async function load(scope: string): Promise<Employee[]> {
    return loadItems<Employee>(storage, serviceCode, key(scope));
  }

  async function save(scope: string, items: Employee[]): Promise<void> {
    return saveItems(storage, serviceCode, key(scope), items);
  }

  return {
    async getAll(scope: string): Promise<Employee[]> {
      return load(scope);
    },

    async getAllIfChanged(
      scope: string,
      clientHash?: string,
    ): Promise<{ changed: boolean; employees: Employee[]; hash?: string | undefined }> {
      const envelope = await loadEnvelope<Employee>(storage, serviceCode, key(scope));
      const currentHash = envelope.meta.hash;

      if (clientHash && currentHash && clientHash === currentHash) {
        return { changed: false, employees: [], hash: currentHash };
      }

      return { changed: true, employees: envelope.items, hash: currentHash };
    },

    async getById(scope: string, id: string): Promise<Employee | null> {
      const items = await load(scope);
      return items.find((e) => e.id === id) ?? null;
    },

    async create(scope: string, input: CreateEmployeeInput): Promise<Employee> {
      validateCreateInput(input);
      const envelope = await loadEnvelope<Employee>(storage, serviceCode, key(scope));
      checkListVersion(envelope, input.expectedListHash, 'Employee');
      checkDuplicateCode(envelope.items, input.code);

      const now = Date.now();
      const employee = buildEmployee(generateId(), input, now);
      envelope.items.push(employee);
      await save(scope, envelope.items);
      return employee;
    },

    async createMany(
      scope: string,
      inputs: CreateEmployeeInput[],
    ): Promise<{
      created: Employee[];
      errors: Array<{ index: number; message: string }>;
    }> {
      if (!Array.isArray(inputs)) {
        throw new ValidationError('Invalid employee batch', {
          items: 'Must be an array of employees',
        });
      }

      const envelope = await loadEnvelope<Employee>(storage, serviceCode, key(scope));
      const created: Employee[] = [];
      const errors: Array<{ index: number; message: string }> = [];
      const now = Date.now();

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i]!;
        try {
          validateCreateInput(input);
          checkDuplicateCode(envelope.items, input.code);
          const employee = buildEmployee(generateId(), input, now);
          envelope.items.push(employee);
          created.push(employee);
        } catch (err) {
          errors.push({
            index: i,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      if (created.length > 0) {
        await save(scope, envelope.items);
      }

      return { created, errors };
    },

    async applyLoginCredentials(
      scope: string,
      patches: Array<{ id: string; email: string; loginPassword: string; userUuid?: string }>,
    ): Promise<{
      patched: Employee[];
      failed: Array<{ id: string; message: string }>;
    }> {
      if (patches.length === 0) {
        return { patched: [], failed: [] };
      }

      const envelope = await loadEnvelope<Employee>(storage, serviceCode, key(scope));
      const byId = new Map(envelope.items.map((e, idx) => [e.id, idx]));
      const patched: Employee[] = [];
      const failed: Array<{ id: string; message: string }> = [];
      const now = Date.now();

      for (const p of patches) {
        const idx = byId.get(p.id);
        if (idx === undefined) {
          failed.push({ id: p.id, message: 'Employee not found' });
          continue;
        }
        const current = envelope.items[idx]!;
        const next: Employee = {
          ...current,
          email: p.email.trim(),

          ...(p.userUuid ? { userUuid: p.userUuid } : {}),
          extra: {
            ...((current.extra as Record<string, unknown> | undefined) ?? {}),
            loginPassword: p.loginPassword,
          },
          updatedAt: now,
          version: newVersion(),
        };
        envelope.items[idx] = next;
        patched.push(next);
      }

      if (patched.length > 0) {
        await save(scope, envelope.items);
      }

      return { patched, failed };
    },

    async update(scope: string, id: string, input: UpdateEmployeeInput): Promise<Employee> {
      const envelope = await loadEnvelope<Employee>(storage, serviceCode, key(scope));
      checkListVersion(envelope, input.expectedListHash, 'Employee');

      const { item, index } = findWithVersionCheck(envelope.items, id, input.version, 'Employee');

      if (input.code !== undefined) {
        checkDuplicateCode(envelope.items, input.code, id);
      }

      const now = Date.now();
      const updated = applyUpdate(item, input, now);
      envelope.items[index] = updated;
      await save(scope, envelope.items);
      return updated;
    },

    async findBy(scope: string, filter: EmployeeFilter): Promise<Employee[]> {
      const items = await load(scope);
      return filterEmployees(items, filter);
    },
  };
}
