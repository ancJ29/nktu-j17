import { encodeFilterBlob } from '@/hooks/useUrlFilterState';
import { ROUTES } from '@/constants/routes';
import type { PurchaseOrder } from '@/types';
import {
  currencyDecimals,
  isOverdue,
  poCurrency,
  poExtra,
  poPayment,
  poPaymentDeadlineDay,
  poStatus,
  roundMoney,
} from '@/pages/purchase-orders/purchaseOrderModel';

export const PAYABLES_WINDOW_DAYS = 90;

export type PayableCurrency = ReturnType<typeof poCurrency>;

export type PayableRow = {
  vendorCode: string;
  currency: PayableCurrency;

  orderCount: number;

  overdue: number;

  notYetDue: number;

  undated: number;

  total: number;

  earliestDue: string;
};

export function groupPayables(orders: readonly PurchaseOrder[], todayVn: string): PayableRow[] {
  const rows = new Map<string, PayableRow>();
  for (const po of orders) {
    if (poStatus(po) === 'cancelled' || poExtra(po).isDeleted === true) continue;
    const payment = poPayment(po);
    if (payment.state === 'paid') continue;

    const currency = poCurrency(po);
    const vendorCode = typeof po.vendorCode === 'string' ? po.vendorCode : '';
    const key = `${vendorCode}\u0000${currency}`;
    let row = rows.get(key);
    if (!row) {
      row = {
        vendorCode,
        currency,
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
    const day = poPaymentDeadlineDay(po);
    if (day === '') row.undated += payment.remaining;
    else if (isOverdue(po, todayVn)) row.overdue += payment.remaining;
    else row.notYetDue += payment.remaining;
    if (day !== '' && (row.earliestDue === '' || day < row.earliestDue)) row.earliestDue = day;
  }
  const out = [...rows.values()];
  for (const r of out) {
    r.overdue = roundMoney(r.overdue, r.currency);
    r.notYetDue = roundMoney(r.notYetDue, r.currency);
    r.undated = roundMoney(r.undated, r.currency);
    r.total = roundMoney(r.total, r.currency);
  }
  return out.sort(compareRows);
}

function compareRows(a: PayableRow, b: PayableRow): number {
  if (a.currency !== b.currency) return a.currency < b.currency ? -1 : 1;
  if (a.overdue !== b.overdue) return b.overdue - a.overdue;
  if (a.earliestDue !== b.earliestDue) {
    if (a.earliestDue === '') return 1;
    if (b.earliestDue === '') return -1;
    return a.earliestDue < b.earliestDue ? -1 : 1;
  }
  return a.vendorCode < b.vendorCode ? -1 : a.vendorCode > b.vendorCode ? 1 : 0;
}

export type PayableTotals = {
  currency: PayableCurrency;
  overdue: number;
  notYetDue: number;
  undated: number;
  total: number;
};

export function sumPayablesByCurrency(rows: readonly PayableRow[]): PayableTotals[] {
  const by = new Map<PayableCurrency, PayableTotals>();
  for (const r of rows) {
    const t = by.get(r.currency) ?? {
      currency: r.currency,
      overdue: 0,
      notYetDue: 0,
      undated: 0,
      total: 0,
    };
    t.overdue += r.overdue;
    t.notYetDue += r.notYetDue;
    t.undated += r.undated;
    t.total += r.total;
    by.set(r.currency, t);
  }
  const f = (n: number, c: PayableCurrency) => {
    const d = 10 ** currencyDecimals(c);
    return Math.round(n * d) / d;
  };
  return [...by.values()]
    .map((t) => ({
      currency: t.currency,
      overdue: f(t.overdue, t.currency),
      notYetDue: f(t.notYetDue, t.currency),
      undated: f(t.undated, t.currency),
      total: f(t.total, t.currency),
    }))
    .sort((a, b) => (a.currency < b.currency ? -1 : 1));
}

export function payableListUrl(vendorCode: string): string {
  const blob = encodeFilterBlob({ ...(vendorCode ? { v: vendorCode } : {}), p: 'unpaid' });
  return `${ROUTES.PURCHASE_ORDERS.LIST}?f=${blob}`;
}
