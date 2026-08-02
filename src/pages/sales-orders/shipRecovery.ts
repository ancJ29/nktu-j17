import { notifications } from '@mantine/notifications';
import type { TFunction } from 'i18next';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import type {
  InventoryLinkageSnapshotEntry,
  Product,
  ProductInventoryRow,
  SalesOrder,
  SalesOrderExtra,
} from '@/types';
import { buildShippedLinkage } from '@/utils/inventoryLinkage';
import { emitInventoryActivityForApplied } from '@/utils/inventoryActivityEmit';
import { logActivity } from '@/utils/activityLogger';
import { indexInventoryByProduct } from '@/utils/inventoryCommitment';
import {
  executeReservationPlan,
  planShipFromLinkage,
  resolveSnapshotRow,
  type PlanFailure,
} from '@/utils/inventoryReservation';
import { formatPlanFailures } from './planFailures';

const HOLD_TOLERANCE = 1e-6;

export type AmbiguousShipLine = {
  itemCode: string;
  locationCode: string;
  unit?: string;
  expectedQty: number;
  rowHoldQty: number;
  reason: 'row-missing' | 'hold-drifted';
};

export type PendingShipVerdict =
  | { kind: 'none' }
  /** Rows still hold what the marker promised: the deduction is owed. */
  | { kind: 'owed'; owed: InventoryLinkageSnapshotEntry[]; alreadyAppliedCount: number }
  /** Every promised hold is gone: stock already moved, only the linkage lags. */
  | { kind: 'applied' }
  /**
   * A hold exists but doesn't match the promise — a manual release, a
   * set-rebalance, or a form edit moved it. Shipping "some of it" would be a
   * guess, so this goes to the confirmed-repair banner instead.
   */
  | { kind: 'ambiguous'; lines: AmbiguousShipLine[] };

export function classifyPendingShip(params: {
  so: SalesOrder;
  inventoryRows: readonly ProductInventoryRow[];
}): PendingShipVerdict {
  const { so, inventoryRows } = params;
  const pending = (so.extra as SalesOrderExtra | undefined)?.inventoryLinkage?.pendingShip;
  if (!pending || pending.snapshot.length === 0) return { kind: 'none' };

  const rowsByItem = new Map<string, ProductInventoryRow[]>();
  for (const r of inventoryRows) {
    const list = rowsByItem.get(r.itemCode) ?? [];
    list.push(r);
    rowsByItem.set(r.itemCode, list);
  }

  const owed: InventoryLinkageSnapshotEntry[] = [];
  const ambiguous: AmbiguousShipLine[] = [];
  let alreadyAppliedCount = 0;

  for (const entry of pending.snapshot) {
    const row = resolveSnapshotRow(rowsByItem.get(entry.itemCode) ?? [], entry);
    if (!row) {
      ambiguous.push({
        itemCode: entry.itemCode,
        locationCode: entry.locationCode,
        expectedQty: Object.values(entry.byUnit).reduce((a, b) => a + b, 0),
        rowHoldQty: 0,
        reason: 'row-missing',
      });
      continue;
    }

    const hold = row.extra?.reservedBySalesOrder?.[so.id]?.byUnit ?? {};
    let held = 0;
    let consumed = 0;
    for (const [unit, qty] of Object.entries(entry.byUnit)) {
      if (qty <= HOLD_TOLERANCE) continue;
      const rowHoldQty = hold[unit] ?? 0;
      if (Math.abs(rowHoldQty - qty) <= HOLD_TOLERANCE) {
        held++;
      } else if (rowHoldQty <= HOLD_TOLERANCE) {
        consumed++;
      } else {
        ambiguous.push({
          itemCode: entry.itemCode,
          locationCode: row.locationCode,
          unit,
          expectedQty: qty,
          rowHoldQty,
          reason: 'hold-drifted',
        });
      }
    }

    if (held > 0 && consumed > 0) {
      ambiguous.push({
        itemCode: entry.itemCode,
        locationCode: row.locationCode,
        expectedQty: Object.values(entry.byUnit).reduce((a, b) => a + b, 0),
        rowHoldQty: Object.values(hold).reduce((a, b) => a + b, 0),
        reason: 'hold-drifted',
      });
      continue;
    }
    if (held > 0) owed.push(entry);
    else if (consumed > 0) alreadyAppliedCount++;
  }

  if (ambiguous.length > 0) return { kind: 'ambiguous', lines: ambiguous };
  if (owed.length > 0) return { kind: 'owed', owed, alreadyAppliedCount };
  return { kind: 'applied' };
}

export type ShipRecoveryResult =
  | { kind: 'none' }
  /** Replayed the deduction for `rowCount` rows and cleared the marker. */
  | { kind: 'applied'; rowCount: number }
  /** Stock was already deducted; only the linkage bookkeeping was repaired. */
  | { kind: 'confirmed' }
  | { kind: 'ambiguous'; lines: AmbiguousShipLine[] }
  | { kind: 'failed'; failures?: PlanFailure[]; error?: Error };

