import type { PurchaseOrderStatus } from '@/types';

type StatusLabelKey =
  | 'purchaseOrders.statuses.draft'
  | 'purchaseOrders.statuses.ready'
  | 'purchaseOrders.statuses.received'
  | 'purchaseOrders.statuses.cancelled';

export type PurchaseOrderStatusOption = {
  value: PurchaseOrderStatus;
  labelKey: StatusLabelKey;
  color: string;
};

export const PURCHASE_ORDER_STATUSES: readonly PurchaseOrderStatusOption[] = [
  { value: 'draft', labelKey: 'purchaseOrders.statuses.draft', color: 'gray' },
  { value: 'ready', labelKey: 'purchaseOrders.statuses.ready', color: 'blue' },
  { value: 'received', labelKey: 'purchaseOrders.statuses.received', color: 'green' },
  { value: 'cancelled', labelKey: 'purchaseOrders.statuses.cancelled', color: 'red' },
];

export function findPurchaseOrderStatus(value: unknown): PurchaseOrderStatusOption {
  return PURCHASE_ORDER_STATUSES.find((s) => s.value === value) ?? PURCHASE_ORDER_STATUSES[0]!;
}

const NEXT: Record<PurchaseOrderStatus, readonly PurchaseOrderStatus[]> = {
  draft: ['ready', 'cancelled'],
  ready: ['received', 'cancelled'],
  received: ['ready'],
  cancelled: [],
};

export function printOffered(status: PurchaseOrderStatus | null, vendorVisible: boolean): boolean {
  return vendorVisible && (status === 'draft' || status === 'ready' || status === 'received');
}

export function canTransitionPurchaseOrder(
  from: PurchaseOrderStatus,
  to: PurchaseOrderStatus,
): boolean {
  return NEXT[from].includes(to);
}
