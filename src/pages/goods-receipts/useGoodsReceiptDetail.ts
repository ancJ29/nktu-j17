import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import type { TFunction } from 'i18next';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { useGoodsReceiptStore } from '@/stores/useGoodsReceiptStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import {
  applyGoodsReceiptInventoryEffect,
  clearGoodsReceiptMarkers,
  getGoodsReceiptPostingStatus,
  syncDraftIncomingToInventory,
  type GoodsReceiptPostingStatus,
} from '@/utils/goodsReceiptInventory';
import { getCurrentActorId } from '@/hooks';
import { logActivity } from '@/utils/activityLogger';
import { isProductSet } from '@/utils/productSet';
import { rebalanceForSetStockChange } from '@/utils/setRebalance';
import { perms } from '@/utils/permission';
import type { GoodsReceipt, GoodsReceiptCopyFrom } from '@/types';
import { findStatus, type GoodsReceiptStatusOption } from './goodsReceiptStatuses';
import type { GoodsReceiptInlineFields } from './activityMemo';
import { vendorMemo } from './activityMemo';

const isMobile = device.isMobile;
const canEdit = perms.goodsReceipt.canEdit();
const canConfirmReceived = perms.goodsReceipt.canConfirmReceived();
const canCancel = perms.goodsReceipt.canCancel();
const canCreate = perms.goodsReceipt.canCreate();

export type ConfirmAction = 'confirmReceived' | 'cancel';

export type UseGoodsReceiptDetailReturn = {
  receipt: GoodsReceipt | null;
  loading: boolean;
  actionLoading: boolean;

  status: GoodsReceiptStatusOption | null;
  isDraft: boolean;
  isReceived: boolean;
  isCancelled: boolean;

  showConfirmCta: boolean;
  showCancelCta: boolean;
  showEditCta: boolean;
  showCopyCta: boolean;

  canEditItems: boolean;

  stockPostedOnDraft: boolean;

  confirmAction: ConfirmAction | null;
  confirmOpened: boolean;
  openConfirm: (action: ConfirmAction) => void;
  closeConfirm: () => void;
  runAction: () => Promise<void>;

  handleCopyReceipt: () => void;

  postingStatus: GoodsReceiptPostingStatus | null;
  postingStatusLoading: boolean;

  showRepostCta: boolean;
  repostOpened: boolean;
  openRepost: () => void;
  closeRepost: () => void;
  reposting: boolean;
  handleRepostInventory: () => Promise<void>;

  editingItemIdx: number | null;
  setEditingItemIdx: (idx: number | null) => void;
  savingItem: boolean;
  handleSaveItemQuantity: (idx: number, newQty: number) => Promise<void>;
};

