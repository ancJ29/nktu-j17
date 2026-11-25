import type { PurchaseOrder, PurchaseOrderStatus } from '@/types';
import { poExtra } from './purchaseOrderModel';

export function receivedMarkOffer(
  status: PurchaseOrderStatus | null,
  allowed: boolean,
): 'mark' | 'undo' | null {
  if (!allowed) return null;
  if (status === 'ready') return 'mark';
  if (status === 'received') return 'undo';
  return null;
}

export function receivedMarkPatch(order: PurchaseOrder, actor: string, now: string) {
  return {
    status: 'received' as const,
    receivedAt: now,
    extra: { ...poExtra(order), receivedBy: actor },
  };
}

export function receivedUndoPatch(order: PurchaseOrder) {
  return {
    status: 'ready' as const,
    receivedAt: null,
    extra: { ...poExtra(order), receivedBy: null },
  };
}
