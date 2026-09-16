import type { ProductInventoryExtra, ProductInventoryRow } from '@/types/product-inventory';

export const RECHECK_COUNTER_THRESHOLD = 30;

export const RECHECK_DIFF_RATIO = 0.5;

export const RECHECK_DIFF_MIN_ABS = 20;

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

export type RecheckVerdict =
  | { readonly needed: false }
  | { readonly needed: true; readonly reason: 'counter' | 'diff'; readonly drift: InventoryDrift };

export function judgeInventoryRecheck(row: ProductInventoryRow): RecheckVerdict {
  const drift = readDrift(row.extra);
  if (drift.counter > RECHECK_COUNTER_THRESHOLD) return { needed: true, reason: 'counter', drift };
  const magnitude = Math.abs(drift.diff);
  if (magnitude > RECHECK_DIFF_MIN_ABS && magnitude >= RECHECK_DIFF_RATIO * Math.abs(row.onHand)) {
    return { needed: true, reason: 'diff', drift };
  }
  return { needed: false };
}
