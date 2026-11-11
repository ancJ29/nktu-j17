import { getCurrentActorId } from '@/hooks';
import { EntityConflictError } from '@/stores/createEntityStore';
import { purchaseOrderBundle } from '@/stores/usePurchaseOrderStore';
import type { PurchaseOrder } from '@/types';
import { logActivity } from '@/utils/activityLogger';
import { paymentMemo } from './activityMemo';
import { poExtra, poIsPaid, poPayment, vnDayOf } from './purchaseOrderModel';

export type PurchaseOrderPaymentNext = {
  isPaid: boolean;
  paidAmount: number;
  paymentDeadline: string;
};

export const paidInFull = (order: PurchaseOrder): PurchaseOrderPaymentNext => ({
  isPaid: true,
  paidAmount: 0,
  paymentDeadline: order.paymentDeadline ?? '',
});

export function purchaseOrderPaymentPatch(
  order: PurchaseOrder,
  next: PurchaseOrderPaymentNext,
  actorId: string | undefined = getCurrentActorId(),
): Record<string, unknown> {
  const wasPaid = order.isPaid === true;
  return {
    isPaid: next.isPaid,

    paidAmount: next.isPaid ? 0 : next.paidAmount,

    paymentDeadline: next.paymentDeadline,
    paidAt: next.isPaid ? (wasPaid && order.paidAt ? order.paidAt : new Date().toISOString()) : '',
    extra: {
      ...poExtra(order),
      paidBy: next.isPaid ? (wasPaid ? poExtra(order).paidBy : actorId) : undefined,
    },
  };
}

export function logPurchaseOrderPayment(
  order: PurchaseOrder,
  next: PurchaseOrderPaymentNext,
): void {
  logActivity(
    'purchaseOrder.payment',
    order.id,
    paymentMemo(order, {
      isPaid: next.isPaid,
      state: next.isPaid ? 'paid' : next.paidAmount > 0 ? 'partial' : 'unpaid',
      deadlineDay: vnDayOf(next.paymentDeadline),
    }),
  );
}

export function purchaseOrderTrackingPatch(untrack: boolean): Record<string, unknown> {
  return { paymentUntracked: untrack };
}

export function logPurchaseOrderTracking(order: PurchaseOrder, untrack: boolean): void {
  logActivity(
    'purchaseOrder.payment',
    order.id,
    paymentMemo(order, {
      isPaid: poIsPaid(order),
      state: poPayment(order).state,
      deadlineDay: '',
      tracking: untrack ? 'untracked' : 'tracked',
    }),
  );
}

async function write(order: PurchaseOrder, patch: Record<string, unknown>): Promise<PurchaseOrder> {
  try {
    return await purchaseOrderBundle.updateSafely({
      id: order.id,
      version: order.version,
      patch,
    });
  } catch (err) {
    if (err instanceof EntityConflictError && err.latest) {
      purchaseOrderBundle.useStore.getState().upsertItem(err.latest as PurchaseOrder);
    }
    throw err;
  }
}

export async function writePurchaseOrderPayment(
  order: PurchaseOrder,
  next: PurchaseOrderPaymentNext,
): Promise<PurchaseOrder> {
  const updated = await write(order, purchaseOrderPaymentPatch(order, next));
  logPurchaseOrderPayment(order, next);
  return updated;
}

export async function writePurchaseOrderTracking(
  order: PurchaseOrder,
  untrack: boolean,
): Promise<PurchaseOrder> {
  const updated = await write(order, purchaseOrderTrackingPatch(untrack));
  logPurchaseOrderTracking(order, untrack);
  return updated;
}
