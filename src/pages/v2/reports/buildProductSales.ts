import type { SalesOrderV2 } from '@/types/sales-order-v2';
import { filterRevenueOrders, type RevenueScope } from './buildRevenueReport';

export interface ProductSalesEntry {
  key: string;

  name: string;
  code: string;
  unit?: string;

  quantity: number;

  revenue: number;
  pricedLines: number;
  unpricedLines: number;

  orders: number;
}

export interface ProductSalesReport {
  entries: ProductSalesEntry[];

  totals: { revenue: number; orders: number };
  unknownStatusOrders: number;
}

export function buildProductSales(
  rows: ReadonlyArray<SalesOrderV2>,
  scope: RevenueScope,
): ProductSalesReport {
  const { orders, unknownStatusOrders } = filterRevenueOrders(rows, scope);

  const byKey = new Map<string, ProductSalesEntry>();
  let revenue = 0;
  for (const { order } of orders) {
    const seen = new Set<string>();
    for (const line of order.items ?? []) {
      const key = `${line.itemType}:${line.itemId}`;
      let entry = byKey.get(key);
      if (!entry) {
        entry = {
          key,
          name: line.itemName,
          code: line.itemCode,
          ...(line.unit ? { unit: line.unit } : {}),
          quantity: 0,
          revenue: 0,
          pricedLines: 0,
          unpricedLines: 0,
          orders: 0,
        };
        byKey.set(key, entry);
      }
      entry.quantity += line.quantity;
      if (typeof line.lineTotal === 'number') {
        entry.pricedLines += 1;
        entry.revenue += line.lineTotal;
        revenue += line.lineTotal;
      } else {
        entry.unpricedLines += 1;
      }
      if (!seen.has(key)) {
        seen.add(key);
        entry.orders += 1;
      }
    }
  }

  const entries = [...byKey.values()].sort(
    (a, b) =>
      b.revenue - a.revenue || b.quantity - a.quantity || a.name.localeCompare(b.name, 'vi'),
  );

  return { entries, totals: { revenue, orders: orders.length }, unknownStatusOrders };
}
