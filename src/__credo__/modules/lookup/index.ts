import type { StorageAdapter } from '../core/types.js';
import {
  buildKey,
  loadItems,
  loadEnvelope,
  saveItems,
  findWithVersionCheck,
  checkListVersion,
} from '../core/record-helpers.js';
import { generateId } from '@credo/kits/string';
import {
  validateCreateInput,
  checkDuplicateValue,
  buildItem,
  applyUpdate,
  filterItems,
  groupByCategory,
} from './logic.js';
import type { LookupItem, CreateLookupInput, UpdateLookupInput, LookupFilter } from './types.js';

export type { LookupItem, CreateLookupInput, UpdateLookupInput, LookupFilter } from './types.js';

export interface LookupModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  keyPrefix?: string;
}

export function createLookupModule(config: LookupModuleConfig) {
  const { storage, serviceCode, keyPrefix = 'lookups' } = config;

  function key(scope: string): string {
    return buildKey(keyPrefix, scope);
  }

  async function load(scope: string): Promise<LookupItem[]> {
    return loadItems<LookupItem>(storage, serviceCode, key(scope));
  }

  async function save(scope: string, items: LookupItem[]): Promise<void> {
    return saveItems(storage, serviceCode, key(scope), items);
  }

  return {
    async getAll(scope: string): Promise<LookupItem[]> {
      return load(scope);
    },

    async getAllIfChanged(
      scope: string,
      clientHash?: string,
    ): Promise<{ changed: boolean; lookups: LookupItem[]; hash?: string | undefined }> {
      const envelope = await loadEnvelope<LookupItem>(storage, serviceCode, key(scope));
      const currentHash = envelope.meta.hash;

      if (clientHash && currentHash && clientHash === currentHash) {
        return { changed: false, lookups: [], hash: currentHash };
      }

      return { changed: true, lookups: envelope.items, hash: currentHash };
    },

    async getById(scope: string, id: string): Promise<LookupItem | null> {
      const items = await load(scope);
      return items.find((i) => i.id === id) ?? null;
    },

    async getByCategory(scope: string, category: string): Promise<LookupItem[]> {
      const items = await load(scope);
      return filterItems(items, { category });
    },

    async getCategories(
      scope: string,
      categories: string[],
    ): Promise<Record<string, LookupItem[]>> {
      const items = await load(scope);
      const wanted = new Set(categories);
      const filtered = items.filter((i) => wanted.has(i.category));
      const grouped = groupByCategory(filtered);

      for (const category of categories) {
        grouped[category] ??= [];
      }
      return grouped;
    },

    async create(scope: string, input: CreateLookupInput): Promise<LookupItem> {
      validateCreateInput(input);
      const envelope = await loadEnvelope<LookupItem>(storage, serviceCode, key(scope));
      checkListVersion(envelope, input.expectedListHash, 'LookupItem');
      checkDuplicateValue(envelope.items, input.category.trim(), input.value.trim());

      const now = Date.now();
      const item = buildItem(generateId(), input, now);
      envelope.items.push(item);
      await save(scope, envelope.items);
      return item;
    },

    async createMany(
      scope: string,
      inputs: CreateLookupInput[],
    ): Promise<{
      created: LookupItem[];
      errors: Array<{ index: number; message: string }>;
    }> {
      const envelope = await loadEnvelope<LookupItem>(storage, serviceCode, key(scope));
      const created: LookupItem[] = [];
      const errors: Array<{ index: number; message: string }> = [];
      const now = Date.now();

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i]!;
        try {
          validateCreateInput(input);
          checkDuplicateValue(envelope.items, input.category.trim(), input.value.trim());
          const item = buildItem(generateId(), input, now);
          envelope.items.push(item);
          created.push(item);
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

    async update(scope: string, id: string, input: UpdateLookupInput): Promise<LookupItem> {
      const envelope = await loadEnvelope<LookupItem>(storage, serviceCode, key(scope));
      checkListVersion(envelope, input.expectedListHash, 'LookupItem');

      const { item: current, index } = findWithVersionCheck(
        envelope.items,
        id,
        input.version,
        'LookupItem',
      );

      const nextValue = input.value !== undefined ? input.value.trim() : current.value;
      const nextActive = input.isActive !== undefined ? input.isActive : current.isActive;
      if (nextActive && (input.value !== undefined || input.isActive === true)) {
        checkDuplicateValue(envelope.items, current.category, nextValue, id);
      }

      const now = Date.now();
      const updated = applyUpdate(current, input, now);
      envelope.items[index] = updated;
      await save(scope, envelope.items);
      return updated;
    },

    async remove(
      scope: string,
      id: string,
      expectedVersion: string | undefined,
      expectedListHash: string | undefined,
    ): Promise<LookupItem> {
      const envelope = await loadEnvelope<LookupItem>(storage, serviceCode, key(scope));
      checkListVersion(envelope, expectedListHash, 'LookupItem');

      const { item, index } = findWithVersionCheck(
        envelope.items,
        id,
        expectedVersion,
        'LookupItem',
      );
      const now = Date.now();
      const softDeleted = applyUpdate(item, { isActive: false }, now);
      envelope.items[index] = softDeleted;
      await save(scope, envelope.items);
      return softDeleted;
    },

    async findBy(scope: string, filter: LookupFilter): Promise<LookupItem[]> {
      const items = await load(scope);
      return filterItems(items, filter);
    },
  };
}
