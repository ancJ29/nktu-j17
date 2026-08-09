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
  buildLocation,
  applyUpdate,
  ensureDefaultLocation,
  filterLocations,
} from './logic.js';
import type {
  Location,
  CreateLocationInput,
  UpdateLocationInput,
  LocationFilter,
} from './types.js';

export type {
  Location,
  CreateLocationInput,
  UpdateLocationInput,
  LocationFilter,
} from './types.js';
export { DEFAULT_LOCATION_CODE } from './types.js';

export interface LocationModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  keyPrefix?: string;
}

export function createLocationModule(config: LocationModuleConfig) {
  const { storage, serviceCode, keyPrefix = 'locations' } = config;

  function key(scope: string): string {
    return buildKey(keyPrefix, scope);
  }

  async function save(scope: string, items: Location[]): Promise<void> {
    return saveItems(storage, serviceCode, key(scope), items);
  }

  async function load(scope: string): Promise<Location[]> {
    const items = await loadItems<Location>(storage, serviceCode, key(scope));
    const result = ensureDefaultLocation(items, new Date().toISOString());
    if (result.seeded) {
      await save(scope, result.items);
    }
    return result.items;
  }

  return {
    async getAll(scope: string): Promise<Location[]> {
      return load(scope);
    },

    async getAllIfChanged(
      scope: string,
      clientHash?: string,
    ): Promise<{ changed: boolean; locations: Location[]; hash?: string | undefined }> {
      let envelope = await loadEnvelope<Location>(storage, serviceCode, key(scope));
      const ensured = ensureDefaultLocation(envelope.items, new Date().toISOString());
      if (ensured.seeded) {
        await save(scope, ensured.items);
        envelope = await loadEnvelope<Location>(storage, serviceCode, key(scope));
      }
      const currentHash = envelope.meta.hash;

      if (clientHash && currentHash && clientHash === currentHash) {
        return { changed: false, locations: [], hash: currentHash };
      }

      return { changed: true, locations: envelope.items, hash: currentHash };
    },

    async getById(scope: string, id: string): Promise<Location | null> {
      const items = await load(scope);
      return items.find((l) => l.id === id) ?? null;
    },

    async create(scope: string, input: CreateLocationInput): Promise<Location> {
      validateCreateInput(input);
      const envelope = await loadEnvelope<Location>(storage, serviceCode, key(scope));
      checkListVersion(envelope, input.expectedListHash, 'Location');
      checkDuplicateCode(envelope.items, input.code);

      const now = Date.now();
      const location = buildLocation(generateId(), input, now);
      envelope.items.push(location);
      await save(scope, envelope.items);
      return location;
    },

    async createMany(
      scope: string,
      inputs: CreateLocationInput[],
    ): Promise<{
      created: Location[];
      errors: Array<{ index: number; message: string }>;
    }> {
      const envelope = await loadEnvelope<Location>(storage, serviceCode, key(scope));
      const created: Location[] = [];
      const errors: Array<{ index: number; message: string }> = [];
      const now = Date.now();

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i]!;
        try {
          validateCreateInput(input);
          checkDuplicateCode(envelope.items, input.code);
          const location = buildLocation(generateId(), input, now);
          envelope.items.push(location);
          created.push(location);
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

    async update(scope: string, id: string, input: UpdateLocationInput): Promise<Location> {
      const envelope = await loadEnvelope<Location>(storage, serviceCode, key(scope));
      checkListVersion(envelope, input.expectedListHash, 'Location');

      const { item, index } = findWithVersionCheck(envelope.items, id, input.version, 'Location');

      if (input.code !== undefined) {
        checkDuplicateCode(envelope.items, input.code, id);
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
      const envelope = await loadEnvelope<Location>(storage, serviceCode, key(scope));
      checkListVersion(envelope, expectedListHash, 'Location');

      const { index } = findWithVersionCheck(envelope.items, id, expectedVersion, 'Location');
      envelope.items.splice(index, 1);
      await save(scope, envelope.items);
    },

    async findBy(scope: string, filter: LocationFilter): Promise<Location[]> {
      const items = await load(scope);
      return filterLocations(items, filter);
    },
  };
}
