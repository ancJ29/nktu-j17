import type { ProductInventoryRow, ProductInventorySummary } from '@/types/product-inventory';
import type { Product } from '@/types/product';
import type { InboundEntry } from '@/hooks/useOpenInboundByProduct';
import { deriveSecondaryStatus } from '@/types/inventoryStatus';
import { isDev } from '@/config/env';
import { summarizeProductAvailability } from './inventoryCommitment';
import { type OnHandByUnit, readRowBreakdown, verifyOnHandInvariant } from './inventoryMath';
import { getCurrentPeriodKey } from './periodKey';
import { getItemBaseUnit } from './unitConversion';

type SummaryOptions = {
  readonly locationFilter?: string | null;

  readonly inboundByCode?: ReadonlyMap<string, InboundEntry>;
};

export function buildProductInventorySummaries(
  products: readonly Product[],
  rows: readonly ProductInventoryRow[],
  options: SummaryOptions = {},
): ProductInventorySummary[] {
  const { locationFilter, inboundByCode } = options;
  const rowsByCode = new Map<string, ProductInventoryRow[]>();
  for (const r of rows) {
    if (r.extra?.isDeleted) continue;
    if (locationFilter && r.locationCode !== locationFilter) continue;
    const bucket = rowsByCode.get(r.itemCode);
    if (bucket) bucket.push(r);
    else rowsByCode.set(r.itemCode, [r]);
  }
  const periodKey = getCurrentPeriodKey();
  return products.map((p) => {
    const matching = rowsByCode.get(p.code) ?? [];
    const baseUnit = getItemBaseUnit(p);
    const totalByUnit: OnHandByUnit = {};
    let totalOnHand = 0;
    let totalBeginOfPeriod = 0;
    let hasBeginOfPeriod = false;
    let lastUpdatedAt: string | null = null;
    for (const r of matching) {
      if (isDev) {
        const drift = verifyOnHandInvariant(p, r);
        if (drift !== null) {
          console.warn(
            `[inventory] onHand drift of ${drift} for ${r.itemCode}@${r.locationCode} — ` +
              `stored=${r.onHand}, breakdown=${JSON.stringify(r.extra?.onHandByUnit)}. ` +
              `A writer is bypassing inventoryMath.`,
          );
        }
      }
      totalOnHand += r.onHand;
      const begin = r.extra?.beginOfPeriod?.[periodKey];
      if (typeof begin === 'number') {
        totalBeginOfPeriod += begin;
        hasBeginOfPeriod = true;
      }
      if (!lastUpdatedAt || new Date(r.updatedAt).getTime() > new Date(lastUpdatedAt).getTime())
        lastUpdatedAt = new Date(r.updatedAt).toISOString();
      for (const [u, q] of Object.entries(readRowBreakdown(r, baseUnit))) {
        totalByUnit[u] = (totalByUnit[u] ?? 0) + q;
      }
    }

    const incoming = inboundByCode?.get(p.code)?.totalBase ?? 0;
    const availability = summarizeProductAvailability(p, matching, { incoming });

    const forecasted = totalOnHand + incoming - availability.totalReserved;
    const secondaryStatus = deriveSecondaryStatus(
      totalOnHand,
      forecasted,
      p.extra?.minimumInventory?.value,
    );
    return {
      id: p.id,
      product: p,
      rows: matching,
      totalOnHand,
      totalByUnit,
      totalReserved: availability.totalReserved,
      reservedByUnit: availability.reservedByUnit,
      totalAvailable: availability.totalAvailable,
      totalBeginOfPeriod,
      hasBeginOfPeriod,
      secondaryStatus,
      lastUpdatedAt,
    };
  });
}
