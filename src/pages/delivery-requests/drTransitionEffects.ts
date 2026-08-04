import { notifications } from '@mantine/notifications';
import type { TFunction } from 'i18next';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { applyReturnRestock } from '@/utils/deliveryRequestReturnInventory';
import { logActivity } from '@/utils/activityLogger';
import { indexInventoryByProduct } from '@/utils/inventoryCommitment';
import { getDeliveryRequestStatusOptions, isReturnShipmentEnabled } from '@/utils/permission';
import {
  getAutoShippingTargetValue,
  runTransition as runSoTransition,
  statusHasCapability as soStatusHasCapability,
} from '@/pages/sales-orders/transitionEngine';
import { formatAutoTransitionFailure } from '@/pages/sales-orders/planFailures';
import { runShipRecovery } from '@/pages/sales-orders/shipRecovery';
import { statusChangeMemo } from '@/pages/sales-orders/activityMemo';
import {
  advanceSoIfFullyDelivered,
  ensureReconcileStoresLoaded,
} from '@/pages/sales-orders/reconcileFromDeliveries';
import type { DrFollowUp } from './transitionEngine';
import type {
  DeliveryRequest,
  DeliveryRequestExtra,
  Product,
  SalesOrder,
  SalesOrderExtra,
} from '@/types';

async function dispatchDrFollowUp(
  followUp: DrFollowUp,
  updatedDr: DeliveryRequest,
  currentEmployee: { id: string; name: string } | undefined,
  t: TFunction,
): Promise<void> {
  switch (followUp.kind) {
    case 'advance-so-on-full-delivery':
      return advanceLinkedSoIfFullyDelivered(updatedDr, currentEmployee, t);
    case 'advance-so-on-dispatch':
      return advanceLinkedSoOnDispatch(updatedDr, currentEmployee, t);
  }
}

async function advanceLinkedSoIfFullyDelivered(
  closedDr: DeliveryRequest,
  currentEmployee: { id: string; name: string } | undefined,
  t: TFunction,
): Promise<void> {
  if (closedDr.direction === 'inbound') return;
  if (!closedDr.salesOrderId) return;

  const soStore = useSalesOrderStore.getState();
  if (!soStore.initialized) await soStore.loadAll();
  const so = useSalesOrderStore.getState().getById(closedDr.salesOrderId) as SalesOrder | undefined;
  if (!so) return;
  await advanceSoIfFullyDelivered({ so, actor: currentEmployee, t, freshDr: closedDr });
}

async function advanceLinkedSoOnDispatch(
  transitionedDr: DeliveryRequest,
  currentEmployee: { id: string; name: string } | undefined,
  t: TFunction,
): Promise<void> {
  if (transitionedDr.direction === 'inbound') return;
  if (!transitionedDr.salesOrderId) return;

  await ensureReconcileStoresLoaded();
  const so = useSalesOrderStore.getState().getById(transitionedDr.salesOrderId) as
    SalesOrder | undefined;
  if (!so || so.isClosed) return;
  const soExtra = (so.extra ?? {}) as SalesOrderExtra;
  if (soExtra.cancellation != null) return;
  const fromStatus = soExtra.status ?? '';
  if (!soStatusHasCapability(fromStatus, 'autoAdvanceOnDispatch')) return;
  const targetStatus = getAutoShippingTargetValue();
  if (!targetStatus) return;
  if (fromStatus === targetStatus) return;

  const products = useProductStore.getState().items;
  const productsByCode = new Map<string, Product>();
  for (const p of products) productsByCode.set(p.code, p);
  const inventoryByProduct = indexInventoryByProduct(useProductInventoryStore.getState().items);

  const result = await runSoTransition({
    order: so,
    toStatusValue: targetStatus,
    actor: currentEmployee,
    productsByCode,
    inventoryByProduct,
  });

  if (result.ok) {
    logActivity(
      'salesOrder.statusChange',
      so.id,
      statusChangeMemo({
        updated: result.updated,
        fromStatus,
        toStatus: targetStatus,
        trigger: 'dr-dispatch',
        shipPending: result.pendingShip != null,
      }),
    );
    notifications.show({
      color: 'green',
      message: t('deliveryRequests.notifications.soAutoShippedSuccess', {
        orderNumber: so.orderNumber,
        status: targetStatus,
      }),
    });

    if (result.pendingShip) {
      await runShipRecovery({ so: result.updated, actor: currentEmployee, productsByCode, t });
    }
    return;
  }

  const message = formatAutoTransitionFailure(result.failure, t, productsByCode);
  notifications.show({
    color: 'yellow',
    title: t('deliveryRequests.notifications.soAutoShippedFailedTitle'),
    message,
    autoClose: 10000,
  });
}

export async function runDrTransitionEffects({
  updated,
  priorStatus,
  toStatusValue,
  note,
  actor,
  followUps,
  t,
}: {
  updated: DeliveryRequest;
  priorStatus: string;
  toStatusValue: string;
  note?: string;
  actor?: { id: string; name: string } | undefined;
  followUps: readonly DrFollowUp[];
  t: TFunction;
}): Promise<DeliveryRequest> {
  let record = updated;

  logActivity('deliveryRequest.statusChange', updated.id, {
    requestNumber: updated.requestNumber,
    fromStatus: priorStatus,
    toStatus: toStatusValue,
    ...(note ? { note } : {}),
  });

  const updatedExtra = (updated.extra ?? {}) as DeliveryRequestExtra;
  const toStage = getDeliveryRequestStatusOptions().find((o) => o.value === toStatusValue)?.stage;
  if (
    isReturnShipmentEnabled() &&
    updated.direction === 'inbound' &&
    updatedExtra.inboundKind === 'customer-return' &&
    updatedExtra.returnRestock === true &&
    !updatedExtra.returnRestockedAt &&
    toStage === 'COMPLETED'
  ) {
    const restock = await applyReturnRestock(updated);
    if (restock.failed > 0) {
      notifications.show({
        color: 'red',
        title: t('deliveryRequests.return.restockFailedTitle'),
        message: t('deliveryRequests.return.restockFailedMessage', { count: restock.failed }),
        autoClose: 8000,
      });
    } else if (restock.succeeded > 0) {
      try {
        record = (await useDeliveryRequestStore.getState().updateSafely({
          id: updated.id,
          version: updated.version,
          patch: {
            extra: { ...updatedExtra, returnRestockedAt: new Date().toISOString() },
          },
        })) as DeliveryRequest;
      } catch {
        // Marker lost — harmless: the status is terminal, so there's no
        // re-entry that could double-apply the restock.
      }
      notifications.show({
        color: 'green',
        message: t('deliveryRequests.return.restockDone', { count: restock.succeeded }),
      });
    }
  }

  for (const followUp of followUps) {
    await dispatchDrFollowUp(followUp, updated, actor, t);
  }

  return record;
}
