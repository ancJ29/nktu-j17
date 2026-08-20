import type { ProductInventorySummary } from '@/types';

export type ReservationRollup = {
  id: string;
  orderNumber: string;
  customerCode?: string;
  customerName?: string;
  byUnit: Record<string, number>;
};

export function rollupReservationsBySO(summary: ProductInventorySummary): ReservationRollup[] {
  const map = new Map<string, ReservationRollup>();
  for (const row of summary.rows) {
    const m = row.extra?.reservedBySalesOrder;
    if (!m) continue;
    for (const [soId, entry] of Object.entries(m)) {
      const cur = map.get(soId);
      if (cur) {
        for (const [u, q] of Object.entries(entry.byUnit)) {
          cur.byUnit[u] = (cur.byUnit[u] ?? 0) + q;
        }
      } else {
        map.set(soId, {
          id: soId,
          orderNumber: entry.orderNumber,
          customerCode: entry.customerCode,
          customerName: entry.customerName,
          byUnit: { ...entry.byUnit },
        });
      }
    }
  }
  return [...map.values()];
}
