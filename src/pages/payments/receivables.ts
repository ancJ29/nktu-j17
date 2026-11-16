import type { SalesOrder } from '@/types';
import {
  computeSalesOrderTotals,
  isSalesOrderBillingExempt,
  isSalesOrderOverdue,
  isSalesOrderPaymentUntracked,
  resolveSalesOrderPaymentState,
  salesOrderDeadlineDay,
} from '@/utils/salesOrderPricing';

export const RECEIVABLES_WINDOW_DAYS = 90;

export type ReceivableBucket = 'overdue' | 'notYetDue' | 'undated';

export type Receivable = {
  bucket: ReceivableBucket;

  remaining: number;

  dueDay: string;
};

export function receivableOf(
  order: SalesOrder,
  todayVn: string,
  fallbackRate: number,
): Receivable | null {
  const extra = order.extra;
  if (
    extra?.cancellation != null ||
    isSalesOrderBillingExempt(extra) ||
    isSalesOrderPaymentUntracked(extra)
  ) {
    return null;
  }
  const { grandTotal } = computeSalesOrderTotals(order, fallbackRate);
  const payment = resolveSalesOrderPaymentState(extra, grandTotal);
  if (payment.state === 'paid') return null;
  const dueDay = salesOrderDeadlineDay(extra);
  const bucket: ReceivableBucket =
    dueDay === ''
      ? 'undated'
      : isSalesOrderOverdue(order, todayVn, fallbackRate)
        ? 'overdue'
        : 'notYetDue';
  return { bucket, remaining: payment.remaining, dueDay };
}

export type ReceivableFilter = 'unpaid' | 'overdue' | 'paid' | 'untracked' | 'all';

export const RECEIVABLE_FILTERS: readonly ReceivableFilter[] = [
  'unpaid',
  'overdue',
  'paid',
  'untracked',
  'all',
];
export const DEFAULT_RECEIVABLE_FILTER: ReceivableFilter = 'unpaid';

export function parseReceivableFilter(v: unknown): ReceivableFilter {
  return RECEIVABLE_FILTERS.includes(v as ReceivableFilter)
    ? (v as ReceivableFilter)
    : DEFAULT_RECEIVABLE_FILTER;
}

export function matchesReceivableFilter(
  order: SalesOrder,
  filter: ReceivableFilter,
  todayVn: string,
  fallbackRate: number,
): boolean {
  const extra = order.extra;
  if (extra?.cancellation != null) return false;
  if (filter === 'all') return true;
  if (isSalesOrderBillingExempt(extra)) return false;

  if (filter === 'untracked') return isSalesOrderPaymentUntracked(extra);
  if (isSalesOrderPaymentUntracked(extra)) return false;
  if (filter === 'overdue') return isSalesOrderOverdue(order, todayVn, fallbackRate);
  if (filter === 'unpaid') return receivableOf(order, todayVn, fallbackRate) !== null;
  const { grandTotal } = computeSalesOrderTotals(order, fallbackRate);
  return resolveSalesOrderPaymentState(extra, grandTotal).state === 'paid';
}

export function countReceivablesByFilter(
  orders: readonly SalesOrder[],
  todayVn: string,
  fallbackRate: number,
): Record<ReceivableFilter, number> {
  const counts: Record<ReceivableFilter, number> = {
    unpaid: 0,
    overdue: 0,
    paid: 0,
    untracked: 0,
    all: 0,
  };
  for (const order of orders) {
    for (const f of RECEIVABLE_FILTERS) {
      if (matchesReceivableFilter(order, f, todayVn, fallbackRate)) counts[f] += 1;
    }
  }
  return counts;
}

export type ReceivableSums = {
  overdue: number;
  notYetDue: number;
  undated: number;
  total: number;
};

export function sumReceivables(
  orders: readonly SalesOrder[],
  todayVn: string,
  fallbackRate: number,
): ReceivableSums {
  const sums: ReceivableSums = { overdue: 0, notYetDue: 0, undated: 0, total: 0 };
  for (const order of orders) {
    const r = receivableOf(order, todayVn, fallbackRate);
    if (!r) continue;
    sums[r.bucket] += r.remaining;
    sums.total += r.remaining;
  }
  return sums;
}

export function scopeReceivableOrders(
  orders: readonly SalesOrder[],
  scope: { canViewAll: boolean; canViewSelf: boolean; me: string | undefined },
): SalesOrder[] {
  const live = orders.filter((o) => !o.extra?.isDeleted);
  if (scope.canViewAll) return live;
  if (!scope.canViewSelf || !scope.me) return [];
  return live.filter((o) => o.extra?.assignedStaff === scope.me);
}
