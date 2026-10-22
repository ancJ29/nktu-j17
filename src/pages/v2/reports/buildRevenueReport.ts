import type { SalesOrderStage } from '@credo/connectors/status-flow';
import type { SalesOrderV2 } from '@/types/sales-order-v2';
import { anchorDayOf, dayOfUtc7 } from '../anchorDay';

export { dayOfUtc7 };

const DAY_MS = 86_400_000;

export type RevenueGrouping = 'day' | 'week' | 'month';

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function todayUtc7(now: number = Date.now()): string {
  return dayOfUtc7(now)!;
}

export function revenueAnchorDayOf(order: SalesOrderV2): string | undefined {
  return anchorDayOf(order.orderDate, order.createdAt);
}

function isoWeek1Monday(year: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  jan4.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  return jan4;
}

export function isoWeekKeyOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));

  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const week = 1 + Math.round((monday.getTime() - isoWeek1Monday(year).getTime()) / (7 * DAY_MS));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function periodRangeOf(
  grouping: RevenueGrouping,
  periodKey: string,
): { fromDay: string; toDay: string } {
  if (grouping === 'day') return { fromDay: periodKey, toDay: periodKey };
  if (grouping === 'week') {
    const [year, week] = periodKey.split('-W');
    const monday = isoWeek1Monday(Number(year));
    monday.setUTCDate(monday.getUTCDate() + (Number(week) - 1) * 7);
    const fromDay = monday.toISOString().slice(0, 10);
    return { fromDay, toDay: addDays(fromDay, 6) };
  }
  const [year, month] = periodKey.split('-').map(Number);
  const last = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  return { fromDay: `${periodKey}-01`, toDay: `${periodKey}-${String(last).padStart(2, '0')}` };
}

export function periodKeyOf(grouping: RevenueGrouping, dateStr: string): string {
  if (grouping === 'day') return dateStr;
  if (grouping === 'week') return isoWeekKeyOf(dateStr);
  return dateStr.slice(0, 7);
}

export function periodKeysInRange(
  grouping: RevenueGrouping,
  fromDay: string,
  toDay: string,
): string[] {
  const keys: string[] = [];
  const from = new Date(`${fromDay}T00:00:00Z`).getTime();
  const to = new Date(`${toDay}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return keys;
  for (let t = from; t <= to; t += DAY_MS) {
    const key = periodKeyOf(grouping, new Date(t).toISOString().slice(0, 10));
    if (keys[keys.length - 1] !== key) keys.push(key);
  }
  return keys;
}

export const REVENUE_STAGES: ReadonlyArray<SalesOrderStage> = ['confirmed', 'fulfilled'];

export interface RevenueScope {
  fromDay: string;
  toDay: string;

  resolveStage: (status: string) => SalesOrderStage | undefined;
}

export function filterRevenueOrders(
  rows: ReadonlyArray<SalesOrderV2>,
  scope: RevenueScope,
): {
  orders: Array<{ order: SalesOrderV2; anchorDay: string }>;
  unknownStatusOrders: number;
} {
  const orders: Array<{ order: SalesOrderV2; anchorDay: string }> = [];
  let unknownStatusOrders = 0;
  for (const order of rows) {
    const anchorDay = revenueAnchorDayOf(order);
    if (!anchorDay || anchorDay < scope.fromDay || anchorDay > scope.toDay) continue;
    const stage = scope.resolveStage(order.status);
    if (stage === undefined) {
      unknownStatusOrders += 1;
      continue;
    }
    if (!REVENUE_STAGES.includes(stage)) continue;
    orders.push({ order, anchorDay });
  }
  return { orders, unknownStatusOrders };
}

export interface RevenuePeriodRow {
  periodKey: string;

  revenue: number;

  orders: number;
  pricedOrders: number;

  unpricedOrders: number;
}

export interface RevenueReport {
  grouping: RevenueGrouping;

  rows: RevenuePeriodRow[];
  totals: Omit<RevenuePeriodRow, 'periodKey'>;

  unknownStatusOrders: number;
}

export function buildRevenueReport(
  rows: ReadonlyArray<SalesOrderV2>,
  input: RevenueScope & { grouping: RevenueGrouping },
): RevenueReport {
  const { grouping, fromDay, toDay } = input;
  const byKey = new Map<string, RevenuePeriodRow>(
    periodKeysInRange(grouping, fromDay, toDay).map((periodKey) => [
      periodKey,
      { periodKey, revenue: 0, orders: 0, pricedOrders: 0, unpricedOrders: 0 },
    ]),
  );

  const { orders, unknownStatusOrders } = filterRevenueOrders(rows, input);
  for (const { order, anchorDay } of orders) {
    const row = byKey.get(periodKeyOf(grouping, anchorDay));
    if (!row) continue;
    row.orders += 1;
    if (typeof order.totalAmount === 'number') {
      row.pricedOrders += 1;
      row.revenue += order.totalAmount;
    } else {
      row.unpricedOrders += 1;
    }
  }

  const totals = { revenue: 0, orders: 0, pricedOrders: 0, unpricedOrders: 0 };
  for (const row of byKey.values()) {
    totals.revenue += row.revenue;
    totals.orders += row.orders;
    totals.pricedOrders += row.pricedOrders;
    totals.unpricedOrders += row.unpricedOrders;
  }

  return { grouping, rows: [...byKey.values()], totals, unknownStatusOrders };
}
