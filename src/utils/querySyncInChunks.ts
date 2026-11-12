import type { CMngtPartitionedQuerySyncResponse } from '@credo/connectors/types';

export const MAX_DAYS_PER_QUERY = 100;

type SyncFn<T> = (req: {
  fromPeriod: string;
  toPeriod: string;
  partitionHashes?: Record<string, string>;
}) => Promise<CMngtPartitionedQuerySyncResponse<T>>;

export async function querySyncInChunks<T>(
  querySync: SyncFn<T>,
  dates: readonly string[],
  partitionHashes: Record<string, string>,
): Promise<CMngtPartitionedQuerySyncResponse<T>> {
  const updated: Record<string, T[]> = {};
  const hashes: Record<string, string> = {};
  const emptyDates: string[] = [];
  let changed = false;
  for (let i = 0; i < dates.length; i += MAX_DAYS_PER_QUERY) {
    const chunk = dates.slice(i, i + MAX_DAYS_PER_QUERY);
    const sent: Record<string, string> = {};
    for (const d of chunk) {
      const h = partitionHashes[d];
      if (h !== undefined) sent[d] = h;
    }
    const res = await querySync({
      fromPeriod: chunk[0],
      toPeriod: chunk[chunk.length - 1],
      partitionHashes: sent,
    });
    if (res.changed) {
      changed = true;
      Object.assign(updated, res.updated);
    }
    Object.assign(hashes, res.hashes);
    emptyDates.push(...res.emptyDates);
  }
  return changed
    ? { success: true, changed: true, updated, hashes, emptyDates }
    : { success: true, changed: false, hashes, emptyDates };
}
