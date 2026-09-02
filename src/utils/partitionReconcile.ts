export type CachedPartition<T> = { items: T[]; hash: string };

export type PartitionSyncResponse<T> = {
  changed: boolean;
  updated?: Record<string, T[]>;
  hashes: Record<string, string>;
  emptyDates: string[];
};

export type PartitionReconcileResult<T> = {
  merged: T[];

  writes: Array<[string, CachedPartition<T>]>;

  clears: string[];

  missing: string[];
};

export function partitionDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function enumerateDates(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

  const dates: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function reconcilePartitionSync<T>(
  dates: string[],
  cached: Map<string, CachedPartition<T>>,
  res: PartitionSyncResponse<T>,
): PartitionReconcileResult<T> {
  const updated = res.changed ? (res.updated ?? {}) : {};
  const emptyDates = new Set(res.emptyDates);

  const merged: T[] = [];
  const writes: Array<[string, CachedPartition<T>]> = [];
  const clears: string[] = [];
  const missing: string[] = [];

  for (const date of dates) {
    if (emptyDates.has(date)) {
      if (cached.has(date)) clears.push(date);
      continue;
    }
    const hash = res.hashes[date];
    const fresh = updated[date];
    if (fresh !== undefined && hash) {
      merged.push(...fresh);
      writes.push([date, { items: fresh, hash }]);
    } else {
      const slice = cached.get(date);
      if (slice) {
        merged.push(...slice.items);
      } else {
        missing.push(date);
      }
    }
  }

  return { merged, writes, clears, missing };
}
