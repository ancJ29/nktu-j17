import type { SalesOrderV2 } from '@/types/sales-order-v2';

export type SalesOrderDelivery = {
  readonly ordered: number;

  readonly delivered: number;

  readonly remaining: number;
  readonly state: 'none' | 'partial' | 'complete';
};

export function salesOrderDeliveryOf(order: SalesOrderV2): SalesOrderDelivery {
  const delivered = order.items.reduce((sum, line) => sum + (line.deliveredQuantity ?? 0), 0);
  const remaining = order.items.reduce(
    (sum, line) => sum + Math.max(0, line.quantity - (line.deliveredQuantity ?? 0)),
    0,
  );
  return {
    ordered: order.totalQuantity,
    delivered,
    remaining,

    state: remaining === 0 ? 'complete' : delivered === 0 ? 'none' : 'partial',
  };
}
