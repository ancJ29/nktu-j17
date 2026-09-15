import type { SalesOrderV2 } from '@/types/sales-order-v2';
import { filterRevenueOrders, type RevenueScope } from './buildRevenueReport';

export interface BreakdownEntry {
  key: string;
  label: string;
  revenue: number;
  orders: number;
  pricedOrders: number;
  unpricedOrders: number;
}

export interface RevenueBreakdown {
  entries: BreakdownEntry[];
  totals: { revenue: number; orders: number; pricedOrders: number; unpricedOrders: number };

  unknownStatusOrders: number;
}

export function buildRevenueBreakdown(
  rows: ReadonlyArray<SalesOrderV2>,
  input: RevenueScope & {
    dimensionOf: (order: SalesOrderV2) => { key: string; label: string };
  },
): RevenueBreakdown {
  const { orders, unknownStatusOrders } = filterRevenueOrders(rows, input);

  const byKey = new Map<string, BreakdownEntry>();
  const totals = { revenue: 0, orders: 0, pricedOrders: 0, unpricedOrders: 0 };
  for (const { order } of orders) {
    const dim = input.dimensionOf(order);
    let entry = byKey.get(dim.key);
    if (!entry) {
      entry = {
        key: dim.key,
        label: dim.label,
        revenue: 0,
        orders: 0,
        pricedOrders: 0,
        unpricedOrders: 0,
      };
      byKey.set(dim.key, entry);
    }
    entry.orders += 1;
    totals.orders += 1;
    if (typeof order.totalAmount === 'number') {
      entry.pricedOrders += 1;
      entry.revenue += order.totalAmount;
      totals.pricedOrders += 1;
      totals.revenue += order.totalAmount;
    } else {
      entry.unpricedOrders += 1;
      totals.unpricedOrders += 1;
    }
  }

  const entries = [...byKey.values()].sort(
    (a, b) => b.revenue - a.revenue || b.orders - a.orders || a.label.localeCompare(b.label, 'vi'),
  );

  return { entries, totals, unknownStatusOrders };
}
