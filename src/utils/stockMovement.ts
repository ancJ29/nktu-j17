import {
  STOCK_MOVEMENT_THRESHOLDS,
  STOCK_MOVEMENT_WINDOW_DAYS,
} from '@/pages/product-inventory/productInventoryListVariant';
import type { SalesOrder, SalesOrderExtra } from '@/types';

export type StockMovementLevel = 'aLot' | 'normal' | 'rarely';

export type StockMovementEvent = { productCode: string; docId: string; at: number };

export type StockMovement = { orders: number; perMonth: number; level: StockMovementLevel };

const DAY_MS = 86_400_000;
const DELIVERED = 'delivered';

export function deliveredSalesOrderEvents(orders: readonly SalesOrder[]): StockMovementEvent[] {
  const events: StockMovementEvent[] = [];
  for (const so of orders) {
    const extra = (so.extra ?? {}) as SalesOrderExtra;
    if (extra.isDeleted || extra.cancellation || extra.status !== DELIVERED) continue;
    const stamps = (extra.activityLog ?? [])
      .filter((a) => a.toStatus === DELIVERED)
      .map((a) => new Date(a.timestamp as string | number).getTime())
      .filter((t) => Number.isFinite(t));
    if (stamps.length === 0) continue;
    const at = Math.max(...stamps);
    const codes = new Set<string>();
    for (const item of so.items ?? []) {
      if (item.role === 'set' || !item.productCode) continue;
      codes.add(item.productCode);
    }
    for (const productCode of codes) events.push({ productCode, docId: so.id, at });
  }
  return events;
}

export const MOVEMENT_SOURCES: ReadonlyArray<
  (orders: readonly SalesOrder[]) => StockMovementEvent[]
> = [deliveredSalesOrderEvents];

export function levelOf(orders: number): StockMovementLevel {
  if (orders >= STOCK_MOVEMENT_THRESHOLDS.aLotOrders) return 'aLot';
  if (orders <= STOCK_MOVEMENT_THRESHOLDS.rarelyOrders) return 'rarely';
  return 'normal';
}

export function countStockMovements(
  orders: readonly SalesOrder[],
  now: number = Date.now(),
): Map<string, StockMovement> {
  const since = now - STOCK_MOVEMENT_WINDOW_DAYS * DAY_MS;
  const months = STOCK_MOVEMENT_WINDOW_DAYS / 30;
  const counts = new Map<string, Set<string>>();
  for (const source of MOVEMENT_SOURCES) {
    for (const e of source(orders)) {
      if (e.at < since || e.at > now) continue;
      const docs = counts.get(e.productCode) ?? new Set<string>();
      docs.add(e.docId);
      counts.set(e.productCode, docs);
    }
  }
  const out = new Map<string, StockMovement>();
  for (const [code, docs] of counts) {
    const perMonth = docs.size / months;
    out.set(code, { orders: docs.size, perMonth, level: levelOf(docs.size) });
  }
  return out;
}

export const NO_MOVEMENT: StockMovement = { orders: 0, perMonth: 0, level: 'rarely' };
