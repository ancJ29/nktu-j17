

import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import type { ProductInventoryExtra, ProductInventoryRow } from '@/types/product-inventory';
import type { Product } from '@/types/product';
import type { InventoryLinkageSnapshotEntry, SalesOrder, SalesOrderItem } from '@/types';
import { DEFAULT_LOCATION_CODE, isDefaultLocation } from '@/types/location';
import {
  applyDelta,
  applyRelease,
  applyReserve,
  applyShip,
  type OnHandByUnit,
  readRowBreakdown,
  readRowReserved,
  recomputeOnHand,
} from './inventoryMath';
import { getItemBaseUnit } from './unitConversion';
import { getOwnReservedAtLocation, getProductLocationAvailability } from './inventoryCommitment';
import { groupLinesBySet, isProductSet, isNoInventoryProduct } from './productSet';
import { getLinePhysicalQuantity } from './salesOrderItemQuantity';

export type ReservationAction = 'reserve' | 'release' | 'ship' | 'reserve-adjust' | 'unship';

export type PlannedOp = {
  readonly rowId: string;
  readonly itemCode: string;
  readonly locationCode: string;
  readonly action: ReservationAction;
  readonly deltas: OnHandByUnit;
  readonly description: string;
  readonly snapshotVersion: string;
  readonly forwardPatch: ReservationPatch;
  readonly rollbackPatch: ReservationPatch;
};

export type ReservationPatch = {
  onHand: number;
  extra: ProductInventoryExtra;
};

export type ReservationPlan = {
  readonly action: ReservationAction;
  readonly ops: readonly PlannedOp[];
  readonly skippedLines: readonly { productCode: string; reason: string }[];
};

export type PlanFailure =
  | {
      kind: 'no-row-at-location';
      productCode: string;
      productName: string;
      locationCode: string;
    }
  | { kind: 'unknown-product'; productCode: string }
  | { kind: 'unknown-unit'; productCode: string; unit: string }
  | {
      kind: 'reservation-mismatch';
      productCode: string;
      locationCode: string;
      requested: number;
      reserved: number;
    }
  | {
      kind: 'shortage';
      productCode: string;
      locationCode: string;
      requested: number;
      available: number;
    }
  | { kind: 'release-overflow'; productCode: string; locationCode: string }
  | { kind: 'unsupported-transition'; from: string; to: string }
  /**
   * `planReservationDiff` only: the row's existing `reservedByUnit` for a
   * given unit is less than the amount the diff is trying to release. This
   * means the snapshot disagrees with the row — either another writer
   * adjusted the row outside the SO orchestrator, or the snapshot was
   * built from stale data. Fixing requires reconciling the row by hand.
   */
  | {
      kind: 'diff-underflow';
      productCode: string;
      locationCode: string;
      unit: string;
      currentReserved: number;
      requestedRelease: number;
    };

export type PlanResult =
  | { ok: true; plan: ReservationPlan }
  | { ok: false; failures: PlanFailure[]; partial?: ReservationPlan };

export type AppliedOp = {
  readonly rowId: string;
  readonly rollbackPatch: ReservationPatch;
  readonly resultingVersion: string;
  readonly itemCode: string;
  readonly locationCode: string;
  readonly action: ReservationAction;
  readonly prevOnHand: number;
  readonly nextOnHand: number;
};

export type ExecutionResult =
  | { ok: true; appliedCount: number; applied: readonly AppliedOp[] }
  | {
      ok: false;
      failedAt: number;
      rollbackOk: boolean;
      error: Error;
      orphanedRowIds: readonly string[];
    };

type PlanInputs = {
  readonly action: ReservationAction;
  readonly so: SalesOrder;
  readonly productsByCode: Map<string, Product>;
  readonly inventoryByProduct: Map<string, ProductInventoryRow[]>;
};

function stripSetFields(line: SalesOrderItem): SalesOrderItem {
  const { groupId: _g, role: _r, sourceSetCode: _s, ...rest } = line;
  return rest;
}

