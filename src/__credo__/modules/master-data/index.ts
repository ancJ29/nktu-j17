import type { RecordEnvelope, StorageAdapter } from '../core/types.js';
import { buildKey, loadItems, saveItems } from '../core/record-helpers.js';
import type { MasterDataCache, MasterDataHashes, EntityName } from './types.js';
import { ENTITY_PREFIXES } from './types.js';

export type { MasterDataCache, MasterDataHashes } from './types.js';
export { createTrackedStorageAdapter } from './tracked-storage.js';

export interface MasterDataModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  cacheKeyPrefix?: string;
  versionKeyPrefix?: string;
}

export function createMasterDataModule(config: MasterDataModuleConfig) {
  const {
    storage,
    serviceCode,
    cacheKeyPrefix = 'master-data',
    versionKeyPrefix = 'master-data-version',
  } = config;

  function cacheKey(scope: string): string {
    return buildKey(cacheKeyPrefix, scope);
  }

  function versionKey(scope: string): string {
    return buildKey(versionKeyPrefix, scope);
  }

  function entityKeys(scope: string): string[] {
    return ENTITY_PREFIXES.map((prefix) => buildKey(prefix, scope));
  }

  async function loadCurrent(
    scope: string,
  ): Promise<{ data: Record<EntityName, unknown[]>; hashes: MasterDataHashes }> {
    const [cached, currentHashes] = (await storage.getRecordsByKeys(serviceCode, [
      cacheKey(scope),
      versionKey(scope),
    ])) as [MasterDataCache | null, MasterDataHashes | null];

    const hashes = currentHashes ?? {};

    if (cached && isCacheValid(cached.hashes, hashes)) {
      const data = {} as Record<EntityName, unknown[]>;
      for (const prefix of ENTITY_PREFIXES) {
        data[prefix] = cached[prefix] ?? [];
      }
      return { data, hashes: cached.hashes };
    }

    const entityEnvelopes = await storage.getRecordsByKeys<RecordEnvelope<unknown>>(
      serviceCode,
      entityKeys(scope),
    );

    const masterData = {} as Record<EntityName, unknown[]>;
    const freshHashes: MasterDataHashes = {};
    ENTITY_PREFIXES.forEach((prefix, i) => {
      masterData[prefix] = entityEnvelopes[i]?.items ?? [];
      freshHashes[prefix] = entityEnvelopes[i]?.meta?.hash || '';
    });

    const cacheData: MasterDataCache = {
      ...masterData,
      hashes: freshHashes,
      meta: { updatedAt: Date.now() },
    };
    await storage.pushRecord(serviceCode, cacheKey(scope), cacheData);

    return { data: masterData, hashes: freshHashes };
  }

  return {
    async getAll(scope: string) {
      const { data } = await loadCurrent(scope);
      return data;
    },

    async getAllIfChanged(
      scope: string,
      clientHashes?: MasterDataHashes,
    ): Promise<
      | { changed: false; hashes: MasterDataHashes }
      | { changed: true; updated: Partial<Record<EntityName, unknown[]>>; hashes: MasterDataHashes }
    > {
      const { data, hashes } = await loadCurrent(scope);

      if (clientHashes && isCacheValid(hashes, clientHashes)) {
        return { changed: false, hashes };
      }

      const updated: Partial<Record<EntityName, unknown[]>> = {};
      for (const name of ENTITY_PREFIXES) {
        if (!hashEqual(clientHashes?.[name], hashes[name])) {
          updated[name] = data[name];
        }
      }

      return { changed: true, updated, hashes };
    },

    async resync(scope: string, trackedStorage: StorageAdapter): Promise<EntityName[]> {
      const versions =
        (await storage.getRecord<MasterDataHashes>(serviceCode, versionKey(scope))) ?? {};

      const resynced: EntityName[] = [];

      for (const prefix of ENTITY_PREFIXES) {
        if (versions[prefix]) continue;

        const key = buildKey(prefix, scope);
        const items = await loadItems(trackedStorage, serviceCode, key);
        await saveItems(trackedStorage, serviceCode, key, items);
        resynced.push(prefix);
      }

      return resynced;
    },
  };
}

function isCacheValid(cachedHashes: MasterDataHashes, currentHashes: MasterDataHashes): boolean {
  for (const name of ENTITY_PREFIXES) {
    if (!hashEqual(cachedHashes[name], currentHashes[name])) {
      return false;
    }
  }
  return true;
}

function hashEqual(a: string | undefined, b: string | undefined): boolean {
  return (a ?? '') === (b ?? '');
}
