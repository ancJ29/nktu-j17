export type PaymentsTab = 'receivable' | 'payable';

export type PaymentsAccessInput = {
  readonly salesOrdersEnabled: boolean;
  readonly purchaseOrdersEnabled: boolean;
  readonly pricingEnabled: boolean;
  readonly salesOrderMoney: boolean;
  readonly purchaseOrderMoney: boolean;
};

export function allowedPaymentsTabs(a: PaymentsAccessInput): PaymentsTab[] {
  if (!a.pricingEnabled) return [];
  const tabs: PaymentsTab[] = [];
  if (a.salesOrdersEnabled && a.salesOrderMoney) tabs.push('receivable');
  if (a.purchaseOrdersEnabled && a.purchaseOrderMoney) tabs.push('payable');
  return tabs;
}

export function resolvePaymentsTab(
  requested: unknown,
  allowed: readonly PaymentsTab[],
): PaymentsTab | undefined {
  return allowed.find((t) => t === requested) ?? allowed[0];
}
