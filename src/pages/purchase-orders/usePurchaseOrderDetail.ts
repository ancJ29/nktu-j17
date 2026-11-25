import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useNavigate, useParams } from 'react-router';
import type { TFunction } from 'i18next';
import { device, logger } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { getCurrentActorId, getCurrentEmployeeId } from '@/hooks';
import { useMyEmployee } from '@/hooks/useMyEmployee';
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
import type {
  PurchaseOrder,
  PurchaseOrderAttachment,
  PurchaseOrderCopyFrom,
  PurchaseOrderPhoto,
} from '@/types';
import { buildUploadDirectory } from '@/utils/uploadPath';
import { writePurchaseOrderAttachments, writePurchaseOrderPhotos } from './purchaseOrderMediaWrite';
import { arrivalOf, type Arrival } from './purchaseOrderArrivals';
import { showPurchaseOrderVendor } from './purchaseOrderVendorAccess';
import { canViewPurchaseOrder, purchaseOrderViewScope } from './purchaseOrderViewScope';
import { carriesPriceFigure, isPriceBlindAuthor } from './purchaseOrderPriceAccess';
import { findPurchaseOrderStatus, canTransitionPurchaseOrder } from './purchaseOrderStatuses';
import {
  receivedMarkOffer,
  receivedMarkPatch,
  receivedUndoPatch,
} from './purchaseOrderReceivedMark';
import {
  poCurrency,
  poCustomer,
  poExtra,
  poItems,
  poLeadTime,
  poReceiptIds,
  poStatus,
  poVatRate,
  poVendorNote,
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

export type ConfirmAction = 'ready' | 'cancel' | 'received' | 'unreceive';

const ACTION_TARGET = {
  ready: 'ready',
  cancel: 'cancelled',
  received: 'received',
  unreceive: 'ready',
} as const;

const ACTION_LOG = {
  ready: 'purchaseOrder.ready',
  cancel: 'purchaseOrder.cancel',
  received: 'purchaseOrder.received',
  unreceive: 'purchaseOrder.unreceived',
} as const;

const ACTION_SUCCESS = {
  ready: 'purchaseOrders.notifications.readySuccess',
  cancel: 'purchaseOrders.notifications.cancelSuccess',
  received: 'purchaseOrders.notifications.receivedSuccess',
  unreceive: 'purchaseOrders.notifications.unreceivedSuccess',
} as const;
const pricingOn = isPricingManagementEnabled();
const viewScope = purchaseOrderViewScope();

export function usePurchaseOrderDetail(t: TFunction) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>('ready');
  const [confirmOpened, { open: openConfirmModal, close: closeConfirm }] = useDisclosure(false);
  const [paymentOpened, { open: openPayment, close: closePayment }] = useDisclosure(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    purchaseOrderBundle
      .fetchById(id)
      .then(({ item }) => {
        if (cancelled) return;

        if (!canViewPurchaseOrder(item, getCurrentEmployeeId(), viewScope)) {
          notifications.show({
            color: 'red',
            message: t('purchaseOrders.notifications.outOfScope'),
          });
          navigate(ROUTES.PURCHASE_ORDERS.LIST, { replace: true });
          return;
        }
        setOrder(item);
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

    const isReady = poStatus(order) === 'ready' || poStatus(order) === 'received';
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
      : order &&
          receipts === null &&
          !poReceiptIds(order).length &&
          poStatus(order) !== 'ready' &&
          poStatus(order) !== 'received'
        ? { kind: 'none' }
        : null;

  const status = order ? poStatus(order) : null;
  const statusOption = status ? findPurchaseOrderStatus(status) : null;

  const showPrice = pricingOn && perms.purchaseOrder.canViewPrice();

  const canAuthor = perms.purchaseOrder.canEdit() && (!pricingOn || showPrice);

  const mediaStatusOpen = status === 'draft' || status === 'ready' || status === 'received';
  const canChangePhotos =
    mediaStatusOpen && (perms.purchaseOrder.canEdit() || perms.purchaseOrder.canTakePhoto());
  const canChangeFiles = canAuthor && mediaStatusOpen;
  const showFiles = !pricingOn || showPrice;

  const mediaDirectory = useMemo(
    () => buildUploadDirectory({ type: 'purchase-order', id: id ?? '' }),
    [id],
  );
  const currentEmployee = useMyEmployee();

  const canEditPriceless =
    perms.purchaseOrder.canEdit() && isPriceBlindAuthor() && !!order && !carriesPriceFigure(order);
  const showEditCta = !!order && status === 'draft' && (canAuthor || canEditPriceless) && !isMobile;

  const showReadyCta = !!order && status === 'draft' && canAuthor && showPurchaseOrderVendor();
  const showCancelCta =
    !!order && (status === 'draft' || status === 'ready') && perms.purchaseOrder.canEdit();
  const canMarkPaid = !!order && perms.purchaseOrder.canMarkPaid();

  const receivedOffer = order
    ? receivedMarkOffer(status, canAuthor && showPurchaseOrderVendor())
    : null;

  const showMakeReceiptCta =
    !!order &&
    (status === 'ready' || status === 'received') &&
    !isMobile &&
    featureFlags.goodsReceipts.enabled &&
    perms.goodsReceipt.canCreate() &&
    receipts?.kind === 'ok' &&
    liveCount === 0;

  const showCopyCta = !!order && perms.purchaseOrder.canCreate() && !isMobile;
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
      vendorNote: poVendorNote(order),
      ...(poCustomer(order)
        ? { customerCode: poCustomer(order)!.code, customerName: poCustomer(order)!.name }
        : {}),
      items: poItems(order),
      vatRate: poVatRate(order),
      ...(poLeadTime(order) ? { leadTime: poLeadTime(order)! } : {}),
      ...(poExtra(order).assignedTo ? { assignedTo: poExtra(order).assignedTo! } : {}),
      ...(poExtra(order).requestedBy ? { requestedBy: poExtra(order).requestedBy! } : {}),
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
    (action: ConfirmAction) => {
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
    const target = ACTION_TARGET[confirmAction];
    if (!canTransitionPurchaseOrder(poStatus(order), target)) {
      closeConfirm();
      return;
    }
    const actor = getCurrentActorId();
    const now = new Date().toISOString();
    const patch =
      confirmAction === 'ready'
        ? { status: 'ready', readyAt: now, extra: { ...poExtra(order), readyBy: actor } }
        : confirmAction === 'received'
          ? receivedMarkPatch(order, actor, now)
          : confirmAction === 'unreceive'
            ? receivedUndoPatch(order)
            : {
                status: 'cancelled',
                cancelledAt: now,
                extra: { ...poExtra(order), cancelledBy: actor },
              };
    const ok = await write(patch);
    closeConfirm();
    if (ok) {
      logActivity(ACTION_LOG[confirmAction], order.id, stateMemo(order));
      notifications.show({ color: 'green', message: t(ACTION_SUCCESS[confirmAction]) });
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

  const handlePhotosChange = useCallback(
    async (photos: PurchaseOrderPhoto[]) => {
      if (!order) return;
      const { record, rebased } = await writePurchaseOrderPhotos(order, photos);
      setOrder(record);
      if (rebased) notifications.show({ color: 'blue', message: t('photos.updatedElsewhere') });
    },
    [order, t],
  );
  const handleAttachmentsChange = useCallback(
    async (attachments: PurchaseOrderAttachment[]) => {
      if (!order) return;
      const { record, rebased } = await writePurchaseOrderAttachments(order, attachments);
      setOrder(record);
      if (rebased) notifications.show({ color: 'blue', message: t('photos.updatedElsewhere') });
    },
    [order, t],
  );

  return {
    order,
    loading,
    actionLoading,
    status,
    statusOption,
    showPrice,
    canChangePhotos,
    canChangeFiles,
    showFiles,
    mediaDirectory,
    currentEmployee,
    handlePhotosChange,
    handleAttachmentsChange,
    showEditCta,
    showReadyCta,
    showCancelCta,
    receivedOffer,
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