export async function recoverPendingShip(params: {
  so: SalesOrder;
  actor: { id: string; name: string } | undefined;
  productsByCode: Map<string, Product>;
}): Promise<ShipRecoveryResult> {
  const { actor, productsByCode } = params;
  let so = params.so;
  const pending = (so.extra as SalesOrderExtra | undefined)?.inventoryLinkage?.pendingShip;
  if (!pending || pending.snapshot.length === 0) return { kind: 'none' };

  await useProductInventoryStore.getState().revalidate();
  const verdict = classifyPendingShip({
    so,
    inventoryRows: useProductInventoryStore.getState().items,
  });
  if (verdict.kind === 'none') return { kind: 'none' };
  if (verdict.kind === 'ambiguous') return { kind: 'ambiguous', lines: verdict.lines };

  let shippedRowCount = 0;
  if (verdict.kind === 'owed') {
    const plan = planShipFromLinkage({
      snapshot: verdict.owed,
      so,
      productsByCode,
      inventoryByProduct: indexInventoryByProduct(useProductInventoryStore.getState().items),
    });
    if (!plan.ok) return { kind: 'failed', failures: plan.failures };

    if (plan.plan.ops.length > 0) {
      const exec = await executeReservationPlan(plan.plan.ops);
      if (!exec.ok) {
        useProductInventoryStore.getState().forceRefresh();
        return { kind: 'failed', error: exec.error };
      }
      shippedRowCount = exec.applied.length;
      useProductInventoryStore.getState().forceRefresh();

      emitInventoryActivityForApplied(exec.applied, {
        kind: 'SO',
        id: so.id,
        label: so.orderNumber,
      });
    }
  }

  try {
    await patchShippedLinkage(so, actor);
  } catch (err) {
    if (err instanceof EntityConflictError && err.latest) {
      so = err.latest as SalesOrder;
      const stillPending = (so.extra as SalesOrderExtra | undefined)?.inventoryLinkage?.pendingShip;
      if (!stillPending) {
        return verdict.kind === 'owed'
          ? { kind: 'applied', rowCount: shippedRowCount }
          : { kind: 'confirmed' };
      }
      try {
        await patchShippedLinkage(so, actor);
      } catch (retryErr) {
        return { kind: 'failed', error: toError(retryErr) };
      }
    } else {
      return { kind: 'failed', error: toError(err) };
    }
  }

  const outcome: ShipRecoveryResult =
    verdict.kind === 'owed'
      ? { kind: 'applied', rowCount: shippedRowCount }
      : { kind: 'confirmed' };

  logActivity('salesOrder.shipRecovery', so.id, {
    orderNumber: so.orderNumber,
    outcome: outcome.kind,
    ...(outcome.kind === 'applied' ? { rowCount: outcome.rowCount } : {}),
    ...(pending.via.kind === 'capability' || pending.via.kind === 'completion-auto-ship'
      ? { statusValue: pending.via.statusValue }
      : {}),
  });

  return outcome;
}

async function patchShippedLinkage(
  so: SalesOrder,
  actor: { id: string; name: string } | undefined,
): Promise<void> {
  const extra = (so.extra ?? {}) as SalesOrderExtra;
  const pending = extra.inventoryLinkage?.pendingShip;
  if (!pending) return;
  await useSalesOrderStore.getState().updateSafely({
    id: so.id,
    version: so.version,
    patch: {
      extra: {
        ...extra,

        inventoryLinkage: buildShippedLinkage(
          pending.snapshot,
          pending.at,
          actor ?? pending.by,
          pending.via,
        ),
      },
    },
  });
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export async function runShipRecovery(params: {
  so: SalesOrder;
  actor: { id: string; name: string } | undefined;
  productsByCode: Map<string, Product>;
  t: TFunction;
}): Promise<ShipRecoveryResult> {
  const { so, actor, productsByCode, t } = params;
  const result = await recoverPendingShip({ so, actor, productsByCode });

  switch (result.kind) {
    case 'applied':
      notifications.show({
        color: 'green',
        title: t('salesOrders.shipRecovery.appliedTitle'),
        message: t('salesOrders.shipRecovery.applied', { orderNumber: so.orderNumber }),
        autoClose: 10000,
      });
      break;
    case 'ambiguous':
      notifications.show({
        color: 'yellow',
        title: t('salesOrders.shipRecovery.ambiguousTitle'),
        message: t('salesOrders.shipRecovery.ambiguous', {
          orderNumber: so.orderNumber,
          items: [...new Set(result.lines.map((l) => l.itemCode))].join(', '),
        }),
        autoClose: 12000,
      });
      break;
    case 'failed':
      notifications.show({
        color: 'yellow',
        title: t('salesOrders.shipRecovery.failedTitle'),
        message: result.failures
          ? formatPlanFailures(result.failures, t, productsByCode)
          : t('salesOrders.shipRecovery.failed', {
              orderNumber: so.orderNumber,
              error: result.error?.message ?? '',
            }),
        autoClose: 12000,
      });
      break;
    case 'none':
    case 'confirmed':
      break;
  }
  return result;
}