export function expandSetReservationItems(
  items: readonly SalesOrderItem[],
  productsByCode: Map<string, Product>,
  inventoryByProduct: Map<string, ProductInventoryRow[]>,
  ownReservedSnapshot?: readonly InventoryLinkageSnapshotEntry[],
): SalesOrderItem[] {
  const out: SalesOrderItem[] = [];
  for (const group of groupLinesBySet(items)) {
    if (group.groupId === null) {
      out.push(...group.lines); 
      continue;
    }
    const parent = group.lines.find((l) => l.role === 'set');
    if (!parent) {
      out.push(...group.lines); 
      continue;
    }
    
    for (const l of group.lines) {
      if (l.role !== 'set' && l.role !== 'set-component') out.push(l);
    }

    const setProduct = productsByCode.get(parent.productCode);
    const parentQty = parent.quantity;
    if (!setProduct || !isProductSet(setProduct) || parentQty <= 0) {
      out.push(stripSetFields(parent)); 
      continue;
    }

    const loc = parent.fromLocationCode || DEFAULT_LOCATION_CODE;
    const base = getProductLocationAvailability(setProduct, loc, inventoryByProduct);
    const ownBack = getOwnReservedAtLocation(setProduct, loc, ownReservedSnapshot);
    const setAvailable = base.available + ownBack;

    const setReserveQty = Math.max(0, Math.min(parentQty, setAvailable));
    const parentShort = parentQty - setReserveQty;

    if (setReserveQty > 0) {
      out.push(stripSetFields({ ...parent, quantity: setReserveQty }));
    }
    if (parentShort > 0) {
      for (const child of group.lines) {
        if (child.role !== 'set-component') continue;
        const componentQty = (child.quantity / parentQty) * parentShort;
        if (componentQty > 0) out.push(stripSetFields({ ...child, quantity: componentQty }));
      }
    }
  }
  return out;
}

export function planReservation(inputs: PlanInputs): PlanResult {
  const { action, so, productsByCode, inventoryByProduct } = inputs;
  const failures: PlanFailure[] = [];
  const skipped: { productCode: string; reason: string }[] = [];

  type Bucket = {
    rowId: string;
    row: ProductInventoryRow;
    product: Product;
    locationCode: string;
    deltas: OnHandByUnit;
    lineCount: number;
  };
  const buckets = new Map<string, Bucket>();

  
  
  
  
  
  const reservationLines =
    action === 'reserve'
      ? expandSetReservationItems(so.items, productsByCode, inventoryByProduct)
      : so.items;

  for (const line of reservationLines) {
    if (!line.productCode || line.quantity <= 0) continue;
    
    
    
    
    if (line.role === 'set-component') continue;
    const product = productsByCode.get(line.productCode);
    if (!product) {
      failures.push({ kind: 'unknown-product', productCode: line.productCode });
      continue;
    }
    
    
    if (isNoInventoryProduct(product)) {
      skipped.push({
        productCode: line.productCode,
        reason: 'Product is not inventory-managed',
      });
      continue;
    }
    const rows = inventoryByProduct.get(line.productCode) ?? [];
    if (rows.length === 0) {
      skipped.push({
        productCode: line.productCode,
        reason: 'No inventory rows tracked for this product (drop-ship?)',
      });
      continue;
    }
    const target = line.fromLocationCode || DEFAULT_LOCATION_CODE;
    const row = rows.find(
      (r) =>
        r.locationCode === target ||
        (isDefaultLocation(r.locationCode) && isDefaultLocation(target)),
    );
    if (!row) {
      failures.push({
        kind: 'no-row-at-location',
        productCode: line.productCode,
        productName: line.productName,
        locationCode: target,
      });
      continue;
    }
    const allowedUnits = new Set(product.extra?.units ?? [product.unit]);
    if (!allowedUnits.has(line.unit)) {
      failures.push({ kind: 'unknown-unit', productCode: line.productCode, unit: line.unit });
      continue;
    }
    
    
    
    const physicalQty = getLinePhysicalQuantity(line);
    const existing = buckets.get(row.id);
    if (existing) {
      existing.deltas[line.unit] = (existing.deltas[line.unit] ?? 0) + physicalQty;
      existing.lineCount += 1;
    } else {
      buckets.set(row.id, {
        rowId: row.id,
        row,
        product,
        locationCode: row.locationCode,
        deltas: { [line.unit]: physicalQty },
        lineCount: 1,
      });
    }
  }

  if (failures.length > 0) return { ok: false, failures };

  const ops: PlannedOp[] = [];

  for (const b of buckets.values()) {
    const baseUnit = getItemBaseUnit(b.product);
    const currentOnHandByUnit = readRowBreakdown(b.row, baseUnit);
    const currentReservedByUnit = readRowReserved(b.row);
    const currentOnHand = b.row.onHand;
    const description = describeOp(action, b.deltas, b.locationCode, b.product, so);

    const rollbackExtra: ProductInventoryExtra = {
      ...(b.row.extra ?? {}),
      onHandByUnit: currentOnHandByUnit,
      reservedByUnit: currentReservedByUnit,
    };
    const rollbackPatch: ReservationPatch = {
      onHand: currentOnHand,
      extra: rollbackExtra,
    };

    let forwardPatch: ReservationPatch;

    const nextOrderMap = nextReservedBySalesOrder(
      b.row.extra?.reservedBySalesOrder,
      so,
      action,
      b.deltas,
    );

    if (action === 'reserve') {
      const result = applyReserve(b.product, currentReservedByUnit, b.deltas);
      if (!result.ok) {
        failures.push({ kind: 'unknown-unit', productCode: b.product.code, unit: 'unknown' });
        continue;
      }
      forwardPatch = {
        onHand: currentOnHand,
        extra: {
          ...(b.row.extra ?? {}),
          onHandByUnit: currentOnHandByUnit,
          reservedByUnit: result.reservedByUnit,
          reservedBySalesOrder: nextOrderMap,
        },
      };
    } else if (action === 'release') {
      const result = applyRelease(b.product, currentReservedByUnit, b.deltas);
      if (!result.ok) {
        failures.push({
          kind: 'release-overflow',
          productCode: b.product.code,
          locationCode: b.locationCode,
        });
        continue;
      }
      forwardPatch = {
        onHand: currentOnHand,
        extra: {
          ...(b.row.extra ?? {}),
          onHandByUnit: currentOnHandByUnit,
          reservedByUnit: result.reservedByUnit,
          reservedBySalesOrder: nextOrderMap,
        },
      };
    } else {
      
      const result = applyShip(
        b.product,
        { onHandByUnit: currentOnHandByUnit, reservedByUnit: currentReservedByUnit },
        b.deltas,
      );
      if (!result.ok) {
        if (result.reason === 'reservation-mismatch') {
          const requestedTotal = recomputeOnHand(b.product, b.deltas);
          failures.push({
            kind: 'reservation-mismatch',
            productCode: b.product.code,
            locationCode: b.locationCode,
            requested: requestedTotal,
            reserved: recomputeOnHand(b.product, currentReservedByUnit),
          });
          continue;
        }
        failures.push({ kind: 'unknown-unit', productCode: b.product.code, unit: 'unknown' });
        continue;
      }
      forwardPatch = {
        onHand: result.onHand,
        extra: {
          ...(b.row.extra ?? {}),
          onHandByUnit: result.onHandByUnit,
          reservedByUnit: result.reservedByUnit,
          reservedBySalesOrder: nextOrderMap,
        },
      };
    }

    ops.push({
      rowId: b.rowId,
      itemCode: b.row.itemCode,
      locationCode: b.row.locationCode,
      action,
      deltas: b.deltas,
      description,
      snapshotVersion: b.row.version,
      forwardPatch,
      rollbackPatch,
    });
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }
  return { ok: true, plan: { action, ops, skippedLines: skipped } };
}

