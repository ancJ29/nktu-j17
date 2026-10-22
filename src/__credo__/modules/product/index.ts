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
  checkDuplicateCode,
  checkDuplicateSku,
  getProductSku,
  getInputSku,
  buildProduct,
  applyUpdate,
  filterProducts,
} from './logic.js';
import type { Product, CreateProductInput, UpdateProductInput, ProductFilter } from './types.js';

export type { Product, CreateProductInput, UpdateProductInput, ProductFilter } from './types.js';

export interface ProductModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  keyPrefix?: string;
}

export function createProductModule(config: ProductModuleConfig) {
  const { storage, serviceCode, keyPrefix = 'products' } = config;

  function key(scope: string): string {
    return buildKey(keyPrefix, scope);
  }

  async function load(scope: string): Promise<Product[]> {
    return loadItems<Product>(storage, serviceCode, key(scope));
  }

  async function save(scope: string, items: Product[]): Promise<void> {
    return saveItems(storage, serviceCode, key(scope), items);
  }

  return {
    async getAll(scope: string): Promise<Product[]> {
      return load(scope);
    },

    async getAllIfChanged(
      scope: string,
      clientHash?: string,
    ): Promise<{ changed: boolean; products: Product[]; hash?: string | undefined }> {
      const envelope = await loadEnvelope<Product>(storage, serviceCode, key(scope));
      const currentHash = envelope.meta.hash;

      if (clientHash && currentHash && clientHash === currentHash) {
        return { changed: false, products: [], hash: currentHash };
      }

      return { changed: true, products: envelope.items, hash: currentHash };
    },

    async getById(scope: string, id: string): Promise<Product | null> {
      const items = await load(scope);
      return items.find((p) => p.id === id) ?? null;
    },

    async create(scope: string, input: CreateProductInput): Promise<Product> {
      validateCreateInput(input);
      const envelope = await loadEnvelope<Product>(storage, serviceCode, key(scope));
      checkListVersion(envelope, input.expectedListHash, 'Product');
      checkDuplicateCode(envelope.items, input.code);
      checkDuplicateSku(envelope.items, getInputSku(input));

      const now = Date.now();
      const product = buildProduct(generateId(), input, now);
      envelope.items.push(product);
      await save(scope, envelope.items);
      return product;
    },

    async createMany(
      scope: string,
      inputs: CreateProductInput[],
    ): Promise<{
      created: Product[];
      skipped: Array<{ index: number; code: string; reason: 'duplicate-code' | 'duplicate-sku' }>;
      errors: Array<{ index: number; message: string }>;
    }> {
      const envelope = await loadEnvelope<Product>(storage, serviceCode, key(scope));
      const created: Product[] = [];
      const skipped: Array<{
        index: number;
        code: string;
        reason: 'duplicate-code' | 'duplicate-sku';
      }> = [];
      const errors: Array<{ index: number; message: string }> = [];
      const now = Date.now();

      const seenCodes = new Set(envelope.items.map((p) => p.code));
      const seenSkus = new Set(envelope.items.map((p) => getProductSku(p)).filter((s) => s !== ''));

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i]!;
        try {
          validateCreateInput(input);
          const code = input.code.trim();
          const sku = getInputSku(input);

          if (seenCodes.has(code)) {
            skipped.push({ index: i, code, reason: 'duplicate-code' });
            continue;
          }
          if (sku && seenSkus.has(sku)) {
            skipped.push({ index: i, code, reason: 'duplicate-sku' });
            continue;
          }

          const product = buildProduct(generateId(), input, now);
          envelope.items.push(product);
          created.push(product);
          seenCodes.add(code);
          if (sku) seenSkus.add(sku);
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

      return { created, skipped, errors };
    },

    async update(scope: string, id: string, input: UpdateProductInput): Promise<Product> {
      const envelope = await loadEnvelope<Product>(storage, serviceCode, key(scope));
      checkListVersion(envelope, input.expectedListHash, 'Product');

      const { item, index } = findWithVersionCheck(envelope.items, id, input.version, 'Product');

      if (input.code !== undefined) {
        checkDuplicateCode(envelope.items, input.code, id);
      }
      if (input.extra !== undefined) {
        checkDuplicateSku(envelope.items, getInputSku(input), id);
      }

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
      const envelope = await loadEnvelope<Product>(storage, serviceCode, key(scope));
      checkListVersion(envelope, expectedListHash, 'Product');

      const { index } = findWithVersionCheck(envelope.items, id, expectedVersion, 'Product');
      envelope.items.splice(index, 1);
      await save(scope, envelope.items);
    },

    async findBy(scope: string, filter: ProductFilter): Promise<Product[]> {
      const items = await load(scope);
      return filterProducts(items, filter);
    },
  };
}
