

import type { CMngtPartitionedQuerySyncResponse } from '@credo/connectors/types';
import { logger } from '@credo/base-ui/utils';
import { persistPartitions, readPartitions } from '@/utils/partitionCache';
import { enumerateDates, reconcilePartitionSync } from '@/utils/partitionReconcile';
import { type FetchAllResult, recordHash } from './createEntityStore';

type SyncFn<T> = (req: {
  fromPeriod: string;
  toPeriod: string;
  partitionHashes?: Record<string, string>;
}) => Promise<CMngtPartitionedQuerySyncResponse<T>>;

type PartitionedFetcherConfig<T> = {
  
  cacheKey: string;
  
  getRange: () => { from: string; to: string };
  
  querySync: SyncFn<T>;
};

export function createPartitionedSyncFetcher<T extends { id: string }>(
  config: PartitionedFetcherConfig<T>,
): () => Promise<FetchAllResult<T>> {
  const { cacheKey, getRange, querySync } = config;
  
  
  let lastCombinedHash: string | null = null;

  return async function fetchAll(): Promise<FetchAllResult<T>> {
    const { from, to } = getRange();
    const dates = enumerateDates(from, to);
    if (dates.length === 0) {
      lastCombinedHash = null;
      return { items: [] };
    }

    const cached = await readPartitions<T>(cacheKey, dates);

    const partitionHashes: Record<string, string> = {};
    for (const date of dates) {
      const slice = cached.get(date);
      if (slice) partitionHashes[date] = slice.hash;
    }

    const res = await querySync({ fromPeriod: from, toPeriod: to, partitionHashes });

    const { merged, writes, clears, missing } = reconcilePartitionSync<T>(dates, cached, res);
    for (const date of missing) {
      
      
      
      logger.warn(`[partition:${cacheKey}] unchanged day with no cache`, date);
    }

    void persistPartitions<T>(cacheKey, writes, clears);

    const combinedHash = recordHash({ from, to, hashes: res.hashes, empty: res.emptyDates });
    if (combinedHash === lastCombinedHash) return null;
    lastCombinedHash = combinedHash;
    return { items: merged, hash: combinedHash };
  };
}
