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
