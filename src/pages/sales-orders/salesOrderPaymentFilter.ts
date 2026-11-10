import type { SalesOrder } from '@/types';
import {
  computeSalesOrderTotals,
  isSalesOrderOverdue,
  resolveSalesOrderPaymentState,
} from '@/utils/salesOrderPricing';

export type SalesOrderPaymentFilter = 'unpaid' | 'overdue' | 'paid';

export const PAYMENT_FILTERS: readonly SalesOrderPaymentFilter[] = ['unpaid', 'overdue', 'paid'];

export function parsePaymentFilter(v: unknown): SalesOrderPaymentFilter | undefined {
  return PAYMENT_FILTERS.includes(v as SalesOrderPaymentFilter)
    ? (v as SalesOrderPaymentFilter)
    : undefined;
}

export function matchesPaymentFilter(
  order: SalesOrder,
  filter: SalesOrderPaymentFilter,
  todayVn: string,
  fallbackRate: number,
): boolean {
  if (order.extra?.cancellation != null) return false;
  if (filter === 'overdue') return isSalesOrderOverdue(order, todayVn, fallbackRate);
  const { grandTotal } = computeSalesOrderTotals(order, fallbackRate);
  const paid = resolveSalesOrderPaymentState(order.extra, grandTotal).state === 'paid';
  return filter === 'paid' ? paid : !paid;
}

export function effectiveStatusSelection(a: {
  readonly selection: readonly string[] | undefined;
  readonly defaultSelection: readonly string[];
  readonly paymentFilter: SalesOrderPaymentFilter | undefined;
  readonly allStatuses: readonly string[];
  readonly cancellationTarget: string | undefined;
}): string[] {
  if (a.selection) return [...a.selection];
  if (a.paymentFilter && a.defaultSelection.length > 0) {
    return a.allStatuses.filter((s) => s !== a.cancellationTarget);
  }
  return [...a.defaultSelection];
}
