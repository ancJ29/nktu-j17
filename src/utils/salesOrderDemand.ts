/**
 * Open-order demand aggregation for available-to-promise on the SO item table.
 *
 * The item table's "Available" used to be `on-hand − committed reservations`,
 * which ignored open orders that hadn't reserved yet: three open SOs each
 * needing 10 of a 20-stock product all read "20 available, OK" because none had
 * reserved. This aggregates the competing demand from the order book so
 * availability reflects what's actually promisable.
 *
 * Demand = the **full ordered physical quantity** of every OPEN (not closed,
 * not cancelled, not soft-deleted) sales order, per (product, location), in
 * base units. Full ordered qty — not `ordered − delivered` — because this
 * system only deducts on-hand when an order *completes*, so an open order's
 * whole line is still an un-deducted claim on current on-hand (a partially
 * delivered line hasn't reduced on-hand either). Set-component child lines are
 * persisted on `items`, so they're aggregated against their component stock like
 * any other line.
 *
 * Scope note: the caller supplies whatever sales orders are loaded in the
 * store (the list-driven query window), so demand reflects that window. Open
 * orders older than the window aren't counted — acceptable for a daily-ops flow
 * where contention is between recent orders.
 */

import type { Product, SalesOrder, SalesOrderExtra } from '@/types';
import { DEFAULT_LOCATION_CODE, isDefaultLocation } from '@/types';
import { getLinePhysicalQuantity } from './salesOrderItemQuantity';
import { isNoInventoryProduct } from './productSet';
import { convertUnit, getItemBaseUnit } from './unitConversion';

/**
 * Bucket key for a (product, location) pair. Collapses every "default location"
 * sentinel into one bucket so it lines up with `getProductLocationAvailability`,
 * which treats the default sentinels as the same location.
 */
function demandKey(productCode: string, locationCode: string | undefined): string {
  const loc = locationCode || DEFAULT_LOCATION_CODE;
  return `${productCode}::${isDefaultLocation(loc) ? DEFAULT_LOCATION_CODE : loc}`;
}

/**
 * Sum open-order demand per (product, location), in base units. Pass
 * `excludeSalesOrderId` when computing availability *for* an order so it isn't
 * counted against itself — the remaining demand is then "what other open orders
 * still want", which is what its own lines compete against.
 */
export function buildOpenSalesOrderDemand(
  salesOrders: readonly SalesOrder[],
  productByCode: ReadonlyMap<string, Product>,
  opts?: { excludeSalesOrderId?: string },
): Map<string, number> {
  const demand = new Map<string, number>();
  for (const so of salesOrders) {
    if (opts?.excludeSalesOrderId && so.id === opts.excludeSalesOrderId) continue;
    if (so.isClosed) continue;
    const extra = so.extra as SalesOrderExtra | undefined;
    if (extra?.cancellation != null) continue;
    if (extra?.isDeleted) continue;
    for (const line of so.items) {
      if (!line.productCode || line.quantity <= 0) continue;
      const product = productByCode.get(line.productCode);
      if (!product || isNoInventoryProduct(product)) continue;
      const baseUnit = getItemBaseUnit(product);
      const inBase = convertUnit(
        getLinePhysicalQuantity(line),
        line.unit,
        baseUnit,
        product.extra?.unitConversions ?? [],
      );
      if (typeof inBase !== 'number' || inBase <= 0) continue;
      const key = demandKey(line.productCode, line.fromLocationCode);
      demand.set(key, (demand.get(key) ?? 0) + inBase);
    }
  }
  return demand;
}

/** Read the aggregated demand for a (product, location) from a built map. */
export function readOpenSalesOrderDemand(
  demand: ReadonlyMap<string, number>,
  productCode: string,
  locationCode: string | undefined,
): number {
  return demand.get(demandKey(productCode, locationCode)) ?? 0;
}
