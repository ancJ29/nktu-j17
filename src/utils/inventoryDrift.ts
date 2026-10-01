import type { ProductInventoryExtra, ProductInventoryRow } from '@/types/product-inventory';

export const RECHECK_COUNTER_THRESHOLD = 50;

export const RECHECK_INTERVAL_DAYS = 30;
const RECHECK_INTERVAL_MS = RECHECK_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

const DRIFT_TRACKING_SINCE = Date.parse('2026-09-16T00:00:00+07:00');

export type InventoryDrift = {
  readonly counter: number;

  readonly diff: number;
};

const ZERO_DRIFT: InventoryDrift = { counter: 0, diff: 0 };

export function readDrift(extra: ProductInventoryExtra | undefined): InventoryDrift {
  const stored = extra?.changeFromLastUpdate;
  if (!stored) return ZERO_DRIFT;
  return {
    counter: typeof stored.counter === 'number' ? stored.counter : 0,
    diff: typeof stored.diff === 'number' ? stored.diff : 0,
  };
}

export function markInventoryVerified<T extends ProductInventoryExtra>(
  extra: T,
  at: number = Date.now(),
): T {
  return { ...extra, lastInventoryUpdate: at, changeFromLastUpdate: { ...ZERO_DRIFT } };
}

type DriftPatch = {
  onHand?: number;
  extra?: ProductInventoryExtra;
};

export function accrueInventoryDrift<P extends DriftPatch>(
  prev: ProductInventoryRow | undefined,
  patch: P,
): P & { extra?: ProductInventoryExtra } {
  if (!prev) return patch;
  if (typeof patch.onHand !== 'number') return patch;
  const delta = patch.onHand - prev.onHand;
  if (delta === 0) return patch;

  const base = patch.extra ?? prev.extra ?? {};
  if (base.lastInventoryUpdate !== prev.extra?.lastInventoryUpdate) return patch;

  const current = readDrift(prev.extra);
  return {
    ...patch,
    extra: {
      ...base,
      changeFromLastUpdate: { counter: current.counter + 1, diff: current.diff + delta },
    },
  };
}

export function needsInventoryRecheck(row: ProductInventoryRow, now: number = Date.now()): boolean {
  const { counter } = readDrift(row.extra);
  if (counter > RECHECK_COUNTER_THRESHOLD) return true;
  if (counter === 0) return false;
  return now - lastCountedAt(row) >= RECHECK_INTERVAL_MS;
}

function lastCountedAt(row: ProductInventoryRow): number {
  const stamp = row.extra?.lastInventoryUpdate;
  if (typeof stamp === 'number') return stamp;
  return Math.max(new Date(row.createdAt).getTime() || 0, DRIFT_TRACKING_SINCE);
}
