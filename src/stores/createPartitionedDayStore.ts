import { logger } from '@credo/base-ui/utils';
import { ONE_DAY, ONE_MINUTE } from '@credo/kits/time';
import { businessDateString } from '@/utils/code';
import { persistPartitions, readPartitions } from '@/utils/partitionCache';
import { enumerateDates } from '@/utils/partitionReconcile';
import {
  createEntityStore,
  isListVersionConflict,
  isVersionConflict,
  MAX_LIST_CONFLICT_RETRIES,
  recordHash,
  toEntityConflictError,
} from './createEntityStore';

export type DaySync<T> =
  { changed: false; hash: string } | { changed: true; items: T[]; hash: string };

export type DayWriteResult<T> = { item: T; day: string; listHash?: string };

export type DayWriteCas = { version: string; expectedListHash?: string };

const DEFAULT_RANGE_DAYS = 14;

export const MAX_RANGE_DAYS = 92;

type Range = { from: string; to: string };

const defaultRange = (days: number): Range => {
  const now = Date.now();
  return { from: businessDateString(now - days * ONE_DAY), to: businessDateString(now) };
};

type Reconciled<T> = {
  items: T[];
  writes: Array<[string, { items: T[]; hash: string }]>;
  clears: string[];

  hashes: Record<string, string>;
};

function reconcileDays<T>(
  cacheKey: string,
  days: readonly string[],
  cached: ReadonlyMap<string, { items: T[]; hash: string }>,
  answers: Record<string, DaySync<T>> | undefined,
): Reconciled<T> {
  const out: Reconciled<T> = { items: [], writes: [], clears: [], hashes: {} };

  for (const day of days) {
    const answer = answers?.[day];
    const slice = cached.get(day);

    if (!answer) {
      logger.warn(`[${cacheKey}] no answer for day`, day);
      if (slice) {
        out.items.push(...slice.items);
        out.hashes[day] = slice.hash;
      }
      continue;
    }

    out.hashes[day] = answer.hash;

    if (!answer.changed) {
      if (slice) out.items.push(...slice.items);
      else logger.warn(`[${cacheKey}] unchanged day with no cache`, day);
      continue;
    }

    out.items.push(...answer.items);

    if (answer.items.length > 0) out.writes.push([day, { items: answer.items, hash: answer.hash }]);
    else out.clears.push(day);
  }

  return out;
}

