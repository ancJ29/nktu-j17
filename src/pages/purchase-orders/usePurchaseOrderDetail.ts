import { useCallback, useEffect, useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useNavigate, useParams } from 'react-router';
import type { TFunction } from 'i18next';
import { device, logger } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { getCurrentActorId } from '@/hooks';
import { logActivity } from '@/utils/activityLogger';
import { stateMemo } from './activityMemo';
import {
  logPurchaseOrderPayment,
  logPurchaseOrderTracking,
  purchaseOrderPaymentPatch,
  purchaseOrderTrackingPatch,
  type PurchaseOrderPaymentNext,
} from './purchaseOrderPaymentWrite';
import { EntityConflictError } from '@/stores/createEntityStore';
import { purchaseOrderBundle } from '@/stores/usePurchaseOrderStore';
import { featureFlags } from '@/utils/features';
import { isPricingManagementEnabled, perms } from '@/utils/permission';
import type { PurchaseOrder, PurchaseOrderCopyFrom } from '@/types';
import { arrivalOf, type Arrival } from './purchaseOrderArrivals';
import { findPurchaseOrderStatus, canTransitionPurchaseOrder } from './purchaseOrderStatuses';
import {
  poCurrency,
  poCustomer,
  poExtra,
  poItems,
  poLeadTime,
  poReceiptIds,
  poStatus,
  readyBlockers,
} from './purchaseOrderModel';
import {
  findReceiptsForOrder,
  linkReceiptToOrder,
  liveReceipt,
  readLinkedReceipts,
  toReceiptSeed,
  type ReceiptsRead,
} from './purchaseOrderReceipts';

const isMobile = device.isMobile;
const pricingOn = isPricingManagementEnabled();

