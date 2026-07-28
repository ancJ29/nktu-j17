import type { GoodsReceiptItem } from '@/types';

export type DeltaByUnit = Record<string, number>;

export function aggregateByCode(items: GoodsReceiptItem[], sign: 1 | -1): Map<string, DeltaByUnit> {
  const totals = new Map<string, DeltaByUnit>();
  for (const item of items) {
    const cur = totals.get(item.itemCode) ?? {};
    cur[item.unit] = (cur[item.unit] ?? 0) + sign * item.quantity;
    totals.set(item.itemCode, cur);
  }
  return totals;
}

export function pruneZeros(deltas: DeltaByUnit): DeltaByUnit {
  const out: DeltaByUnit = {};
  for (const [u, d] of Object.entries(deltas)) if (d !== 0) out[u] = d;
  return out;
}

export function positiveOnly(deltas: DeltaByUnit): DeltaByUnit {
  const out: DeltaByUnit = {};
  for (const [u, d] of Object.entries(deltas)) if (d > 0) out[u] = d;
  return out;
}

export function distinctItemCodeCount(items: GoodsReceiptItem[]): number {
  return new Set(items.map((i) => i.itemCode)).size;
}

export type PostingCounts = {
  failed: number;
  succeeded: number;
  alreadyPosted: number;
  skipped: number;
};

export function isPostingComplete(counts: PostingCounts, requestedCodes: number): boolean {
  return (
    counts.failed === 0 &&
    counts.succeeded + counts.alreadyPosted + counts.skipped === requestedCodes
  );
}
