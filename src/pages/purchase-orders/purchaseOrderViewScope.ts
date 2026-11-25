import type { PurchaseOrder } from '@/types';
import { perms } from '@/utils/permission';

export type PurchaseOrderViewScope = {
  canViewAll: boolean;
  canViewSelf: boolean;
};

export function purchaseOrderViewScope(): PurchaseOrderViewScope {
  return {
    canViewAll: perms.purchaseOrder.canViewAll(),
    canViewSelf: perms.purchaseOrder.canViewSelf(),
  };
}

export function isScopeConfigured(scope: PurchaseOrderViewScope): boolean {
  return scope.canViewAll || scope.canViewSelf;
}

export function canViewPurchaseOrder(
  order: PurchaseOrder,
  viewerId: string | null,
  scope: PurchaseOrderViewScope,
): boolean {
  if (!isScopeConfigured(scope) || scope.canViewAll) return true;
  if (!scope.canViewSelf || !viewerId) return false;
  const extra = order.extra;
  return (
    extra?.createdBy === viewerId ||
    extra?.assignedTo === viewerId ||
    extra?.requestedBy === viewerId
  );
}

export function scopePurchaseOrdersToViewer(
  orders: PurchaseOrder[],
  viewerId: string | null,
  scope: PurchaseOrderViewScope,
): PurchaseOrder[] {
  if (!isScopeConfigured(scope) || scope.canViewAll) return orders;
  return orders.filter((o) => canViewPurchaseOrder(o, viewerId, scope));
}