function nextReservedBySalesOrder(
  current: ProductInventoryExtra['reservedBySalesOrder'] | undefined,
  so: SalesOrder,
  action: ReservationAction,
  deltas: OnHandByUnit,
): ProductInventoryExtra['reservedBySalesOrder'] | undefined {
  const next = { ...(current ?? {}) };
  if (action === 'reserve') {
    const byUnit: OnHandByUnit = {};
    for (const [u, q] of Object.entries(deltas)) if (q > 0) byUnit[u] = q;
    next[so.id] = { orderNumber: so.orderNumber, byUnit };
  } else {
    delete next[so.id];
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function describeOp(
  action: ReservationAction,
  deltas: OnHandByUnit,
  locationCode: string,
  product: Product,
  so: SalesOrder,
): string {
  const parts = Object.entries(deltas)
    .filter(([, q]) => q > 0)
    .map(([u, q]) => `${q.toLocaleString()} ${u}`);
  const verb =
    action === 'reserve'
      ? 'Reserve'
      : action === 'release'
        ? 'Release'
        : action === 'unship'
          ? 'Un-ship'
          : 'Ship';
  const loc = isDefaultLocation(locationCode) ? 'default' : locationCode;
  return `${verb} ${parts.join(' + ')} of ${product.code} from ${loc} for ${so.orderNumber}`;
}

export function buildLinkageSnapshotFromReserveOps(
  ops: readonly PlannedOp[],
): InventoryLinkageSnapshotEntry[] {
  const out: InventoryLinkageSnapshotEntry[] = [];
  for (const op of ops) {
    if (op.action !== 'reserve') continue;
    const byUnit: Record<string, number> = {};
    for (const [u, q] of Object.entries(op.deltas)) if (q > 0) byUnit[u] = q;
    if (Object.keys(byUnit).length === 0) continue;
    out.push({
      rowId: op.rowId,
      itemCode: op.itemCode,
      locationCode: op.locationCode,
      byUnit,
    });
  }
  return out;
}

type ReleaseFromSnapshotInputs = {
  readonly snapshot: readonly InventoryLinkageSnapshotEntry[];
  readonly so: SalesOrder;
  readonly productsByCode: Map<string, Product>;
  readonly inventoryByProduct: Map<string, ProductInventoryRow[]>;
};

export function planReleaseFromLinkage(inputs: ReleaseFromSnapshotInputs): PlanResult {
  const { snapshot, so, productsByCode, inventoryByProduct } = inputs;
  const failures: PlanFailure[] = [];
  const ops: PlannedOp[] = [];

  for (const entry of snapshot) {
    const product = productsByCode.get(entry.itemCode);
    if (!product) {
      failures.push({ kind: 'unknown-product', productCode: entry.itemCode });
      continue;
    }
    const rows = inventoryByProduct.get(entry.itemCode) ?? [];
    const row =
      rows.find((r) => r.id === entry.rowId) ??
      rows.find(
        (r) =>
          r.locationCode === entry.locationCode ||
          (isDefaultLocation(r.locationCode) && isDefaultLocation(entry.locationCode)),
      );
    if (!row) {
      failures.push({
        kind: 'no-row-at-location',
        productCode: entry.itemCode,
        productName: product.name,
        locationCode: entry.locationCode,
      });
      continue;
    }

    const baseUnit = getItemBaseUnit(product);
    const currentOnHandByUnit = readRowBreakdown(row, baseUnit);
    const currentReservedByUnit = readRowReserved(row);

    const deltas: OnHandByUnit = {};
    for (const [u, q] of Object.entries(entry.byUnit)) if (q > 0) deltas[u] = q;
    if (Object.keys(deltas).length === 0) continue;

    const result = applyRelease(product, currentReservedByUnit, deltas);
    if (!result.ok) {
      failures.push({
        kind: 'release-overflow',
        productCode: product.code,
        locationCode: row.locationCode,
      });
      continue;
    }

    const description = describeOp('release', deltas, row.locationCode, product, so);
    const rollbackPatch: ReservationPatch = {
      onHand: row.onHand,
      extra: {
        ...(row.extra ?? {}),
        onHandByUnit: currentOnHandByUnit,
        reservedByUnit: currentReservedByUnit,
      },
    };
    const forwardPatch: ReservationPatch = {
      onHand: row.onHand,
      extra: {
        ...(row.extra ?? {}),
        onHandByUnit: currentOnHandByUnit,
        reservedByUnit: result.reservedByUnit,
        reservedBySalesOrder: nextReservedBySalesOrder(
          row.extra?.reservedBySalesOrder,
          so,
          'release',
          deltas,
        ),
      },
    };

    ops.push({
      rowId: row.id,
      itemCode: row.itemCode,
      locationCode: row.locationCode,
      action: 'release',
      deltas,
      description,
      snapshotVersion: row.version,
      forwardPatch,
      rollbackPatch,
    });
  }

  if (failures.length > 0) return { ok: false, failures };
  return { ok: true, plan: { action: 'release', ops, skippedLines: [] } };
}

export function planShipFromLinkage(inputs: ReleaseFromSnapshotInputs): PlanResult {
  const { snapshot, so, productsByCode, inventoryByProduct } = inputs;
  const failures: PlanFailure[] = [];
  const ops: PlannedOp[] = [];

  for (const entry of snapshot) {
    const product = productsByCode.get(entry.itemCode);
    if (!product) {
      failures.push({ kind: 'unknown-product', productCode: entry.itemCode });
      continue;
    }
    const rows = inventoryByProduct.get(entry.itemCode) ?? [];
    const row =
      rows.find((r) => r.id === entry.rowId) ??
      rows.find(
        (r) =>
          r.locationCode === entry.locationCode ||
          (isDefaultLocation(r.locationCode) && isDefaultLocation(entry.locationCode)),
      );
    if (!row) {
      failures.push({
        kind: 'no-row-at-location',
        productCode: entry.itemCode,
        productName: product.name,
        locationCode: entry.locationCode,
      });
      continue;
    }

    const baseUnit = getItemBaseUnit(product);
    const currentOnHandByUnit = readRowBreakdown(row, baseUnit);
    const currentReservedByUnit = readRowReserved(row);

    const deltas: OnHandByUnit = {};
    for (const [u, q] of Object.entries(entry.byUnit)) if (q > 0) deltas[u] = q;
    if (Object.keys(deltas).length === 0) continue;

    const result = applyShip(
      product,
      { onHandByUnit: currentOnHandByUnit, reservedByUnit: currentReservedByUnit },
      deltas,
    );
    if (!result.ok) {
      
      
      
      if (result.reason === 'reservation-mismatch') {
        failures.push({
          kind: 'reservation-mismatch',
          productCode: product.code,
          locationCode: row.locationCode,
          requested: recomputeOnHand(product, deltas),
          reserved: recomputeOnHand(product, currentReservedByUnit),
        });
      } else {
        
        
        
        failures.push({ kind: 'unknown-unit', productCode: product.code, unit: result.unit });
      }
      continue;
    }

    const description = describeOp('ship', deltas, row.locationCode, product, so);
    const rollbackPatch: ReservationPatch = {
      onHand: row.onHand,
      extra: {
        ...(row.extra ?? {}),
        onHandByUnit: currentOnHandByUnit,
        reservedByUnit: currentReservedByUnit,
      },
    };
    const forwardPatch: ReservationPatch = {
      onHand: result.onHand,
      extra: {
        ...(row.extra ?? {}),
        onHandByUnit: result.onHandByUnit,
        reservedByUnit: result.reservedByUnit,
        reservedBySalesOrder: nextReservedBySalesOrder(
          row.extra?.reservedBySalesOrder,
          so,
          'ship',
          deltas,
        ),
      },
    };

    ops.push({
      rowId: row.id,
      itemCode: row.itemCode,
      locationCode: row.locationCode,
      action: 'ship',
      deltas,
      description,
      snapshotVersion: row.version,
      forwardPatch,
      rollbackPatch,
    });
  }

  if (failures.length > 0) return { ok: false, failures };
  return { ok: true, plan: { action: 'ship', ops, skippedLines: [] } };
}

export function planUnshipFromLinkage(inputs: ReleaseFromSnapshotInputs): PlanResult {
  const { snapshot, so, productsByCode, inventoryByProduct } = inputs;
  const failures: PlanFailure[] = [];
  const ops: PlannedOp[] = [];

  for (const entry of snapshot) {
    const product = productsByCode.get(entry.itemCode);
    if (!product) {
      failures.push({ kind: 'unknown-product', productCode: entry.itemCode });
      continue;
    }
    const rows = inventoryByProduct.get(entry.itemCode) ?? [];
    const row =
      rows.find((r) => r.id === entry.rowId) ??
      rows.find(
        (r) =>
          r.locationCode === entry.locationCode ||
          (isDefaultLocation(r.locationCode) && isDefaultLocation(entry.locationCode)),
      );
    if (!row) {
      failures.push({
        kind: 'no-row-at-location',
        productCode: entry.itemCode,
        productName: product.name,
        locationCode: entry.locationCode,
      });
      continue;
    }

    const baseUnit = getItemBaseUnit(product);
    const currentOnHandByUnit = readRowBreakdown(row, baseUnit);
    const currentReservedByUnit = readRowReserved(row);

    const deltas: OnHandByUnit = {};
    for (const [u, q] of Object.entries(entry.byUnit)) if (q > 0) deltas[u] = q;
    if (Object.keys(deltas).length === 0) continue;

    
    const result = applyDelta(product, currentOnHandByUnit, deltas);
    if (!result.ok) {
      failures.push({ kind: 'unknown-unit', productCode: product.code, unit: result.unit });
      continue;
    }

    const description = describeOp('unship', deltas, row.locationCode, product, so);
    const rollbackPatch: ReservationPatch = {
      onHand: row.onHand,
      extra: {
        ...(row.extra ?? {}),
        onHandByUnit: currentOnHandByUnit,
        reservedByUnit: currentReservedByUnit,
      },
    };
    const forwardPatch: ReservationPatch = {
      onHand: result.onHand,
      extra: {
        ...(row.extra ?? {}),
        onHandByUnit: result.onHandByUnit,
        reservedByUnit: currentReservedByUnit,
        reservedBySalesOrder: nextReservedBySalesOrder(
          row.extra?.reservedBySalesOrder,
          so,
          'unship',
          deltas,
        ),
      },
    };

    ops.push({
      rowId: row.id,
      itemCode: row.itemCode,
      locationCode: row.locationCode,
      action: 'unship',
      deltas,
      description,
      snapshotVersion: row.version,
      forwardPatch,
      rollbackPatch,
    });
  }

  if (failures.length > 0) return { ok: false, failures };
  return { ok: true, plan: { action: 'unship', ops, skippedLines: [] } };
}

export async function executeReservationPlan(ops: readonly PlannedOp[]): Promise<ExecutionResult> {
  const applied: AppliedOp[] = [];
  const store = useProductInventoryStore;

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    try {
      const updated = await store.getState().updateSafely({
        id: op.rowId,
        version: op.snapshotVersion,
        patch: op.forwardPatch,
      });
      applied.push({
        rowId: op.rowId,
        rollbackPatch: op.rollbackPatch,
        resultingVersion: updated.version,
        itemCode: op.itemCode,
        locationCode: op.locationCode,
        action: op.action,
        prevOnHand: op.rollbackPatch.onHand,
        nextOnHand: op.forwardPatch.onHand,
      });
    } catch (err) {
      const { rollbackOk, orphanedRowIds } = await rollbackAppliedOps(applied);
      return {
        ok: false,
        failedAt: i,
        rollbackOk,
        error: err instanceof Error ? err : new Error(String(err)),
        orphanedRowIds,
      };
    }
  }

  return { ok: true, appliedCount: applied.length, applied };
}

export async function rollbackAppliedOps(
  applied: readonly AppliedOp[],
): Promise<{ rollbackOk: boolean; orphanedRowIds: readonly string[] }> {
  const store = useProductInventoryStore;
  const orphaned: string[] = [];
  let rollbackOk = true;
  for (let j = applied.length - 1; j >= 0; j--) {
    const a = applied[j];
    try {
      await store.getState().updateSafely({
        id: a.rowId,
        version: a.resultingVersion,
        patch: a.rollbackPatch,
      });
    } catch (rerr) {
      rollbackOk = false;
      orphaned.push(a.rowId);
      console.error(
        '[inventoryReservation] rollback failed for row',
        a.rowId,
        '— manual reconciliation required:',
        rerr,
      );
    }
  }
  return { rollbackOk, orphanedRowIds: orphaned };
}

export type BuildDesiredSnapshotResult =
  | {
      ok: true;
      snapshot: InventoryLinkageSnapshotEntry[];
      skippedLines: readonly { productCode: string; reason: string }[];
    }
  | { ok: false; failures: PlanFailure[] };

export function buildDesiredReservationSnapshot(inputs: {
  readonly items: readonly SalesOrderItem[];
  readonly productsByCode: Map<string, Product>;
  readonly inventoryByProduct: Map<string, ProductInventoryRow[]>;
  
  readonly ownReservedSnapshot?: readonly InventoryLinkageSnapshotEntry[];
}): BuildDesiredSnapshotResult {
  const { items, productsByCode, inventoryByProduct, ownReservedSnapshot } = inputs;
  const failures: PlanFailure[] = [];
  const skipped: { productCode: string; reason: string }[] = [];

  
  
  const desiredLines = expandSetReservationItems(
    items,
    productsByCode,
    inventoryByProduct,
    ownReservedSnapshot,
  );

  
  
  
  const byRow = new Map<
    string,
    { rowId: string; itemCode: string; locationCode: string; byUnit: Record<string, number> }
  >();

  for (const line of desiredLines) {
    if (!line.productCode || line.quantity <= 0) continue;
    
    
    if (line.role === 'set-component') continue;
    const product = productsByCode.get(line.productCode);
    if (!product) {
      failures.push({ kind: 'unknown-product', productCode: line.productCode });
      continue;
    }
    
    
    if (isNoInventoryProduct(product)) {
      skipped.push({
        productCode: line.productCode,
        reason: 'Product is not inventory-managed',
      });
      continue;
    }
    const rows = inventoryByProduct.get(line.productCode) ?? [];
    if (rows.length === 0) {
      skipped.push({
        productCode: line.productCode,
        reason: 'No inventory rows tracked for this product (drop-ship?)',
      });
      continue;
    }
    const target = line.fromLocationCode || DEFAULT_LOCATION_CODE;
    const row = rows.find(
      (r) =>
        r.locationCode === target ||
        (isDefaultLocation(r.locationCode) && isDefaultLocation(target)),
    );
    if (!row) {
      failures.push({
        kind: 'no-row-at-location',
        productCode: line.productCode,
        productName: line.productName,
        locationCode: target,
      });
      continue;
    }
    const allowedUnits = new Set(product.extra?.units ?? [product.unit]);
    if (!allowedUnits.has(line.unit)) {
      failures.push({ kind: 'unknown-unit', productCode: line.productCode, unit: line.unit });
      continue;
    }
    
    
    const physicalQty = getLinePhysicalQuantity(line);
    const existing = byRow.get(row.id);
    if (existing) {
      existing.byUnit[line.unit] = (existing.byUnit[line.unit] ?? 0) + physicalQty;
    } else {
      byRow.set(row.id, {
        rowId: row.id,
        itemCode: row.itemCode,
        locationCode: row.locationCode,
        byUnit: { [line.unit]: physicalQty },
      });
    }
  }

  if (failures.length > 0) return { ok: false, failures };

  const snapshot: InventoryLinkageSnapshotEntry[] = [];
  for (const entry of byRow.values()) {
    
    
    const cleanByUnit: Record<string, number> = {};
    for (const [u, q] of Object.entries(entry.byUnit)) if (q > 0) cleanByUnit[u] = q;
    if (Object.keys(cleanByUnit).length === 0) continue;
    snapshot.push({
      rowId: entry.rowId,
      itemCode: entry.itemCode,
      locationCode: entry.locationCode,
      byUnit: cleanByUnit,
    });
  }

  return { ok: true, snapshot, skippedLines: skipped };
}

export type PlanReservationDiffInputs = {
  readonly oldSnapshot: readonly InventoryLinkageSnapshotEntry[];
  readonly newItems: readonly SalesOrderItem[];
  readonly so: SalesOrder;
  readonly productsByCode: Map<string, Product>;
  readonly inventoryByProduct: Map<string, ProductInventoryRow[]>;
};

export type PlanReservationDiffResult =
  | { ok: true; plan: ReservationPlan; newSnapshot: InventoryLinkageSnapshotEntry[] }
  | { ok: false; failures: PlanFailure[] };

export function planReservationDiff(inputs: PlanReservationDiffInputs): PlanReservationDiffResult {
  const { oldSnapshot, newItems, so, productsByCode, inventoryByProduct } = inputs;

  const desired = buildDesiredReservationSnapshot({
    items: newItems,
    productsByCode,
    inventoryByProduct,
    
    
    ownReservedSnapshot: oldSnapshot,
  });
  if (!desired.ok) return { ok: false, failures: [...desired.failures] };

  
  
  const oldByRow = new Map<string, InventoryLinkageSnapshotEntry>();
  for (const e of oldSnapshot) oldByRow.set(e.rowId, e);
  const newByRow = new Map<string, InventoryLinkageSnapshotEntry>();
  for (const e of desired.snapshot) newByRow.set(e.rowId, e);

  const allRowIds = new Set<string>([...oldByRow.keys(), ...newByRow.keys()]);
  const failures: PlanFailure[] = [];
  const ops: PlannedOp[] = [];

  for (const rowId of allRowIds) {
    const oldEntry = oldByRow.get(rowId);
    const newEntry = newByRow.get(rowId);
    
    
    const reference = newEntry ?? oldEntry!;
    const rows = inventoryByProduct.get(reference.itemCode) ?? [];
    const row =
      rows.find((r) => r.id === rowId) ??
      rows.find(
        (r) =>
          r.locationCode === reference.locationCode ||
          (isDefaultLocation(r.locationCode) && isDefaultLocation(reference.locationCode)),
      );
    if (!row) {
      failures.push({
        kind: 'no-row-at-location',
        productCode: reference.itemCode,
        productName: productsByCode.get(reference.itemCode)?.name ?? reference.itemCode,
        locationCode: reference.locationCode,
      });
      continue;
    }
    const product = productsByCode.get(row.itemCode);
    if (!product) {
      failures.push({ kind: 'unknown-product', productCode: row.itemCode });
      continue;
    }
    const baseUnit = getItemBaseUnit(product);
    const currentOnHandByUnit = readRowBreakdown(row, baseUnit);
    const currentReservedByUnit = readRowReserved(row);

    
    const unitSet = new Set<string>([
      ...Object.keys(oldEntry?.byUnit ?? {}),
      ...Object.keys(newEntry?.byUnit ?? {}),
    ]);

    
    
    
    
    const targetReservedByUnit: OnHandByUnit = { ...currentReservedByUnit };
    const signedDeltas: Record<string, number> = {};
    let underflowed = false;
    for (const unit of unitSet) {
      const oldQty = oldEntry?.byUnit?.[unit] ?? 0;
      const newQty = newEntry?.byUnit?.[unit] ?? 0;
      const delta = newQty - oldQty;
      if (delta === 0) continue;
      signedDeltas[unit] = delta;
      const currentForUnit = currentReservedByUnit[unit] ?? 0;
      const afterForUnit = currentForUnit + delta;
      if (afterForUnit < 0) {
        failures.push({
          kind: 'diff-underflow',
          productCode: row.itemCode,
          locationCode: row.locationCode,
          unit,
          currentReserved: currentForUnit,
          requestedRelease: -delta,
        });
        underflowed = true;
        continue;
      }
      if (afterForUnit === 0) {
        delete targetReservedByUnit[unit];
      } else {
        targetReservedByUnit[unit] = afterForUnit;
      }
    }
    if (underflowed) continue;
    if (Object.keys(signedDeltas).length === 0) continue; 

    
    
    
    const slotByUnit: Record<string, number> = {};
    if (newEntry)
      for (const [u, q] of Object.entries(newEntry.byUnit)) if (q > 0) slotByUnit[u] = q;
    const currentSlotMap = row.extra?.reservedBySalesOrder ?? {};
    const nextSlotMap = { ...currentSlotMap };
    if (Object.keys(slotByUnit).length > 0) {
      nextSlotMap[so.id] = { orderNumber: so.orderNumber, byUnit: slotByUnit };
    } else {
      delete nextSlotMap[so.id];
    }
    const nextReservedBySO = Object.keys(nextSlotMap).length > 0 ? nextSlotMap : undefined;

    const description = describeReservationDiffOp(signedDeltas, row.locationCode, product, so);
    const rollbackPatch: ReservationPatch = {
      onHand: row.onHand,
      extra: {
        ...(row.extra ?? {}),
        onHandByUnit: currentOnHandByUnit,
        reservedByUnit: currentReservedByUnit,
      },
    };
    const forwardPatch: ReservationPatch = {
      onHand: row.onHand,
      extra: {
        ...(row.extra ?? {}),
        onHandByUnit: currentOnHandByUnit,
        reservedByUnit: targetReservedByUnit,
        ...(nextReservedBySO !== undefined && { reservedBySalesOrder: nextReservedBySO }),
      },
    };
    
    
    
    
    if (nextReservedBySO === undefined && forwardPatch.extra.reservedBySalesOrder) {
      const cleaned = { ...forwardPatch.extra.reservedBySalesOrder };
      delete cleaned[so.id];
      if (Object.keys(cleaned).length === 0) {
        const { reservedBySalesOrder: _drop, ...rest } = forwardPatch.extra;
        forwardPatch.extra = rest as ProductInventoryExtra;
      } else {
        forwardPatch.extra.reservedBySalesOrder = cleaned;
      }
    }

    ops.push({
      rowId: row.id,
      itemCode: row.itemCode,
      locationCode: row.locationCode,
      action: 'reserve-adjust',
      
      
      deltas: signedDeltas as OnHandByUnit,
      description,
      snapshotVersion: row.version,
      forwardPatch,
      rollbackPatch,
    });
  }

  if (failures.length > 0) return { ok: false, failures };
  return {
    ok: true,
    plan: { action: 'reserve-adjust', ops, skippedLines: desired.skippedLines },
    newSnapshot: desired.snapshot,
  };
}

function describeReservationDiffOp(
  signedDeltas: Record<string, number>,
  locationCode: string,
  product: Product,
  so: SalesOrder,
): string {
  const reserveParts: string[] = [];
  const releaseParts: string[] = [];
  for (const [u, q] of Object.entries(signedDeltas)) {
    if (q > 0) reserveParts.push(`+${q.toLocaleString()} ${u}`);
    else if (q < 0) releaseParts.push(`-${(-q).toLocaleString()} ${u}`);
  }
  const both = [...reserveParts, ...releaseParts].join(' ');
  const loc = isDefaultLocation(locationCode) ? 'default' : locationCode;
  return `Adjust ${both} of ${product.code} at ${loc} for ${so.orderNumber}`;
}
