import type { PurchaseOrder } from '@/types';
import { RECEIVABLE_FILTERS, type ReceivableFilter } from './receivables';
import {
  isOverdue,
  poCurrency,
  poExtra,
  poIsPaid,
  poPayment,
  poPaymentDeadlineDay,
  poPaymentUntracked,
  poStatus,
  roundMoney,
} from '@/pages/purchase-orders/purchaseOrderModel';

export const PAYABLES_WINDOW_DAYS = 90;

export type PayableCurrency = ReturnType<typeof poCurrency>;

export type PayableBucket = 'overdue' | 'notYetDue' | 'undated';

export type Payable = {
  bucket: PayableBucket;

  remaining: number;
  currency: PayableCurrency;

  dueDay: string;
};

export function payableOf(po: PurchaseOrder, todayVn: string): Payable | null {
  if (poStatus(po) === 'cancelled' || poExtra(po).isDeleted === true) return null;
  if (poPaymentUntracked(po)) return null;
  const payment = poPayment(po);
  if (payment.state === 'paid') return null;
  const dueDay = poPaymentDeadlineDay(po);
  const bucket: PayableBucket =
    dueDay === '' ? 'undated' : isOverdue(po, todayVn) ? 'overdue' : 'notYetDue';
  return { bucket, remaining: payment.remaining, currency: poCurrency(po), dueDay };
}

export type PayableFilter = ReceivableFilter;

export function matchesPayableFilter(
  po: PurchaseOrder,
  filter: PayableFilter,
  todayVn: string,
): boolean {
  if (poStatus(po) === 'cancelled' || poExtra(po).isDeleted === true) return false;
  if (filter === 'all') return true;
  if (filter === 'untracked') return poPaymentUntracked(po);
  if (poPaymentUntracked(po)) return false;
  if (filter === 'overdue') return isOverdue(po, todayVn);
  if (filter === 'unpaid') return !poIsPaid(po);
  return poIsPaid(po);
}

export function countPayablesByFilter(
  orders: readonly PurchaseOrder[],
  todayVn: string,
): Record<PayableFilter, number> {
  const counts: Record<PayableFilter, number> = {
    unpaid: 0,
    overdue: 0,
    paid: 0,
    untracked: 0,
    all: 0,
  };
  for (const po of orders) {
    for (const f of RECEIVABLE_FILTERS) {
      if (matchesPayableFilter(po, f, todayVn)) counts[f] += 1;
    }
  }
  return counts;
}

export function sumPayables(orders: readonly PurchaseOrder[], todayVn: string): PayableTotals[] {
  const by = new Map<PayableCurrency, PayableTotals>();
  for (const po of orders) {
    const r = payableOf(po, todayVn);
    if (!r) continue;
    const t = by.get(r.currency) ?? {
      currency: r.currency,
      overdue: 0,
      notYetDue: 0,
      undated: 0,
      total: 0,
    };
    t[r.bucket] += r.remaining;
    t.total += r.remaining;
    by.set(r.currency, t);
  }
  return [...by.values()]
    .map((t) => ({
      currency: t.currency,
      overdue: roundMoney(t.overdue, t.currency),
      notYetDue: roundMoney(t.notYetDue, t.currency),
      undated: roundMoney(t.undated, t.currency),
      total: roundMoney(t.total, t.currency),
    }))
    .sort((a, b) => (a.currency < b.currency ? -1 : 1));
}

export type PayableTotals = {
  currency: PayableCurrency;
  overdue: number;
  notYetDue: number;
  undated: number;
  total: number;
};
