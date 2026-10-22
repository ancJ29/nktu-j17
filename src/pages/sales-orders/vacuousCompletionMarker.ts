import type { SalesOrder, SalesOrderExtra } from '@/types';
import { getAutoCompletionTargetValue } from './transitionEngine';

export function isVacuouslyCompletedSalesOrder(
  so: SalesOrder,
  hasLinkedDeliveryRequest: boolean,
): boolean {
  if (hasLinkedDeliveryRequest) return false;
  if ((so.items?.length ?? 0) > 0) return false;
  const target = getAutoCompletionTargetValue();
  if (!target) return false;
  return ((so.extra as SalesOrderExtra | undefined)?.status ?? '') === target;
}

export function collectVacuouslyCompletedSalesOrderIds(
  orders: readonly SalesOrder[],
  salesOrderIdsWithDeliveryRequest: ReadonlySet<string>,
): Set<string> {
  const flagged = new Set<string>();
  for (const so of orders) {
    if (isVacuouslyCompletedSalesOrder(so, salesOrderIdsWithDeliveryRequest.has(so.id))) {
      flagged.add(so.id);
    }
  }
  return flagged;
}
