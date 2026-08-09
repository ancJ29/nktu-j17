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
  validateUpdateInput,
  checkDuplicatePair,
  buildEntry,
  applyUpdate,
  filterEntries,
} from './logic.js';
import type {
  ProductInventory,
  CreateProductInventoryInput,
  UpdateProductInventoryInput,
  ProductInventoryFilter,
} from './types.js';

export type {
  ProductInventory,
  CreateProductInventoryInput,
  UpdateProductInventoryInput,
  ProductInventoryFilter,
} from './types.js';

export interface ProductInventoryModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  keyPrefix?: string;
}

export function createProductInventoryModule(config: ProductInventoryModuleConfig) {
  const { storage, serviceCode, keyPrefix = 'product-inventory' } = config;

  function key(scope: string): string {
    return buildKey(keyPrefix, scope);
  }

  async function load(scope: string): Promise<ProductInventory[]> {
    return loadItems<ProductInventory>(storage, serviceCode, key(scope));
  }

  async function save(scope: string, items: ProductInventory[]): Promise<void> {
    return saveItems(storage, serviceCode, key(scope), items);
  }

  return {
    async getAll(scope: string): Promise<ProductInventory[]> {
      return load(scope);
    },

    async getAllIfChanged(
      scope: string,
      clientHash?: string,
    ): Promise<{
      changed: boolean;
      productInventory: ProductInventory[];
      hash?: string | undefined;
    }> {
      const envelope = await loadEnvelope<ProductInventory>(storage, serviceCode, key(scope));
      const currentHash = envelope.meta.hash;

      if (clientHash && currentHash && clientHash === currentHash) {
        return { changed: false, productInventory: [], hash: currentHash };
      }

      return { changed: true, productInventory: envelope.items, hash: currentHash };
    },

    async getById(scope: string, id: string): Promise<ProductInventory | null> {
      const items = await load(scope);
      return items.find((e) => e.id === id) ?? null;
    },

    async getByItem(scope: string, itemCode: string): Promise<ProductInventory[]> {
      const items = await load(scope);
      return items.filter((e) => e.itemCode === itemCode);
    },

    async getByLocation(scope: string, locationCode: string): Promise<ProductInventory[]> {
      const items = await load(scope);
      return items.filter((e) => e.locationCode === locationCode);
    },

    async create(scope: string, input: CreateProductInventoryInput): Promise<ProductInventory> {
      validateCreateInput(input);
      const envelope = await loadEnvelope<ProductInventory>(storage, serviceCode, key(scope));
      checkListVersion(envelope, input.expectedListHash, 'ProductInventory');
      checkDuplicatePair(envelope.items, input.itemCode.trim(), input.locationCode.trim());

      const now = Date.now();
      const entry = buildEntry(generateId(), input, now);
      envelope.items.push(entry);
      await save(scope, envelope.items);
      return entry;
    },

    async createMany(
      scope: string,
      inputs: CreateProductInventoryInput[],
    ): Promise<{
      created: ProductInventory[];
      updated: ProductInventory[];
      errors: Array<{ index: number; message: string }>;
    }> {
      const envelope = await loadEnvelope<ProductInventory>(storage, serviceCode, key(scope));
      const created: ProductInventory[] = [];
      const updated: ProductInventory[] = [];
      const errors: Array<{ index: number; message: string }> = [];
      const now = Date.now();

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i]!;
        try {
          validateCreateInput(input);
          const itemCode = input.itemCode.trim();
          const locationCode = input.locationCode.trim();
          const existingIdx = envelope.items.findIndex(
            (e) => e.itemCode === itemCode && e.locationCode === locationCode,
          );

          if (existingIdx >= 0) {
            const next = applyUpdate(envelope.items[existingIdx]!, input, now);
            envelope.items[existingIdx] = next;
            updated.push(next);
          } else {
            const entry = buildEntry(generateId(), input, now);
            envelope.items.push(entry);
            created.push(entry);
          }
        } catch (err) {
          errors.push({
            index: i,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      if (created.length > 0 || updated.length > 0) {
        await save(scope, envelope.items);
      }

      return { created, updated, errors };
    },

    async update(
      scope: string,
      id: string,
      input: UpdateProductInventoryInput,
    ): Promise<ProductInventory> {
      validateUpdateInput(input);
      const envelope = await loadEnvelope<ProductInventory>(storage, serviceCode, key(scope));
      checkListVersion(envelope, input.expectedListHash, 'ProductInventory');

      const { item, index } = findWithVersionCheck(
        envelope.items,
        id,
        input.version,
        'ProductInventory',
      );

      const now = Date.now();
      const updated = applyUpdate(item, input, now);
      envelope.items[index] = updated;
      await save(scope, envelope.items);
      return updated;
    },

    async remove(
      scope: string,
      id: string,
      expectedVersion: string | undefined,
      expectedListHash: string | undefined,
    ): Promise<void> {
      const envelope = await loadEnvelope<ProductInventory>(storage, serviceCode, key(scope));
      checkListVersion(envelope, expectedListHash, 'ProductInventory');

      const { index } = findWithVersionCheck(
        envelope.items,
        id,
        expectedVersion,
        'ProductInventory',
      );
      envelope.items.splice(index, 1);
      await save(scope, envelope.items);
    },

    async findBy(scope: string, filter: ProductInventoryFilter): Promise<ProductInventory[]> {
      const items = await load(scope);
      return filterEntries(items, filter);
    },
  };
}
