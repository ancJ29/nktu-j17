

import type {
  DeliveryRequest,
  Product,
  ProductInventoryRow,
  SalesOrder,
  SalesOrderExtra,
} from '@/types';
import type { Stage } from './capabilities/types';
import { isDefaultLocation } from '@/types/location';
import { isNoInventoryProduct } from '@/utils/productSet';
import { isFullyDelivered, type CompletionEvidence } from './reconcileFromDeliveries';

const HOLD_TOLERANCE = 1e-6;

export type ReservationDriftLine = {
  itemCode: string;
  locationCode: string;
  unit: string;
  
  snapshotQty: number;
  
  rowHoldQty: number;
  kind: 'row-missing' | 'hold-missing' | 'hold-mismatch';
};

export type OrphanedHoldLine = {
  itemCode: string;
  locationCode: string;
  unit: string;
  rowHoldQty: number;
};

export type SoDeliveryIssue =
  
  | { kind: 'so-behind-deliveries'; blockedByMatrix: boolean; closedDrCount: number }
  /**
   * The SO sits in a COMPLETED-stage status but on-hand was never deducted:
   * `'still-reserved'` — the reservation is still held (auto-ship never ran /
   * failed); `'no-deduction-recorded'` — no linkage at all (or released)
   * despite reservable lines. The latter can be innocent on records predating
   * the linkage system, which is why the repair is operator-confirmed.
   */
  | { kind: 'completed-not-deducted'; reason: 'still-reserved' | 'no-deduction-recorded' }
  /**
   * The SO's frozen `reservedSnapshot` no longer matches the rows'
   * `reservedBySalesOrder[soId]` holds — the state that later fails auto-ship
   * with `reservation-mismatch` and blocks completion.
   */
  | { kind: 'reservation-drift'; lines: ReservationDriftLine[] }
  /**
   * Rows still hold stock for this SO although its linkage is not `reserved`
   * (shipped / released / none) — stranded holds that depress availability.
   */
  | { kind: 'orphaned-holds'; lines: OrphanedHoldLine[] };

function hasReservableLines(so: SalesOrder, productsByCode: ReadonlyMap<string, Product>): boolean {
  return so.items.some((line) => {
    if (line.role === 'set-component') return false;
    if (!(line.quantity > 0)) return false;
    const product = productsByCode.get(line.productCode);
    return product != null && !isNoInventoryProduct(product);
  });
}

function deriveDriftLines(
  so: SalesOrder,
  inventoryRows: readonly ProductInventoryRow[],
): ReservationDriftLine[] {
  const snapshot = (so.extra as SalesOrderExtra).inventoryLinkage?.reservedSnapshot ?? [];
  const rowsById = new Map(inventoryRows.map((r) => [r.id, r]));
  const rowsByItem = new Map<string, ProductInventoryRow[]>();
  for (const r of inventoryRows) {
    const list = rowsByItem.get(r.itemCode) ?? [];
    list.push(r);
    rowsByItem.set(r.itemCode, list);
  }

  const lines: ReservationDriftLine[] = [];
  for (const entry of snapshot) {
    
    
    const row =
      rowsById.get(entry.rowId) ??
      (rowsByItem.get(entry.itemCode) ?? []).find(
        (r) =>
          r.locationCode === entry.locationCode ||
          (isDefaultLocation(r.locationCode) && isDefaultLocation(entry.locationCode)),
      );
    if (!row) {
      for (const [unit, qty] of Object.entries(entry.byUnit)) {
        if (qty > HOLD_TOLERANCE) {
          lines.push({
            itemCode: entry.itemCode,
            locationCode: entry.locationCode,
            unit,
            snapshotQty: qty,
            rowHoldQty: 0,
            kind: 'row-missing',
          });
        }
      }
      continue;
    }
    const hold = row.extra?.reservedBySalesOrder?.[so.id]?.byUnit;
    const units = new Set([...Object.keys(entry.byUnit), ...Object.keys(hold ?? {})]);
    for (const unit of units) {
      const snapshotQty = entry.byUnit[unit] ?? 0;
      const rowHoldQty = hold?.[unit] ?? 0;
      if (Math.abs(snapshotQty - rowHoldQty) > HOLD_TOLERANCE) {
        lines.push({
          itemCode: entry.itemCode,
          locationCode: row.locationCode,
          unit,
          snapshotQty,
          rowHoldQty,
          kind: hold == null ? 'hold-missing' : 'hold-mismatch',
        });
      }
    }
  }
  return lines;
}

function deriveOrphanedHolds(
  soId: string,
  inventoryRows: readonly ProductInventoryRow[],
): OrphanedHoldLine[] {
  const lines: OrphanedHoldLine[] = [];
  for (const r of inventoryRows) {
    const hold = r.extra?.reservedBySalesOrder?.[soId]?.byUnit;
    if (!hold) continue;
    for (const [unit, qty] of Object.entries(hold)) {
      if (qty > HOLD_TOLERANCE) {
        lines.push({ itemCode: r.itemCode, locationCode: r.locationCode, unit, rowHoldQty: qty });
      }
    }
  }
  return lines;
}

export function deriveSoDeliveryIssues(params: {
  so: SalesOrder;
  
  liveDrsForSo: readonly DeliveryRequest[];
  evidence: CompletionEvidence;
  
  currentStage: Stage | undefined;
  
  completionReachable: boolean;
  inventoryRows: readonly ProductInventoryRow[];
  productsByCode: ReadonlyMap<string, Product>;
  
  inventoryEnabled: boolean;
}): SoDeliveryIssue[] {
  const { so, liveDrsForSo, evidence, currentStage, completionReachable } = params;
  const extra = (so.extra ?? {}) as SalesOrderExtra;
  if (extra.isDeleted || extra.cancellation != null) return [];

  const issues: SoDeliveryIssue[] = [];
  const linkage = extra.inventoryLinkage;
  const reservedSnapshot = linkage?.state === 'reserved' ? (linkage.reservedSnapshot ?? []) : [];

  if (!so.isClosed && isFullyDelivered(so, liveDrsForSo, evidence)) {
    issues.push({
      kind: 'so-behind-deliveries',
      blockedByMatrix: !completionReachable,
      closedDrCount: liveDrsForSo.filter((d) => d.direction !== 'inbound' && d.isClosed).length,
    });
  }

  if (!params.inventoryEnabled) return issues;

  if (so.isClosed && currentStage === 'COMPLETED') {
    if (linkage?.state === 'reserved' && reservedSnapshot.length > 0) {
      issues.push({ kind: 'completed-not-deducted', reason: 'still-reserved' });
    } else if (
      (linkage == null || linkage.state === 'none' || linkage.state === 'released') &&
      hasReservableLines(so, params.productsByCode)
    ) {
      issues.push({ kind: 'completed-not-deducted', reason: 'no-deduction-recorded' });
    }
  }

  if (reservedSnapshot.length > 0) {
    const drift = deriveDriftLines(so, params.inventoryRows);
    if (drift.length > 0) issues.push({ kind: 'reservation-drift', lines: drift });
  }

  if (linkage?.state !== 'reserved') {
    const orphans = deriveOrphanedHolds(so.id, params.inventoryRows);
    if (orphans.length > 0) issues.push({ kind: 'orphaned-holds', lines: orphans });
  }

  return issues;
}
