import { notifications } from '@mantine/notifications';
import type { TFunction } from 'i18next';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { useProductStore } from '@/stores/useProductStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { indexInventoryByProduct } from '@/utils/inventoryCommitment';
import { getSalesOrderCompletionEvidence } from '@/utils/permission';
import type {
  DeliveryRequest,
  DeliveryRequestExtra,
  Product,
  SalesOrder,
  SalesOrderExtra,
} from '@/types';
import {
  getAutoCompletionTargetValue,
  runTransition as runSoTransition,
  statusHasCapability as soStatusHasCapability,
} from './transitionEngine';
import { formatAutoTransitionFailure } from './planFailures';
import { runShipRecovery } from './shipRecovery';
import { statusChangeMemo } from './activityMemo';
import { logActivity } from '@/utils/activityLogger';

export type Actor = { id: string; name: string } | undefined;

export type SoReconcileOutcome = 'advanced' | 'skipped' | 'failed';

export async function ensureReconcileStoresLoaded(): Promise<void> {
  const so = useSalesOrderStore.getState();
  if (!so.initialized) await so.loadAll();
  const products = useProductStore.getState();
  if (!products.initialized) await products.loadAll();
  const inventory = useProductInventoryStore.getState();
  if (!inventory.initialized) await inventory.loadAll();
  const drs = useDeliveryRequestStore.getState();
  if (!drs.initialized) await drs.loadAll();
}

export type CompletionEvidence = 'quantities' | 'closedDeliveries';

export function isFullyDelivered(
  so: SalesOrder,
  liveDrsForSo: readonly DeliveryRequest[],
  evidence: CompletionEvidence = 'quantities',
): boolean {
  const outbound = liveDrsForSo.filter((d) => d.direction !== 'inbound');
  const closed = outbound.filter((d) => d.isClosed);
  if (closed.length === 0) return false;

  if (evidence === 'closedDeliveries') {
    return outbound.every((d) => d.isClosed);
  }

  const deliveredByKey = new Map<string, number>();
  for (const d of closed) {
    const items = (d.extra as DeliveryRequestExtra)?.deliveredItems ?? [];
    for (const it of items) {
      const k = `${it.productCode}::${it.unit}`;
      deliveredByKey.set(k, (deliveredByKey.get(k) ?? 0) + it.quantity);
    }
  }
  return so.items.every((line) => {
    const k = `${line.productCode}::${line.unit}`;
    return (deliveredByKey.get(k) ?? 0) >= line.quantity;
  });
}

export function resolveActualDeliveryDate(
  liveDrsForSo: readonly DeliveryRequest[],
): number | undefined {
  let latest: number | undefined;
  for (const d of liveDrsForSo) {
    if (d.direction === 'inbound' || !d.isClosed) continue;
    const ts = (d.extra as DeliveryRequestExtra | undefined)?.deliveryTimestamp;
    if (ts == null) continue;
    const ms = new Date(ts as string | number).getTime();
    if (Number.isNaN(ms)) continue;
    if (latest === undefined || ms > latest) latest = ms;
  }
  return latest;
}

export async function advanceSoIfFullyDelivered(params: {
  so: SalesOrder;
  actor: Actor;
  t: TFunction;
  freshDr?: DeliveryRequest;
}): Promise<SoReconcileOutcome> {
  const { actor, t, freshDr } = params;
  let so = params.so;

  const preExtra = (so.extra ?? {}) as SalesOrderExtra;
  const hasPendingShip = preExtra.inventoryLinkage?.pendingShip != null;
  const targetStatus = getAutoCompletionTargetValue();
  const mayAdvance =
    !so.isClosed &&
    preExtra.cancellation == null &&
    targetStatus != null &&
    soStatusHasCapability(preExtra.status ?? '', 'autoAdvanceOnFullDelivery');
  if (!hasPendingShip && !mayAdvance) return 'skipped';

  await ensureReconcileStoresLoaded();

  const productsByCode = new Map<string, Product>();
  for (const p of useProductStore.getState().items as Product[]) productsByCode.set(p.code, p);

  if (hasPendingShip) {
    const recovery = await runShipRecovery({ so, actor, productsByCode, t });
    if (recovery.kind === 'applied' || recovery.kind === 'confirmed') {
      const fresh = useSalesOrderStore.getState().getById(so.id) as SalesOrder | undefined;
      if (fresh) so = fresh;
    }
  }

  if (!mayAdvance || !targetStatus) return 'skipped';
  const soExtra = (so.extra ?? {}) as SalesOrderExtra;

  if (so.isClosed || soExtra.cancellation != null) return 'skipped';
  const fromStatus = soExtra.status ?? '';
  if (!soStatusHasCapability(fromStatus, 'autoAdvanceOnFullDelivery')) return 'skipped';

  const allDrs = useDeliveryRequestStore.getState().items as DeliveryRequest[];
  const drsForSo = allDrs
    .map((d) => (freshDr && d.id === freshDr.id ? freshDr : d))
    .filter(
      (d) => d.salesOrderId === so.id && !(d.extra as DeliveryRequestExtra | undefined)?.isDeleted,
    );
  if (freshDr && freshDr.salesOrderId === so.id && !drsForSo.some((d) => d.id === freshDr.id)) {
    drsForSo.push(freshDr);
  }

  if (!isFullyDelivered(so, drsForSo, getSalesOrderCompletionEvidence())) return 'skipped';

  const inventoryByProduct = indexInventoryByProduct(useProductInventoryStore.getState().items);

  const actualDeliveryDate = resolveActualDeliveryDate(drsForSo);

  let result = await runSoTransition({
    order: so,
    toStatusValue: targetStatus,
    actor,
    productsByCode,
    inventoryByProduct,
    actualDeliveryDate,
  });

  if (!result.ok && result.failure.kind === 'patch-conflict') {
    await useSalesOrderStore.getState().forceRefresh();
    const fresh = useSalesOrderStore.getState().getById(so.id) as SalesOrder | undefined;
    if (fresh) {
      const freshExtra = (fresh.extra ?? {}) as SalesOrderExtra;
      const freshStatus = freshExtra.status ?? '';

      if (fresh.isClosed || freshStatus === targetStatus) return 'skipped';
      if (freshExtra.cancellation == null && freshStatus === fromStatus) {
        so = fresh;
        result = await runSoTransition({
          order: fresh,
          toStatusValue: targetStatus,
          actor,
          productsByCode,
          inventoryByProduct: indexInventoryByProduct(useProductInventoryStore.getState().items),
          actualDeliveryDate,
        });
      }
    }
  }

  if (result.ok) {
    logActivity(
      'salesOrder.statusChange',
      so.id,
      statusChangeMemo({
        updated: result.updated,
        fromStatus,
        toStatus: targetStatus,
        trigger: freshDr ? 'dr-completion' : 'self-heal',
        shipPending: result.pendingShip != null,
      }),
    );
    notifications.show({
      color: 'green',
      message: t('deliveryRequests.notifications.soAutoAdvancedSuccess', {
        orderNumber: so.orderNumber,
        status: targetStatus,
      }),
    });

    if (result.pendingShip) {
      await runShipRecovery({ so: result.updated, actor, productsByCode, t });
    }
    return 'advanced';
  }

  notifications.show({
    color: 'yellow',
    title: t('deliveryRequests.notifications.soAutoAdvancedFailedTitle'),
    message: formatAutoTransitionFailure(result.failure, t, productsByCode),
    autoClose: 10000,
  });
  return 'failed';
}
