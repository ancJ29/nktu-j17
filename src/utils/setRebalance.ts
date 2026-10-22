import { cMngtConnector } from '@credo/connectors/connector';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { indexInventoryByProduct } from '@/utils/inventoryCommitment';
import { buildReservedLinkage, type LinkageActor } from '@/utils/inventoryLinkage';
import {
  executeReservationPlan,
  planReservationDiff,
  rollbackAppliedOps,
} from '@/utils/inventoryReservation';
import { emitInventoryActivityForApplied } from '@/utils/inventoryActivityEmit';
import { logActivity } from '@/utils/activityLogger';
import { getSetItems } from '@/utils/productSet';
import { buildBreakdownParentIndex } from '@/utils/breakdownSet';
import type { SalesOrder, SalesOrderExtra } from '@/types';

export type SetRebalanceTrigger = 'compose' | 'decompose' | 'goods-receipt';

export type SetRebalanceSummary = {
  attempted: number;

  rebalanced: number;

  unchanged: number;

  failed: number;
};

const REBALANCE_WARN_THRESHOLD = 50;

function resolveActor(): LinkageActor {
  const id = getCurrentEmployeeId();
  if (!id) return undefined;
  const emp = useEmployeeStore.getState().items.find((e) => e.id === id);
  return { id, name: emp?.name ?? id };
}

export async function rebalanceForSetStockChange(
  movedCodes: readonly string[],
  trigger: SetRebalanceTrigger,
): Promise<SetRebalanceSummary> {
  const summary: SetRebalanceSummary = { attempted: 0, rebalanced: 0, unchanged: 0, failed: 0 };
  if (movedCodes.length === 0) return summary;

  try {
    await useProductInventoryStore.getState().revalidate();
    const productsByCode = useProductStore.getState().mapByCode;

    const parentIndex = buildBreakdownParentIndex(productsByCode.values());
    const candidateCodes = new Set<string>();
    for (const code of movedCodes) {
      candidateCodes.add(code);
      for (const item of getSetItems(productsByCode.get(code))) {
        candidateCodes.add(item.productCode);
      }
      for (const link of parentIndex.get(code) ?? []) {
        candidateCodes.add(link.parent.code);
      }
    }

    const soIds = new Set<string>();
    const invByProduct = indexInventoryByProduct(useProductInventoryStore.getState().items);
    for (const code of candidateCodes) {
      for (const row of invByProduct.get(code) ?? []) {
        const map = row.extra?.reservedBySalesOrder;
        if (map) for (const soId of Object.keys(map)) soIds.add(soId);
      }
    }
    if (soIds.size === 0) return summary;
    if (soIds.size > REBALANCE_WARN_THRESHOLD) {
      console.warn(
        `[setRebalance] ${soIds.size} sales orders reference ${movedCodes.join(', ')} — ` +
          'processing all sequentially; this may take a moment.',
      );
    }

    const actor = resolveActor();
    const at = Date.now();

    for (const soId of soIds) {
      const inventoryByProduct = indexInventoryByProduct(useProductInventoryStore.getState().items);

      let so: SalesOrder;
      try {
        const res = await cMngtConnector.getSalesOrderById<SalesOrderExtra>({ id: soId });
        so = res.salesOrder as SalesOrder;
      } catch {
        summary.failed += 1;
        continue;
      }

      const extra = (so.extra ?? {}) as SalesOrderExtra;
      const linkage = extra.inventoryLinkage;

      if (linkage?.state !== 'reserved' || !linkage.reservedSnapshot) continue;
      summary.attempted += 1;

      const diff = planReservationDiff({
        oldSnapshot: linkage.reservedSnapshot,
        newItems: so.items,
        so,
        productsByCode,
        inventoryByProduct,
      });
      if (!diff.ok) {
        summary.failed += 1;
        continue;
      }
      if (diff.plan.ops.length === 0) {
        summary.unchanged += 1;
        continue;
      }

      const exec = await executeReservationPlan(diff.plan.ops);
      if (!exec.ok) {
        summary.failed += 1;
        continue;
      }

      const nextLinkage = buildReservedLinkage(diff.newSnapshot, at, actor, {
        kind: 'set-rebalance',
        trigger,
      });
      try {
        await useSalesOrderStore.getState().updateSafely({
          id: so.id,
          version: so.version,
          patch: { extra: { ...extra, inventoryLinkage: nextLinkage } },
        });
      } catch {
        await rollbackAppliedOps(exec.applied);
        summary.failed += 1;
        continue;
      }

      if (exec.applied.length > 0) {
        emitInventoryActivityForApplied(exec.applied, {
          kind: 'SO',
          id: so.id,
          label: so.orderNumber,
          suffix: '(set-rebalance)',
        });
      }
      logActivity('salesOrder.setRebalance', so.id, {
        orderNumber: so.orderNumber,
        trigger,
        setCodes: [...movedCodes],
        adjustedRows: diff.plan.ops.map((o) => ({
          productCode: o.itemCode,
          locationCode: o.locationCode,
          deltas: o.deltas,
        })),
      });
      summary.rebalanced += 1;
    }

    if (summary.rebalanced > 0) useProductInventoryStore.getState().forceRefresh();
    return summary;
  } catch (err) {
    console.error('[setRebalance] rebalance pass failed:', err);
    return summary;
  }
}
