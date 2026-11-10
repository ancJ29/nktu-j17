import { EntityConflictError } from '@/stores/createEntityStore';
import { purchaseOrderBundle } from '@/stores/usePurchaseOrderStore';
import { cMngtConnector } from '@credo/connectors/connector';
import { asyncDeduplicator, logger } from '@credo/base-ui/utils';
import { businessDateString } from '@/utils/code';
import { logActivity } from '@/utils/activityLogger';
import type {
  GoodsReceipt,
  GoodsReceiptExtra,
  GoodsReceiptFromOrder,
  GoodsReceiptItem,
  PurchaseOrder,
} from '@/types';
import {
  plannedArrivalIso,
  poExtra,
  poItems,
  poReceiptIds,
  poStatus,
  vnDayOf,
} from './purchaseOrderModel';

export function toReceiptSeed(po: PurchaseOrder): GoodsReceiptFromOrder {
  const items: GoodsReceiptItem[] = poItems(po).map((i) => ({
    itemType: 'product',
    itemCode: i.itemCode,
    itemName: i.itemName,
    quantity: i.quantity,
    unit: i.unit,
    ...(i.note ? { note: i.note } : {}),
    ...(typeof i.packageCount === 'number' && i.packageCount > 0
      ? { packageCount: i.packageCount }
      : {}),
  }));
  const assignedTo = poExtra(po).assignedTo;

  const expectedDate = plannedArrivalIso(po);
  return {
    orderId: po.id,
    orderNumber: po.orderNumber,
    vendorCode: po.vendorCode,
    vendorName: po.vendorName,
    locationCode: po.locationCode,
    locationName: po.locationName,
    ...(expectedDate ? { expectedDate } : {}),
    ...(assignedTo ? { assignedTo } : {}),
    items,
  };
}

export type LinkResult = 'linked' | 'alreadyLinked' | 'failed';

export async function linkReceiptToOrder(orderId: string, receiptId: string): Promise<LinkResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { item } = await purchaseOrderBundle.fetchById(orderId);
      const ids = poReceiptIds(item);
      if (ids.includes(receiptId)) return 'alreadyLinked';
      await purchaseOrderBundle.updateSafely({
        id: orderId,
        version: item.version,
        patch: { receiptIds: [...ids, receiptId] },
      });
      logActivity('purchaseOrder.receiptLinked', orderId, {
        orderNumber: item.orderNumber,
        receiptId,
      });
      return 'linked';
    } catch (err) {
      if (err instanceof EntityConflictError && attempt === 0) continue;
      logger.error('Linking a receipt to its purchase order failed:', err);
      return 'failed';
    }
  }
  return 'failed';
}

export function liveReceipt(r: Pick<GoodsReceipt, 'status'>): boolean {
  return r.status !== 'cancelled';
}

export type ReceiptsRead =
  { readonly kind: 'ok'; readonly receipts: GoodsReceipt[] } | { readonly kind: 'unreadable' };

export async function readLinkedReceipts(po: PurchaseOrder): Promise<ReceiptsRead> {
  try {
    const receipts = await Promise.all(
      poReceiptIds(po).map((id) =>
        asyncDeduplicator.call(`goods-receipt:${id}`, async () => {
          const res = await cMngtConnector.getGoodsReceiptById({ id });
          return res.goodsReceipt as GoodsReceipt;
        }),
      ),
    );
    return { kind: 'ok', receipts };
  } catch (err) {
    logger.error('Reading the receipts of a purchase order failed:', err);
    return { kind: 'unreadable' };
  }
}

export async function findReceiptsForOrder(po: PurchaseOrder): Promise<ReceiptsRead> {
  const today = businessDateString();
  const from = vnDayOf(po.readyAt) || vnDayOf(po.createdAt) || today;
  try {
    const res = await cMngtConnector.queryGoodsReceipts<GoodsReceiptExtra>({
      fromPeriod: from,
      toPeriod: today,
    });
    return {
      kind: 'ok',
      receipts: (res.goodsReceipts as GoodsReceipt[]).filter(
        (r) => r.extra?.purchaseOrderId === po.id,
      ),
    };
  } catch (err) {
    logger.error('Searching receipts for a purchase order failed:', err);
    return { kind: 'unreadable' };
  }
}

export type ReceivableVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'notReady' | 'hasLiveReceipt' | 'unreadable' };

export function judgeReceivable(po: PurchaseOrder, read: ReceiptsRead): ReceivableVerdict {
  if (poStatus(po) !== 'ready') return { ok: false, reason: 'notReady' };
  if (read.kind === 'unreadable') return { ok: false, reason: 'unreadable' };
  if (read.receipts.some(liveReceipt)) return { ok: false, reason: 'hasLiveReceipt' };
  return { ok: true };
}

export async function checkOrderReceivable(orderId: string): Promise<ReceivableVerdict> {
  let po: PurchaseOrder;
  try {
    po = (await purchaseOrderBundle.fetchById(orderId)).item;
  } catch (err) {
    logger.error('Reading the purchase order before its receipt failed:', err);
    return { ok: false, reason: 'unreadable' };
  }
  return judgeReceivable(po, await readLinkedReceipts(po));
}