export function usePurchaseOrderDetail(t: TFunction) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'ready' | 'cancel'>('ready');
  const [confirmOpened, { open: openConfirmModal, close: closeConfirm }] = useDisclosure(false);
  const [paymentOpened, { open: openPayment, close: closePayment }] = useDisclosure(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    purchaseOrderBundle
      .fetchById(id)
      .then(({ item }) => {
        if (!cancelled) setOrder(item);
      })
      .catch((err) => {
        logger.error('Purchase order fetch failed:', err);
        if (cancelled) return;
        notifications.show({ color: 'red', message: t('purchaseOrders.notifications.fetchError') });
        navigate(ROUTES.PURCHASE_ORDERS.LIST);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loading = !order || order.id !== id;

  const [receipts, setReceipts] = useState<ReceiptsRead | null>(null);
  const receiptKey = order ? `${order.id}:${order.version}:${poReceiptIds(order).join(',')}` : '';
  const mayRepair = perms.goodsReceipt.canCreate();
  useEffect(() => {
    if (!order) return;
    const isReady = poStatus(order) === 'ready';
    const hasIds = poReceiptIds(order).length > 0;
    if (!hasIds && !isReady) return;
    let cancelled = false;
    (async () => {
      const read = hasIds ? await readLinkedReceipts(order) : await findReceiptsForOrder(order);

      if (!hasIds && read.kind === 'ok' && read.receipts.length > 0 && mayRepair) {
        for (const r of read.receipts) await linkReceiptToOrder(order.id, r.id);
        try {
          const fresh = (await purchaseOrderBundle.fetchById(order.id)).item;
          if (!cancelled) setOrder(fresh);
        } catch (err) {
          logger.error('Re-reading the purchase order after a repair failed:', err);
        }
      }
      if (cancelled) return;
      setReceipts(read);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptKey]);

  const liveCount = receipts?.kind === 'ok' ? receipts.receipts.filter(liveReceipt).length : 0;
  const receiptsUnreadable = receipts?.kind === 'unreadable';

  const arrival: Arrival | null =
    order && receipts?.kind === 'ok'
      ? arrivalOf(order, receipts.receipts)
      : order && receipts === null && !poReceiptIds(order).length && poStatus(order) !== 'ready'
        ? { kind: 'none' }
        : null;

  const status = order ? poStatus(order) : null;
  const statusOption = status ? findPurchaseOrderStatus(status) : null;

  const showPrice = pricingOn && perms.purchaseOrder.canViewPrice();

  const canAuthor = perms.purchaseOrder.canEdit() && (!pricingOn || showPrice);
  const showEditCta = !!order && status === 'draft' && canAuthor && !isMobile;
  const showReadyCta = !!order && status === 'draft' && canAuthor;
  const showCancelCta =
    !!order && (status === 'draft' || status === 'ready') && perms.purchaseOrder.canEdit();
  const canMarkPaid = !!order && perms.purchaseOrder.canMarkPaid();

  const showMakeReceiptCta =
    !!order &&
    status === 'ready' &&
    !isMobile &&
    featureFlags.goodsReceipts.enabled &&
    perms.goodsReceipt.canCreate() &&
    receipts?.kind === 'ok' &&
    liveCount === 0;

  const showCopyCta =
    !!order && perms.purchaseOrder.canCreate() && !isMobile && (!pricingOn || showPrice);
  const handleCopy = useCallback(() => {
    if (!order) return;
    const copyFrom: PurchaseOrderCopyFrom = {
      vendorCode: order.vendorCode,
      vendorName: order.vendorName,
      locationCode: order.locationCode,
      locationName: order.locationName,
      currency: poCurrency(order),
      reference: order.reference ?? '',
      notes: order.notes ?? '',
      ...(poCustomer(order)
        ? { customerCode: poCustomer(order)!.code, customerName: poCustomer(order)!.name }
        : {}),
      items: poItems(order),
      ...(poLeadTime(order) ? { leadTime: poLeadTime(order)! } : {}),
      ...(poExtra(order).assignedTo ? { assignedTo: poExtra(order).assignedTo! } : {}),
      sourceId: order.id,
      sourceOrderNumber: order.orderNumber,
    };
    navigate(ROUTES.PURCHASE_ORDERS.NEW, { state: { copyFrom } });
  }, [order, navigate]);

  const handleMakeReceipt = useCallback(() => {
    if (!order) return;
    navigate(ROUTES.GOODS_RECEIPTS.NEW, { state: { fromPurchaseOrder: toReceiptSeed(order) } });
  }, [order, navigate]);

  const write = useCallback(
    async (patch: Record<string, unknown>): Promise<boolean> => {
      if (!order) return false;
      setActionLoading(true);
      try {
        const updated = await purchaseOrderBundle.updateSafely({
          id: order.id,
          version: order.version,
          patch,
        });
        setOrder(updated);
        return true;
      } catch (err) {
        logger.error('Purchase order write failed:', err);
        if (err instanceof EntityConflictError) {
          if (err.latest) setOrder(err.latest as PurchaseOrder);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: t('purchaseOrders.notifications.updateError'),
          });
        }
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [order, t],
  );

  const openConfirm = useCallback(
    (action: 'ready' | 'cancel') => {
      if (!order) return;
      if (
        action === 'cancel' &&
        poStatus(order) === 'ready' &&
        (liveCount > 0 || receiptsUnreadable)
      ) {
        notifications.show({
          color: 'red',
          message: t(
            receiptsUnreadable
              ? 'purchaseOrders.notifications.receiptsUnreadable'
              : 'purchaseOrders.notifications.cancelReceiptFirst',
          ),
          autoClose: 8000,
        });
        return;
      }
      if (action === 'ready') {
        const blockers = readyBlockers(order, { requirePrice: pricingOn });
        if (blockers.length > 0) {
          notifications.show({
            color: 'red',
            message: t(`purchaseOrders.validation.ready.${blockers[0]}`),
            autoClose: 8000,
          });
          return;
        }
      }
      setConfirmAction(action);
      openConfirmModal();
    },
    [order, t, openConfirmModal, liveCount, receiptsUnreadable],
  );

  const runAction = useCallback(async () => {
    if (!order) return;
    const target = confirmAction === 'ready' ? 'ready' : 'cancelled';
    if (!canTransitionPurchaseOrder(poStatus(order), target)) {
      closeConfirm();
      return;
    }
    const actor = getCurrentActorId();
    const now = new Date().toISOString();
    const ok = await write(
      target === 'ready'
        ? { status: 'ready', readyAt: now, extra: { ...poExtra(order), readyBy: actor } }
        : {
            status: 'cancelled',
            cancelledAt: now,
            extra: { ...poExtra(order), cancelledBy: actor },
          },
    );
    closeConfirm();
    if (ok) {
      logActivity(
        target === 'ready' ? 'purchaseOrder.ready' : 'purchaseOrder.cancel',
        order.id,
        stateMemo(order),
      );
      notifications.show({
        color: 'green',
        message: t(
          target === 'ready'
            ? 'purchaseOrders.notifications.readySuccess'
            : 'purchaseOrders.notifications.cancelSuccess',
        ),
      });
    }
  }, [order, confirmAction, write, closeConfirm, t]);

  const savePayment = useCallback(
    async (next: PurchaseOrderPaymentNext) => {
      if (!order) return;
      const ok = await write(purchaseOrderPaymentPatch(order, next));
      if (ok) {
        logPurchaseOrderPayment(order, next);
        closePayment();
        notifications.show({
          color: 'green',
          message: t('purchaseOrders.notifications.paymentSaved'),
        });
      }
    },
    [order, write, closePayment, t],
  );

  const trackAgain = useCallback(async () => {
    if (!order) return;
    const ok = await write(purchaseOrderTrackingPatch(false));
    if (ok) logPurchaseOrderTracking(order, false);
  }, [order, write]);

  return {
    order,
    loading,
    actionLoading,
    status,
    statusOption,
    showPrice,
    showEditCta,
    showReadyCta,
    showCancelCta,
    canMarkPaid,
    trackAgain,
    showMakeReceiptCta,
    handleMakeReceipt,
    showCopyCta,
    handleCopy,
    receipts,
    liveCount,
    receiptsUnreadable,
    arrival,
    confirmAction,
    confirmOpened,
    openConfirm,
    closeConfirm,
    runAction,
    paymentOpened,
    openPayment,
    closePayment,
    savePayment,
  };
}