export function useGoodsReceiptDetail(t: TFunction): UseGoodsReceiptDetailReturn {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const invalidateCache = useGoodsReceiptStore((s) => s.invalidate);

  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmOpened, confirmHandlers] = useDisclosure(false);

  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [savingItem, setSavingItem] = useState(false);

  const [postingStatus, setPostingStatus] = useState<GoodsReceiptPostingStatus | null>(null);
  const [postingStatusLoading, setPostingStatusLoading] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [repostOpened, repostHandlers] = useDisclosure(false);

  useEffect(() => {
    if (!id) return;
    const cached = useGoodsReceiptStore.getState().getById(id) as GoodsReceipt | undefined;
    if (cached) {
      setReceipt(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    asyncDeduplicator
      .call(`goods-receipt:${id}`, () => cMngtConnector.getGoodsReceiptById({ id }))
      .then((res) => {
        if (cancelled) return;
        setReceipt(res.goodsReceipt as GoodsReceipt);
      })
      .catch(() => {
        if (cancelled) return;
        notifications.show({
          color: 'red',
          message: t('goodsReceipts.notifications.fetchError'),
        });
        navigate(ROUTES.GOODS_RECEIPTS.LIST);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t, navigate]);

  useEffect(() => {
    void useProductInventoryStore.getState().revalidate();
  }, []);

  const openConfirm = useCallback(
    (action: ConfirmAction) => {
      setConfirmAction(action);
      confirmHandlers.open();
    },
    [confirmHandlers],
  );

  const refreshPostingStatus = useCallback(
    async (target: GoodsReceipt): Promise<GoodsReceiptPostingStatus | null> => {
      if (target.status !== 'received') return null;
      setPostingStatusLoading(true);
      try {
        const status = await getGoodsReceiptPostingStatus(target);
        setPostingStatus(status);
        return status;
      } catch {
        setPostingStatus(null);
        return null;
      } finally {
        setPostingStatusLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!receipt || receipt.status !== 'received') return;
    let cancelled = false;
    void getGoodsReceiptPostingStatus(receipt)
      .then((status) => {
        if (!cancelled) setPostingStatus(status);
      })
      .catch(() => {
        if (!cancelled) setPostingStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [receipt]);

  const runAction = useCallback(async () => {
    if (!id || !receipt || !confirmAction) return;
    setActionLoading(true);

    const priorStatus = receipt.status;
    const isConfirm = confirmAction === 'confirmReceived';

    const draftCarriesPostedStock =
      priorStatus === 'draft' && receipt.extra?.inventoryPosted === true;

    let inventoryEffect: { attempted: number; failed: number } | null = null;
    let fullyPosted = false;
    let stockMoved = false;

    try {
      if (isConfirm && priorStatus === 'draft') {
        stockMoved = true;
        try {
          const effect = await applyGoodsReceiptInventoryEffect(receipt, 'increment');
          inventoryEffect = { attempted: effect.attempted, failed: effect.failed };
          fullyPosted = effect.failed === 0;
          if (effect.failed > 0) {
            notifications.show({
              color: 'yellow',
              title: t('goodsReceipts.notifications.inventoryPartial'),

              message:
                effect.errors.slice(0, 5).join('\n') ||
                t('goodsReceipts.notifications.inventoryPartialBody', {
                  failed: effect.failed,
                  attempted: effect.attempted,
                }),
              autoClose: false,
            });
          }
        } catch {
          notifications.show({
            color: 'yellow',
            title: t('goodsReceipts.notifications.inventoryPartial'),
            message: t('goodsReceipts.notifications.inventoryAborted'),
            autoClose: false,
          });
        }
      }

      let workingVersion = receipt.version;
      if (isConfirm && priorStatus === 'draft') {
        const actor = getCurrentActorId();
        const stamped = await useGoodsReceiptStore.getState().updateSafely({
          id,
          version: workingVersion,
          patch: {
            extra: {
              ...receipt.extra,
              receivedBy: actor,
              ...(fullyPosted && { inventoryPosted: true }),
            },
          },
        });
        workingVersion = stamped.version;
      }

      const updated = await useGoodsReceiptStore.getState().updateSafely({
        id,
        version: workingVersion,
        patch: { status: isConfirm ? 'received' : 'cancelled' },
      });
      invalidateCache();

      if (!isConfirm) {
        try {
          if (priorStatus === 'received' || draftCarriesPostedStock) {
            stockMoved = true;
            const effect = await applyGoodsReceiptInventoryEffect(receipt, 'decrement');
            inventoryEffect = { attempted: effect.attempted, failed: effect.failed };
            if (effect.failed > 0) {
              notifications.show({
                color: 'yellow',
                title: t('goodsReceipts.notifications.inventoryPartial'),

                message:
                  effect.errors.slice(0, 5).join('\n') ||
                  t('goodsReceipts.notifications.inventoryPartialBody', {
                    failed: effect.failed,
                    attempted: effect.attempted,
                  }),
                autoClose: false,
              });
            }
          }
          if (priorStatus === 'draft') {
            const effect = await syncDraftIncomingToInventory(receipt, null);
            if (effect.failed > 0) {
              notifications.show({
                color: 'yellow',
                title: t('goodsReceipts.notifications.inventoryPartial'),
                message: t('goodsReceipts.notifications.inventoryPartialBody', {
                  failed: effect.failed,
                  attempted: effect.attempted,
                }),
                autoClose: 8000,
              });
            }
          }
        } catch {
          notifications.show({
            color: 'yellow',
            title: t('goodsReceipts.notifications.inventoryPartial'),
            message: t('goodsReceipts.notifications.inventoryAborted'),
            autoClose: false,
          });
        }
      }

      setReceipt(updated);
      if (!inventoryEffect || inventoryEffect.failed === 0) {
        notifications.show({
          color: 'green',
          message: t(
            isConfirm
              ? 'goodsReceipts.notifications.confirmSuccess'
              : 'goodsReceipts.notifications.cancelSuccess',
          ),
        });
      }
      confirmHandlers.close();

      const productsByCode = useProductStore.getState().mapByCode;
      const receivedSetCodes = stockMoved
        ? [...new Set(receipt.items.map((it) => it.itemCode).filter(Boolean))].filter((code) =>
            isProductSet(productsByCode.get(code)),
          )
        : [];

      void (async () => {
        if (isConfirm && fullyPosted) {
          try {
            await clearGoodsReceiptMarkers(receipt);
          } catch {
            // Inert: the flag already suppresses the repair CTA and short-
            // circuits the read-back, so leftovers are never read.
          }
        }
        if (receivedSetCodes.length > 0) {
          await rebalanceForSetStockChange(receivedSetCodes, 'goods-receipt');
        }
      })();

      const baseMemo = {
        receiptNumber: receipt.receiptNumber,
        ...vendorMemo(receipt),
        lineCount: receipt.items.length,
        ...(inventoryEffect && {
          inventoryAttempted: inventoryEffect.attempted,
          inventoryFailed: inventoryEffect.failed,
        }),
      };
      if (isConfirm) {
        logActivity('goodsReceipt.confirmReceived', id, baseMemo);
      } else {
        logActivity('goodsReceipt.cancel', id, {
          ...baseMemo,
          fromStatus: priorStatus,
          priorStatus,
        });
      }
    } catch (err) {
      if (err instanceof EntityConflictError) {
        const conflict = err as EntityConflictError<GoodsReceipt>;
        if (conflict.latest) setReceipt(conflict.latest);
        invalidateCache();
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        confirmHandlers.close();
        return;
      }
      notifications.show({
        color: 'red',
        message: t(
          confirmAction === 'confirmReceived'
            ? 'goodsReceipts.notifications.confirmError'
            : 'goodsReceipts.notifications.cancelError',
        ),
      });
    } finally {
      setActionLoading(false);
    }
  }, [id, receipt, confirmAction, t, invalidateCache, confirmHandlers]);

  const handleRepostInventory = useCallback(async () => {
    if (!receipt || receipt.status !== 'received') return;
    setReposting(true);
    try {
      const effect = await applyGoodsReceiptInventoryEffect(receipt, 'increment');
      await refreshPostingStatus(receipt);

      if (effect.failed > 0) {
        notifications.show({
          color: 'yellow',
          title: t('goodsReceipts.notifications.inventoryPartial'),

          message: effect.errors.slice(0, 5).join('\n') || undefined,
          autoClose: false,
        });
      } else {
        notifications.show({
          color: 'green',
          message: t('goodsReceipts.notifications.repostSuccess', {
            posted: effect.succeeded,
          }),
        });
      }

      logActivity('goodsReceipt.repostInventory', receipt.id, {
        receiptNumber: receipt.receiptNumber,
        ...vendorMemo(receipt),
        lineCount: receipt.items.length,
        inventoryAttempted: effect.attempted,
        inventoryFailed: effect.failed,
        alreadyPosted: effect.alreadyPosted,
      });
      repostHandlers.close();
    } catch {
      notifications.show({
        color: 'red',
        message: t('goodsReceipts.notifications.repostError'),
      });
    } finally {
      setReposting(false);
    }
  }, [receipt, refreshPostingStatus, t, repostHandlers]);

  const handleCopyReceipt = useCallback(() => {
    if (!receipt) return;
    const copyFrom: GoodsReceiptCopyFrom = {
      vendorCode: receipt.vendorCode,
      vendorName: receipt.vendorName,
      locationCode: receipt.locationCode,
      locationName: receipt.locationName,
      reference: receipt.reference || '',
      notes: receipt.notes || '',
      assignedTo: receipt.extra?.assignedTo,
      items: receipt.items,
      sourceId: receipt.id,
      sourceReceiptNumber: receipt.receiptNumber,
    };
    navigate(ROUTES.GOODS_RECEIPTS.NEW, { state: { copyFrom } });
  }, [receipt, navigate]);

  const handleSaveItemQuantity = useCallback(
    async (idx: number, newQty: number) => {
      if (!receipt) return;
      if (!Number.isFinite(newQty) || newQty < 0) return;
      const current = receipt.items[idx];
      if (!current) return;
      if (newQty === current.quantity) {
        setEditingItemIdx(null);
        return;
      }

      setSavingItem(true);
      const newItems = receipt.items.map((it, i) => (i === idx ? { ...it, quantity: newQty } : it));
      try {
        const updated = await useGoodsReceiptStore.getState().updateSafely({
          id: receipt.id,
          version: receipt.version,
          patch: { items: newItems },
        });
        setReceipt(updated);
        invalidateCache();

        const inlineFields: GoodsReceiptInlineFields = {
          quantity: {
            itemType: current.itemType,
            itemCode: current.itemCode,
            unit: current.unit,
            from: current.quantity,
            to: newQty,
          },
        };
        logActivity('goodsReceipt.update', receipt.id, {
          receiptNumber: receipt.receiptNumber,
          inlineEdit: true,
          fields: inlineFields,
        });
        notifications.show({
          color: 'green',
          message: t('goodsReceipts.notifications.updateSuccess'),
        });
        setEditingItemIdx(null);
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setReceipt(err.latest as GoodsReceipt);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
          setEditingItemIdx(null);
        } else {
          notifications.show({
            color: 'red',
            message: t('goodsReceipts.notifications.updateError'),
          });
        }
      } finally {
        setSavingItem(false);
      }
    },
    [receipt, invalidateCache, t],
  );

  const status = receipt ? findStatus(receipt.status) : null;
  const isDraft = receipt?.status === 'draft';
  const isReceived = receipt?.status === 'received';
  const isCancelled = receipt?.status === 'cancelled';

  const stockPostedOnDraft = !!receipt && isDraft && receipt.extra?.inventoryPosted === true;

  const showConfirmCta = !!receipt && canConfirmReceived && isDraft;

  const showCancelCta = !!receipt && canCancel && (isDraft || isReceived) && !isMobile;

  const showEditCta = !!receipt && canEdit && isDraft && !isMobile && !stockPostedOnDraft;

  const showCopyCta = !!receipt && canCreate && !isMobile;

  const canEditItems = !!receipt && canEdit && isDraft && !stockPostedOnDraft;

  const showRepostCta =
    !!receipt && isReceived && canConfirmReceived && (postingStatus?.missingCount ?? 0) > 0;

  return {
    receipt,
    loading,
    actionLoading,
    status,
    isDraft,
    isReceived,
    isCancelled,
    showConfirmCta,
    showCancelCta,
    showEditCta,
    showCopyCta,
    canEditItems,
    stockPostedOnDraft,
    confirmAction,
    confirmOpened,
    openConfirm,
    closeConfirm: confirmHandlers.close,
    runAction,
    handleCopyReceipt,
    postingStatus,
    postingStatusLoading,
    showRepostCta,
    repostOpened,
    openRepost: repostHandlers.open,
    closeRepost: repostHandlers.close,
    reposting,
    handleRepostInventory,
    editingItemIdx,
    setEditingItemIdx,
    savingItem,
    handleSaveItemQuantity,
  };
}
