import { encodeFilterBlob } from '@/hooks/useUrlFilterState';
import { ROUTES } from '@/constants/routes';
import type { SalesOrder } from '@/types';
import { defaultLastNDaysRange, serializeDateRange } from '@/utils/listFilterDateRange';
import {
  computeSalesOrderTotals,
  isSalesOrderBillingExempt,
  isSalesOrderOverdue,
  resolveSalesOrderPaymentState,
  salesOrderDeadlineDay,
} from '@/utils/salesOrderPricing';

export const RECEIVABLES_WINDOW_DAYS = 90;

export const WALK_IN_KEY = '';

export type ReceivableRow = {
  customerCode: string;

  orderCount: number;

  overdue: number;

  notYetDue: number;

  undated: number;

  total: number;

  earliestDue: string;
};

export function groupReceivables(
  orders: readonly SalesOrder[],
  todayVn: string,
  fallbackRate: number,
): ReceivableRow[] {
  const rows = new Map<string, ReceivableRow>();
  for (const order of orders) {
    const extra = order.extra;
    if (extra?.cancellation != null || isSalesOrderBillingExempt(extra)) continue;
    const { grandTotal } = computeSalesOrderTotals(order, fallbackRate);
    const payment = resolveSalesOrderPaymentState(extra, grandTotal);
    if (payment.state === 'paid') continue;

    const key = extra?.customerCode || WALK_IN_KEY;
    let row = rows.get(key);
    if (!row) {
      row = {
        customerCode: key,
        orderCount: 0,
        overdue: 0,
        notYetDue: 0,
        undated: 0,
        total: 0,
        earliestDue: '',
      };
      rows.set(key, row);
    }
    row.orderCount += 1;
    row.total += payment.remaining;
    const day = salesOrderDeadlineDay(extra);
    if (day === '') row.undated += payment.remaining;
    else if (isSalesOrderOverdue(order, todayVn, fallbackRate)) row.overdue += payment.remaining;
    else row.notYetDue += payment.remaining;
    if (day !== '' && (row.earliestDue === '' || day < row.earliestDue)) row.earliestDue = day;
  }
  return [...rows.values()].sort(compareReceivableRows);
}

function compareReceivableRows(a: ReceivableRow, b: ReceivableRow): number {
  if (a.overdue !== b.overdue) return b.overdue - a.overdue;
  if (a.earliestDue !== b.earliestDue) {
    if (a.earliestDue === '') return 1;
    if (b.earliestDue === '') return -1;
    return a.earliestDue < b.earliestDue ? -1 : 1;
  }
  return a.customerCode < b.customerCode ? -1 : a.customerCode > b.customerCode ? 1 : 0;
}

export function receivableListUrl(customerCode: string): string {
  const blob = encodeFilterBlob({
    v: 'finance',
    ...(customerCode !== WALK_IN_KEY ? { c: customerCode } : {}),
    pf: 'unpaid',
    cd: serializeDateRange(defaultLastNDaysRange(RECEIVABLES_WINDOW_DAYS)),
  });
  return `${ROUTES.SALES_ORDERS.LIST}?f=${blob}`;
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
