import type { ProductInventoryRow } from '@/types/product-inventory';
import type { Product } from '@/types/product';
import type { InventoryLinkageSnapshotEntry } from '@/types/sales-order';
import { isDefaultLocation } from '@/types/location';
import { getItemBaseUnit } from './unitConversion';
import {
  type OnHandByUnit,
  readRowBreakdown,
  readRowReserved,
  recomputeOnHand,
  recomputeReserved,
} from './inventoryMath';

export type RowAvailability = {
  readonly row: ProductInventoryRow;
  readonly onHand: number;
  readonly reserved: number;

  readonly available: number;
  readonly onHandByUnit: OnHandByUnit;
  readonly reservedByUnit: OnHandByUnit;
};

export type LocationAvailability = {
  readonly locationCode: string;
  readonly onHand: number;
  readonly reserved: number;
  readonly available: number;
};

export type ProductAvailability = {
  readonly product: Product;
  readonly rows: RowAvailability[];
  readonly totalOnHand: number;
  readonly totalReserved: number;

  readonly totalIncoming: number;

  readonly totalAvailable: number;

  readonly reservedByUnit: OnHandByUnit;
  readonly perLocation: Map<string, LocationAvailability>;
};

export function getRowAvailability(row: ProductInventoryRow, product: Product): RowAvailability {
  const baseUnit = getItemBaseUnit(product);
  const onHandByUnit = readRowBreakdown(row, baseUnit);
  const reservedByUnit = readRowReserved(row);
  const onHand = recomputeOnHand(product, onHandByUnit);
  const reserved = recomputeReserved(product, reservedByUnit);
  return {
    row,
    onHand,
    reserved,
    available: onHand - reserved,
    onHandByUnit,
    reservedByUnit,
  };
}

export function summarizeProductAvailability(
  product: Product,
  rows: readonly ProductInventoryRow[],
  options: { readonly incoming?: number } = {},
): ProductAvailability {
  const perRow: RowAvailability[] = [];
  const perLocation = new Map<string, LocationAvailability>();
  const reservedByUnit: OnHandByUnit = {};
  let totalOnHand = 0;
  let totalReserved = 0;
  const totalIncoming = options.incoming ?? 0;
  for (const r of rows) {
    if (r.extra?.isDeleted) continue;
    const a = getRowAvailability(r, product);
    perRow.push(a);
    totalOnHand += a.onHand;
    totalReserved += a.reserved;
    for (const [u, q] of Object.entries(a.reservedByUnit)) {
      if (!q) continue;
      reservedByUnit[u] = (reservedByUnit[u] ?? 0) + q;
    }
    const existing = perLocation.get(r.locationCode);
    if (existing) {
      perLocation.set(r.locationCode, {
        locationCode: r.locationCode,
        onHand: existing.onHand + a.onHand,
        reserved: existing.reserved + a.reserved,
        available: existing.available + a.available,
      });
    } else {
      perLocation.set(r.locationCode, {
        locationCode: r.locationCode,
        onHand: a.onHand,
        reserved: a.reserved,
        available: a.available,
      });
    }
  }
  return {
    product,
    rows: perRow,
    totalOnHand,
    totalReserved,
    totalIncoming,
    totalAvailable: totalOnHand - totalReserved,
    reservedByUnit,
    perLocation,
  };
}

export function indexInventoryByProduct(
  rows: readonly ProductInventoryRow[],
): Map<string, ProductInventoryRow[]> {
  const out = new Map<string, ProductInventoryRow[]>();
  for (const r of rows) {
    if (r.extra?.isDeleted) continue;
    const bucket = out.get(r.itemCode);
    if (bucket) bucket.push(r);
    else out.set(r.itemCode, [r]);
  }
  return out;
}

export function getProductLocationAvailability(
  product: Product,
  locationCode: string,
  byProduct: Map<string, ProductInventoryRow[]>,
): LocationAvailability {
  const rows = byProduct.get(product.code) ?? [];
  const matching = rows.filter(
    (r) =>
      r.locationCode === locationCode ||
      (isDefaultLocation(r.locationCode) && isDefaultLocation(locationCode)),
  );
  const summary = summarizeProductAvailability(product, matching);
  return {
    locationCode,
    onHand: summary.totalOnHand,
    reserved: summary.totalReserved,
    available: summary.totalAvailable,
  };
}

export function getOwnReservedAtLocation(
  product: Product,
  locationCode: string,
  snapshot: readonly InventoryLinkageSnapshotEntry[] | undefined,
): number {
  if (!snapshot || snapshot.length === 0) return 0;
  let total = 0;
  for (const entry of snapshot) {
    if (entry.itemCode !== product.code) continue;
    const sameLocation =
      entry.locationCode === locationCode ||
      (isDefaultLocation(entry.locationCode) && isDefaultLocation(locationCode));
    if (!sameLocation) continue;
    total += recomputeOnHand(product, entry.byUnit);
  }
  return total;
}

export function getUnitAvailabilityAtLocation(
  product: Product,
  locationCode: string,
  unit: string,
  inventoryByProduct: Map<string, ProductInventoryRow[]>,
  snapshot: readonly InventoryLinkageSnapshotEntry[] | undefined,
): number | null {
  const rows = inventoryByProduct.get(product.code) ?? [];
  const row = rows.find(
    (r) =>
      r.locationCode === locationCode ||
      (isDefaultLocation(r.locationCode) && isDefaultLocation(locationCode)),
  );
  if (!row) return null;
  const baseUnit = getItemBaseUnit(product);
  const onHand = readRowBreakdown(row, baseUnit)[unit] ?? 0;
  const reserved = readRowReserved(row)[unit] ?? 0;
  let own = 0;
  if (snapshot) {
    for (const entry of snapshot) {
      if (entry.itemCode !== product.code) continue;
      const sameLocation =
        entry.locationCode === locationCode ||
        (isDefaultLocation(entry.locationCode) && isDefaultLocation(locationCode));
      if (!sameLocation) continue;
      own += entry.byUnit[unit] ?? 0;
    }
  }
  return onHand - reserved + own;
}

export function getSequentialAvailability(
  product: Product,
  locationCode: string,
  byProduct: Map<string, ProductInventoryRow[]>,
  options: { readonly orderNumber?: string; readonly incoming?: number } = {},
): number {
  const rows = (byProduct.get(product.code) ?? []).filter(
    (r) =>
      !r.extra?.isDeleted &&
      (r.locationCode === locationCode ||
        (isDefaultLocation(r.locationCode) && isDefaultLocation(locationCode))),
  );
  const baseUnit = getItemBaseUnit(product);
  let onHand = 0;

  const heldByOrder = new Map<string, { orderNumber: string; qty: number }>();
  for (const row of rows) {
    onHand += recomputeOnHand(product, readRowBreakdown(row, baseUnit));
    for (const [salesOrderId, entry] of Object.entries(row.extra?.reservedBySalesOrder ?? {})) {
      // // @ts-ignore
      const qty = recomputeOnHand(product, entry.byUnit);
      if (!qty) continue;
      const prev = heldByOrder.get(salesOrderId);
      heldByOrder.set(salesOrderId, {
        // @ts-ignore
        orderNumber: entry.orderNumber,
        qty: (prev?.qty ?? 0) + qty,
      });
    }
  }

  const current = options.orderNumber;
  let ahead = 0;
  for (const held of heldByOrder.values()) {
    if (current == null || held.orderNumber.localeCompare(current) < 0) ahead += held.qty;
  }
  return onHand + (options.incoming ?? 0) - ahead;
}
