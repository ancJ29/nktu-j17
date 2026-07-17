import type { SalesOrder, SalesOrderExtra } from '@/types';

export function orderNeedsVAT(extra: SalesOrderExtra | undefined): boolean {
  return extra?.needVAT !== false;
}

export function orderNeedsShippingFee(extra: SalesOrderExtra | undefined): boolean {
  return extra?.needShippingFee === true;
}

export type SalesOrderTotals = {
  
  subtotal: number;
  
  vat: number;
  
  shipping: number;
  
  grandTotal: number;
};

export function resolveOrderVatRate(
  extra: SalesOrderExtra | undefined,
  fallbackRate: number,
): number {
  return typeof extra?.vatRate === 'number' ? extra.vatRate : fallbackRate;
}

export function computeSalesOrderTotals(order: SalesOrder, fallbackRate: number): SalesOrderTotals {
  const extra = order.extra;
  const subtotal = typeof order.totalAmount === 'number' ? order.totalAmount : 0;
  const vat = orderNeedsVAT(extra) ? subtotal * resolveOrderVatRate(extra, fallbackRate) : 0;
  const shipping =
    orderNeedsShippingFee(extra) && typeof extra?.shippingFee === 'number' ? extra.shippingFee : 0;
  return { subtotal, vat, shipping, grandTotal: subtotal + vat + shipping };
}

export function isSalesOrderBillingExempt(extra: SalesOrderExtra | undefined): boolean {
  return extra?.billingNotRequired === true;
}

export function isSalesOrderMissingMoneyInfo(order: SalesOrder, fallbackRate: number): boolean {
  if (isSalesOrderBillingExempt(order.extra)) return false;
  return computeSalesOrderTotals(order, fallbackRate).grandTotal <= 0;
}

export type SalesOrderFinanceSummary = {
  
  count: number;
  
  subtotal: number;
  
  vat: number;
  
  shipping: number;
  
  grandTotal: number;
  
  missingCount: number;
};

export function sumSalesOrderFinance(
  orders: readonly SalesOrder[],
  fallbackRate: number,
): SalesOrderFinanceSummary {
  const acc: SalesOrderFinanceSummary = {
    count: 0,
    subtotal: 0,
    vat: 0,
    shipping: 0,
    grandTotal: 0,
    missingCount: 0,
  };
  for (const order of orders) {
    const totals = computeSalesOrderTotals(order, fallbackRate);
    acc.count += 1;
    acc.subtotal += totals.subtotal;
    acc.vat += totals.vat;
    acc.shipping += totals.shipping;
    acc.grandTotal += totals.grandTotal;
    if (totals.grandTotal <= 0 && !isSalesOrderBillingExempt(order.extra)) acc.missingCount += 1;
  }
  return acc;
}

export type SalesOrderPaymentState = 'paid' | 'partial' | 'unpaid';

export type SalesOrderPayment = {
  state: SalesOrderPaymentState;
  
  paidAmount: number;
  
  remaining: number;
};

export function resolveSalesOrderPaymentState(
  extra: SalesOrderExtra | undefined,
  grandTotal?: number,
): SalesOrderPayment {
  const paid = typeof extra?.paidAmount === 'number' && extra.paidAmount > 0 ? extra.paidAmount : 0;
  if (extra?.isPaid) {
    return { state: 'paid', paidAmount: grandTotal ?? paid, remaining: 0 };
  }
  if (paid <= 0) {
    return { state: 'unpaid', paidAmount: 0, remaining: grandTotal ?? 0 };
  }
  if (typeof grandTotal === 'number' && grandTotal > 0 && paid >= grandTotal) {
    return { state: 'paid', paidAmount: grandTotal, remaining: 0 };
  }
  return {
    state: 'partial',
    paidAmount: paid,
    remaining: typeof grandTotal === 'number' ? Math.max(grandTotal - paid, 0) : 0,
  };
}
