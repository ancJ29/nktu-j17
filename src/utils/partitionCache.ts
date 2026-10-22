

import { entityCacheGet, entityCacheSet, entityCacheClear } from './entityCache';
import type { CachedPartition } from './partitionReconcile';

export type { CachedPartition } from './partitionReconcile';

function partitionKey(cacheKey: string, date: string): string {
  return `${cacheKey}:p:${date}`;
}

export async function readPartitions<T>(
  cacheKey: string,
  dates: string[],
): Promise<Map<string, CachedPartition<T>>> {
  const entries = await Promise.all(
    dates.map((date) =>
      entityCacheGet<CachedPartition<T>>(partitionKey(cacheKey, date)).then(
        (value) => [date, value] as const,
      ),
    ),
  );
  const map = new Map<string, CachedPartition<T>>();
  for (const [date, value] of entries) {
    if (value && Array.isArray(value.items) && typeof value.hash === 'string') {
      map.set(date, value);
    }
  }
  return map;
}

export async function persistPartitions<T>(
  cacheKey: string,
  writes: ReadonlyArray<readonly [string, CachedPartition<T>]>,
  clears: readonly string[],
): Promise<void> {
  await Promise.all([
    ...writes.map(([date, slice]) =>
      entityCacheSet<CachedPartition<T>>(partitionKey(cacheKey, date), slice),
    ),
    ...clears.map((date) => entityCacheClear(partitionKey(cacheKey, date))),
  ]);
}
