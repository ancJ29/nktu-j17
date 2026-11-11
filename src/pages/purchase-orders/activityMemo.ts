import type { PurchaseOrder, PurchaseOrderItem } from '@/types';
import { diffItems, diffVendor, toMemoItem, vendorMemo } from '@/pages/goods-receipts/activityMemo';
import { poItems } from './purchaseOrderModel';

export function createMemo(
  order: Pick<PurchaseOrder, 'orderNumber' | 'vendorCode'>,
  items: readonly PurchaseOrderItem[],
) {
  return {
    orderNumber: order.orderNumber,
    ...vendorMemo(order),
    lineCount: items.length,
    items: items.map(toMemoItem),
  };
}

export function updateMemo(before: PurchaseOrder, after: PurchaseOrder) {
  const vendorDiff = diffVendor(before, after);
  return {
    orderNumber: after.orderNumber,
    ...vendorMemo(after),
    lineCount: poItems(after).length,
    itemDiff: diffItems(poItems(before), poItems(after)),
    ...(vendorDiff && { vendorDiff }),
  };
}

export function stateMemo(order: Pick<PurchaseOrder, 'orderNumber' | 'vendorCode'>) {
  return { orderNumber: order.orderNumber, ...vendorMemo(order) };
}

export function paymentMemo(
  order: Pick<PurchaseOrder, 'orderNumber' | 'vendorCode'>,
  next: {
    isPaid: boolean;
    state: 'unpaid' | 'partial' | 'paid';
    deadlineDay: string;

    tracking?: 'untracked' | 'tracked';
  },
) {
  return {
    ...stateMemo(order),
    isPaid: next.isPaid,
    payment: next.state,
    ...(next.deadlineDay ? { deadline: next.deadlineDay } : {}),
    ...(next.tracking ? { tracking: next.tracking } : {}),
  };
}
