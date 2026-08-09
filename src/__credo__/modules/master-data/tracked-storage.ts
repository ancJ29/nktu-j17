import type { RecordMeta, StorageAdapter } from '../core/types.js';
import { buildKey } from '../core/record-helpers.js';
import type { MasterDataHashes } from './types.js';

const TRACKED_PREFIXES = new Set(['employees', 'products', 'locations', 'lookups']);

export function createTrackedStorageAdapter(
  storage: StorageAdapter,
  versionKeyPrefix = 'master-data-version',
): StorageAdapter {
  return {
    getRecord: storage.getRecord.bind(storage),
    getRecordsByKeys: storage.getRecordsByKeys.bind(storage),
    removeRecord: storage.removeRecord.bind(storage),

    async pushRecord<T>(sc: string, key: string, data: T): Promise<void> {
      await storage.pushRecord(sc, key, data);

      const dotIndex = key.indexOf('.');
      if (dotIndex <= 0) return;

      const prefix = key.substring(0, dotIndex);
      if (!TRACKED_PREFIXES.has(prefix)) return;

      const scope = key.substring(dotIndex + 1);
      const hash = (data as { meta?: RecordMeta })?.meta?.hash;
      if (!hash) return;

      const versionKey = buildKey(versionKeyPrefix, scope);
      const current = (await storage.getRecord<MasterDataHashes>(sc, versionKey)) ?? {};
      current[prefix as keyof MasterDataHashes] = hash;
      await storage.pushRecord(sc, versionKey, current);
    },
  };
}
