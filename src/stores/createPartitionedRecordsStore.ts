

import { cMngtConnector } from '@credo/connectors/connector';
import type {
  CMngtPartitionedRecordTarget,
  CMngtRecordPartitionLocate,
} from '@credo/connectors/types';
import { logger } from '@credo/base-ui/utils';
import { persistPartitions, readPartitions } from '@/utils/partitionCache';
import { enumerateDates, reconcilePartitionSync } from '@/utils/partitionReconcile';
import {
  createEntityStore,
  recordHash,
  toEntityConflictError,
  isListVersionConflict,
  MAX_LIST_CONFLICT_RETRIES,
  type FetchAllResult,
} from './createEntityStore';

export type PartitionedRecordRow = { id: string; version: string } & Record<string, unknown>;

type Range = { from: string; to: string };

export type PartitionedRecordsStoreConfig = {
  
  entity: string;
  
  partitionLocate: CMngtRecordPartitionLocate;
  
  uniqueField?: string | string[];
  
  cacheKey: string;
  cacheTTL?: number;
  staleTime?: number;
  
  defaultRangeDays?: number;
  
  keysForRange?: (from: string, to: string) => string[];
};

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function createPartitionedRecordsStore<T extends PartitionedRecordRow>(
  config: PartitionedRecordsStoreConfig,
) {
  const {
    entity,
    partitionLocate,
    uniqueField,
    cacheKey,
    cacheTTL,
    staleTime,
    defaultRangeDays = 14,
    keysForRange = enumerateDates,
  } = config;

  
  const target: CMngtPartitionedRecordTarget = {
    entity,
    partitionLocate,
    ...(uniqueField !== undefined && { uniqueField }),
  };

  function defaultRange(): Range {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - defaultRangeDays);
    return { from: fmt(from), to: fmt(to) };
  }

  
  
  let currentRange: Range = defaultRange();

  
  const partitionHashes = new Map<string, string>();

  let lastCombinedHash: string | null = null;

  
  async function fetchAll(): Promise<FetchAllResult<T>> {
    const { from, to } = currentRange;
    const keys = keysForRange(from, to);
    if (keys.length === 0) {
      lastCombinedHash = null;
      return { items: [] };
    }

    const cached = await readPartitions<T>(cacheKey, keys);
    const cachedHashes: Record<string, string> = {};
    for (const key of keys) {
      const slice = cached.get(key);
      if (slice) cachedHashes[key] = slice.hash;
    }

    const res = await cMngtConnector.queryPartitionedRecordsSync(target, {
      partitionKeys: keys,
      partitionHashes: cachedHashes,
    });

    
    
    const { merged, writes, clears, missing } = reconcilePartitionSync<T>(keys, cached, {
      changed: res.changed,
      ...(res.changed && { updated: res.updated as Record<string, T[]> }),
      hashes: res.hashes,
      emptyDates: res.emptyKeys,
    });
    for (const key of missing) {
      logger.warn(`[partitioned:${cacheKey}] unchanged partition with no cache`, key);
    }

    
    for (const key of keys) {
      const hash = res.hashes[key];
      if (hash) partitionHashes.set(key, hash);
      else partitionHashes.delete(key);
    }

    void persistPartitions<T>(cacheKey, writes, clears);

    const combinedHash = recordHash({ from, to, hashes: res.hashes, empty: res.emptyKeys });
    if (combinedHash === lastCombinedHash) return null;
    lastCombinedHash = combinedHash;
    return { items: merged, hash: combinedHash };
  }

  const useStore = createEntityStore<T>({
    cacheKey,
    ...(cacheTTL !== undefined && { cacheTTL }),
    ...(staleTime !== undefined && { staleTime }),
    fetchAll,
  });

  
  async function resyncPartition(key: string): Promise<void> {
    const res = await cMngtConnector.queryPartitionedRecordsSync(target, {
      partitionKeys: [key],
    });
    const hash = res.hashes[key];
    if (hash) partitionHashes.set(key, hash);
    else partitionHashes.delete(key);
    if (res.emptyKeys.includes(key)) {
      await persistPartitions(cacheKey, [], [key]);
    } else if (res.changed && res.updated[key] && hash) {
      await persistPartitions<T>(cacheKey, [[key, { items: res.updated[key] as T[], hash }]], []);
    }
  }

  
  async function settleWrite(
    affectedKeys: ReadonlyArray<string | undefined>,
    landedKey: string | undefined,
    listHash: string | undefined,
    apply: () => void,
  ): Promise<void> {
    const keys = [...new Set(affectedKeys.filter((k): k is string => !!k))];
    for (const key of keys) partitionHashes.delete(key);
    if (landedKey && listHash) partitionHashes.set(landedKey, listHash);
    await persistPartitions(cacheKey, [], keys);
    apply();
    lastCombinedHash = null; 
    void useStore.getState().revalidate();
  }

  
  function surfaceWriteError(err: unknown): never {
    if (isListVersionConflict(err)) {
      void useStore.getState().revalidate();
      throw err;
    }
    const conflict = toEntityConflictError<T>(err); 
    void useStore.getState().revalidate();
    throw conflict;
  }

  async function createSafely(args: {
    item: Record<string, unknown>;
    
    partitionKey?: string;
  }): Promise<T> {
    let attempt = 0;
    while (true) {
      attempt++;
      const expectedListHash = args.partitionKey
        ? partitionHashes.get(args.partitionKey)
        : undefined;
      try {
        const res = await cMngtConnector.createPartitionedRecord(target, {
          item: args.item,
          partitionKey: args.partitionKey,
          expectedListHash,
        });
        const created = res.item as T;
        await settleWrite([res.partitionKey], res.partitionKey, res.listHash, () =>
          useStore.getState().upsertItem(created),
        );
        return created;
      } catch (err) {
        if (
          isListVersionConflict(err) &&
          args.partitionKey &&
          attempt < MAX_LIST_CONFLICT_RETRIES
        ) {
          await resyncPartition(args.partitionKey);
          continue;
        }
        surfaceWriteError(err);
      }
    }
  }

  async function updateSafely(args: {
    id: string;
    version: string;
    patch: Record<string, unknown>;
    
    partitionKey?: string;
    
    newPartitionKey?: string;
  }): Promise<T> {
    let attempt = 0;
    while (true) {
      attempt++;
      const expectedListHash = args.partitionKey
        ? partitionHashes.get(args.partitionKey)
        : undefined;
      try {
        const res = await cMngtConnector.updatePartitionedRecord(target, {
          id: args.id,
          version: args.version,
          patch: args.patch,
          partitionKey: args.partitionKey,
          newPartitionKey: args.newPartitionKey,
          expectedListHash,
        });
        const updated = res.item as T;
        
        
        await settleWrite(
          [args.partitionKey, res.partitionKey],
          res.partitionKey,
          res.listHash,
          () => useStore.getState().upsertItem(updated),
        );
        return updated;
      } catch (err) {
        if (
          isListVersionConflict(err) &&
          args.partitionKey &&
          attempt < MAX_LIST_CONFLICT_RETRIES
        ) {
          await resyncPartition(args.partitionKey);
          continue;
        }
        surfaceWriteError(err);
      }
    }
  }

  async function deleteSafely(args: {
    id: string;
    version: string;
    
    partitionKey?: string;
  }): Promise<void> {
    let attempt = 0;
    while (true) {
      attempt++;
      const expectedListHash = args.partitionKey
        ? partitionHashes.get(args.partitionKey)
        : undefined;
      try {
        const res = await cMngtConnector.deletePartitionedRecord(target, {
          id: args.id,
          version: args.version,
          partitionKey: args.partitionKey,
          expectedListHash,
        });
        
        
        const removedFrom = res.partitionKey ?? args.partitionKey;
        await settleWrite([removedFrom], undefined, undefined, () =>
          useStore.getState().removeItem(args.id),
        );
        return;
      } catch (err) {
        if (
          isListVersionConflict(err) &&
          args.partitionKey &&
          attempt < MAX_LIST_CONFLICT_RETRIES
        ) {
          await resyncPartition(args.partitionKey);
          continue;
        }
        surfaceWriteError(err);
      }
    }
  }

  return {
    useStore,

    
    setRange(from: Date | null, to: Date | null): void {
      currentRange = !from || !to ? defaultRange() : { from: fmt(from), to: fmt(to) };
    },
    
    getRange(): Range {
      return currentRange;
    },

    
    async queryPartition(key: string): Promise<T[]> {
      const res = await cMngtConnector.queryPartitionedRecordsSync(target, {
        partitionKeys: [key],
      });
      return res.changed ? ((res.updated[key] as T[] | undefined) ?? []) : [];
    },

    
    fetchById(id: string, partitionKey?: string): Promise<{ item: T; partitionKey: string }> {
      return cMngtConnector
        .getPartitionedRecordById(target, { id, partitionKey })
        .then((r) => ({ item: r.item as T, partitionKey: r.partitionKey }));
    },

    createSafely,
    updateSafely,
    deleteSafely,
  };
}
