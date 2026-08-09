import type { RecordEnvelope, RecordMeta, StorageAdapter } from './types.js';
import { loadEnvelope, loadItems, saveItems, saveItemsWithMeta } from './record-helpers.js';

/** Formatter for UTC+7 (Asia/Ho_Chi_Minh) dates in YYYY-MM-DD format */
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Build key for a date partition */
export function buildPartitionKey(prefix: string, scope: string, period: string): string {
  return `${prefix}.${scope}.${period}`;
}

/** Get current period string (YYYY-MM-DD in UTC+7) */
export function getCurrentPeriod(now?: Date): string {
  const d = now ?? new Date();
  return dateFormatter.format(d);
}

/** Generate daily period strings for a date range (inclusive) */
export function getPeriodRange(from: string, to: string): string[] {
  const periods: string[] = [];
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return periods;

  const current = new Date(start);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    periods.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }

  return periods;
}

/** Load items from a date partition */
export async function loadPartition<T>(
  storage: StorageAdapter,
  serviceCode: string,
  prefix: string,
  scope: string,
  period: string,
): Promise<T[]> {
  const key = buildPartitionKey(prefix, scope, period);
  return loadItems<T>(storage, serviceCode, key);
}

/**
 * Load a partition's full envelope (items + meta) — needed by writers that
 * check the partition-level hash (envelope-CAS) before mutating; `loadPartition`
 * discards the meta.
 */
export async function loadPartitionEnvelope<T>(
  storage: StorageAdapter,
  serviceCode: string,
  prefix: string,
  scope: string,
  period: string,
): Promise<RecordEnvelope<T>> {
  const key = buildPartitionKey(prefix, scope, period);
  return loadEnvelope<T>(storage, serviceCode, key);
}

/**
 * Save items to a date partition, returning the freshly stamped meta so
 * writers can echo the new partition hash without a second read.
 */
export async function savePartitionWithMeta<T>(
  storage: StorageAdapter,
  serviceCode: string,
  prefix: string,
  scope: string,
  period: string,
  items: T[],
): Promise<RecordMeta> {
  const key = buildPartitionKey(prefix, scope, period);
  return saveItemsWithMeta(storage, serviceCode, key, items);
}

/** Save items to a date partition */
export async function savePartition<T>(
  storage: StorageAdapter,
  serviceCode: string,
  prefix: string,
  scope: string,
  period: string,
  items: T[],
): Promise<void> {
  const key = buildPartitionKey(prefix, scope, period);
  return saveItems(storage, serviceCode, key, items);
}

/** Extract YYYY-MM-DD period (UTC+7) from a generateId()-produced ID (base36 timestamp prefix) */
export function extractPeriodFromId(id: string): string | null {
  const tsBase36 = id.split('-')[0];
  if (!tsBase36) return null;
  const ms = parseInt(tsBase36, 36);
  if (isNaN(ms) || ms <= 0) return null;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return dateFormatter.format(d);
}

/** Query across multiple date partitions in parallel */
export async function queryPartitions<T>(
  storage: StorageAdapter,
  serviceCode: string,
  prefix: string,
  scope: string,
  periods: string[],
): Promise<T[]> {
  const results = await Promise.all(
    periods.map((period) => loadPartition<T>(storage, serviceCode, prefix, scope, period)),
  );
  return results.flat();
}

/**
 * Result of a hash-synced partition query. Together `hashes` + `emptyDates`
 * describe every period asked for: a period is either in `hashes` (has data,
 * paired with its current change-marker) or in `emptyDates` (no record).
 * `updated` carries the items only for periods whose hash drifted from the
 * caller's — those that transfer a payload.
 */
export type PartitionSyncResult<T> = {
  updated: Record<string, T[]>;
  hashes: Record<string, string>;
  emptyDates: string[];
};

/**
 * Per-partition change marker. Prefers the envelope's stored `meta.hash` (a
 * random-suffixed marker stamped on every save). Legacy records saved before
 * the meta was added fall back to a `version`+`updatedAt` composite, which
 * still advances on every write — enough for the client to detect a change.
 */
function partitionHash<T>(env: RecordEnvelope<T>): string {
  return env.meta.hash ?? `v${env.meta.version ?? 0}-${env.meta.updatedAt}`;
}

/**
 * Hash-synced query across date partitions. Batch-reads each period's full
 * envelope (so `meta.hash` survives — `queryPartitions` discards it), then
 * compares against the caller's `clientHashes`:
 *
 *  - period has items and its hash differs from the client's (or the client
 *    sent none) → returned in `updated` + `hashes`.
 *  - period has items and the hash matches → returned in `hashes` only (no
 *    payload — the saving).
 *  - period has no record / empty items → returned in `emptyDates`.
 *
 * One batch storage call for the whole range (vs N parallel `getRecord`s).
 */
export async function queryPartitionsWithHashes<T>(
  storage: StorageAdapter,
  serviceCode: string,
  prefix: string,
  scope: string,
  periods: string[],
  clientHashes: Record<string, string>,
): Promise<PartitionSyncResult<T>> {
  const keys = periods.map((period) => buildPartitionKey(prefix, scope, period));
  const envelopes = await storage.getRecordsByKeys<RecordEnvelope<T>>(serviceCode, keys);

  const updated: Record<string, T[]> = {};
  const hashes: Record<string, string> = {};
  const emptyDates: string[] = [];

  periods.forEach((period, i) => {
    const env = envelopes[i];
    const items = env?.items ?? [];
    if (!env || items.length === 0) {
      emptyDates.push(period);
      return;
    }
    const hash = partitionHash(env);
    hashes[period] = hash;
    if (clientHashes[period] !== hash) {
      updated[period] = items;
    }
  });

  return { updated, hashes, emptyDates };
}
