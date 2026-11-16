import { EntityConflictError } from '@/stores/createEntityStore';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import type { SalesOrder } from '@/types';
import { canRecordSalesOrderPayment } from '@/pages/sales-orders/salesOrderPaymentGate';
import {
  patchSalesOrderMeta,
  salesOrderPaymentPatch,
  type SalesOrderMetaPatch,
} from '@/pages/sales-orders/salesOrderMetaPatch';
import { receivableOf } from './receivables';

export function viewerMayMark(
  order: SalesOrder,
  viewer: { showPrice: boolean; canManagePayment: boolean },
): boolean {
  return canRecordSalesOrderPayment({
    showPrice: viewer.showPrice,
    canManagePayment: viewer.canManagePayment,
    cancelled: order.extra?.cancellation != null,
  });
}

export function isMarkable(order: SalesOrder, todayVn: string, vatRate: number): boolean {
  return receivableOf(order, todayVn, vatRate) !== null;
}

export const PAID_IN_FULL_PATCH: SalesOrderMetaPatch = salesOrderPaymentPatch(
  { state: 'paid', deadlineDay: '' },
  false,
);

export async function writeReceivableMark(
  order: SalesOrder,
  patch: SalesOrderMetaPatch,
): Promise<SalesOrder> {
  try {
    return await patchSalesOrderMeta(order, patch);
  } catch (err) {
    if (err instanceof EntityConflictError && err.latest) {
      useSalesOrderStore.getState().upsertItem(err.latest as SalesOrder);
    }
    throw err;
  }
}