export function createPartitionedDayStore<T extends { id: string }>(config: {
  cacheKey: string;

  querySync: (input: {
    days: string[];
    knownHashes: Record<string, string>;
  }) => Promise<{ days?: Record<string, DaySync<T>> }>;
}) {
  const { cacheKey, querySync } = config;

  let currentRange: Range = defaultRange(DEFAULT_RANGE_DAYS);

  const dayHashes = new Map<string, string>();

  let lastCombinedHash: string | null = null;

  const fetchAll = async () => {
    const { from, to } = currentRange;
    const days = enumerateDates(from, to);
    if (days.length === 0) {
      lastCombinedHash = null;
      return { items: [] };
    }

    const cached = await readPartitions<T>(cacheKey, days);
    const knownHashes: Record<string, string> = {};
    for (const day of days) {
      const slice = cached.get(day);
      if (slice) knownHashes[day] = slice.hash;
    }

    const res = await querySync({ days, knownHashes });
    const { items, writes, clears, hashes } = reconcileDays<T>(cacheKey, days, cached, res.days);

    for (const [day, hash] of Object.entries(hashes)) dayHashes.set(day, hash);
    void persistPartitions<T>(cacheKey, writes, clears);

    const combinedHash = recordHash({ from, to, hashes });
    if (combinedHash === lastCombinedHash) return null;
    lastCombinedHash = combinedHash;
    return { items, hash: combinedHash };
  };

  const store = createEntityStore<T>({
    cacheKey,

    cacheTTL: ONE_MINUTE,
    fetchAll,
  });

  const settleWrite = async (item: T, day: string, listHash: string | undefined) => {
    dayHashes.delete(day);
    if (listHash) dayHashes.set(day, listHash);
    await persistPartitions<T>(cacheKey, [], [day]);
    lastCombinedHash = null;
    store.getState().upsertItem(item);
    void store.getState().revalidate();
  };

  const hashOf = (day: string): string | undefined => dayHashes.get(day);

  const refreshDay = async (day: string): Promise<void> => {
    const res = await querySync({ days: [day], knownHashes: {} });
    const answer = res.days?.[day];
    if (!answer) return;
    dayHashes.set(day, answer.hash);
    if (answer.changed) {
      if (answer.items.length > 0) {
        await persistPartitions<T>(
          cacheKey,
          [[day, { items: answer.items, hash: answer.hash }]],
          [],
        );
        for (const item of answer.items) store.getState().upsertItem(item);
      } else {
        await persistPartitions<T>(cacheKey, [], [day]);
      }
    }
    lastCombinedHash = null;
  };

  return {
    store,

    async fetchWindow(
      fromDay: string,
      toDay: string,
      options: { fresh?: boolean } = {},
    ): Promise<T[]> {
      const days = enumerateDates(fromDay, toDay);
      if (days.length === 0) return [];
      const cached = options.fresh
        ? new Map<string, { items: T[]; hash: string }>()
        : await readPartitions<T>(cacheKey, days);

      const chunks: string[][] = [];
      for (let i = 0; i < days.length; i += MAX_RANGE_DAYS) {
        chunks.push(days.slice(i, i + MAX_RANGE_DAYS));
      }

      const items: T[] = [];
      const writes: Array<[string, { items: T[]; hash: string }]> = [];
      const clears: string[] = [];
      await Promise.all(
        chunks.map(async (chunkDays) => {
          const knownHashes: Record<string, string> = {};
          for (const day of chunkDays) {
            const slice = cached.get(day);
            if (slice) knownHashes[day] = slice.hash;
          }
          const res = await querySync({ days: chunkDays, knownHashes });
          const chunk = reconcileDays<T>(cacheKey, chunkDays, cached, res.days);
          items.push(...chunk.items);
          writes.push(...chunk.writes);
          clears.push(...chunk.clears);
          // The window's hashes are deliberately NOT seeded into `dayHashes`:
          // that map is the LIST's write token, and a report reading a year
          // must not hand the next write a token from outside its own range.
        }),
      );

      void persistPartitions<T>(cacheKey, writes, clears);
      return items;
    },

    setRange(range: Range): boolean {
      const days = enumerateDates(range.from, range.to);
      if (days.length === 0) return false;
      const next =
        days.length <= MAX_RANGE_DAYS
          ? range
          : { from: days[days.length - MAX_RANGE_DAYS]!, to: range.to };
      const moved = next.from !== currentRange.from || next.to !== currentRange.to;
      currentRange = next;
      lastCombinedHash = null;
      return moved;
    },

    async write(call: () => Promise<DayWriteResult<T>>): Promise<T> {
      try {
        const res = await call();
        await settleWrite(res.item, res.day, res.listHash);
        return res.item;
      } catch (error) {
        throw toEntityConflictError<T>(error);
      }
    },

    async writeSafely(
      record: { version: string },
      day: string,
      call: (cas: DayWriteCas) => Promise<DayWriteResult<T>>,
    ): Promise<T> {
      let attempt = 0;
      while (true) {
        attempt++;
        const hash = hashOf(day);
        try {
          const res = await call({
            version: record.version,
            ...(hash !== undefined && { expectedListHash: hash }),
          });
          await settleWrite(res.item, res.day, res.listHash);
          return res.item;
        } catch (error) {
          if (isListVersionConflict(error) && attempt < MAX_LIST_CONFLICT_RETRIES) {
            await refreshDay(day).catch(() => undefined);
            continue;
          }

          if (isVersionConflict(error) || isListVersionConflict(error)) {
            await refreshDay(day).catch(() => undefined);
          }
          throw toEntityConflictError<T>(error);
        }
      }
    },

    async transitionSafely(
      record: { version: string; derivativesPending?: boolean },
      day: string,
      call: (cas: DayWriteCas | Record<string, never>) => Promise<DayWriteResult<T>>,
    ): Promise<T> {
      if (record.derivativesPending === true) {
        try {
          const res = await call({});
          await settleWrite(res.item, res.day, res.listHash);
          return res.item;
        } catch (error) {
          throw toEntityConflictError<T>(error);
        }
      }
      return this.writeSafely(record, day, call);
    },
  };
}
