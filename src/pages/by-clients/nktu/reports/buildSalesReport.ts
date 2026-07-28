import type { ResolvedStatusOption } from '@/utils/permission';
import type { SalesOrder } from '@/types';
import { businessDateString } from '@/utils/code';
import type { ResolvedPeriod } from './reportPeriods';
import type {
  ReportKpi,
  SalesMethodRow,
  SalesRankRow,
  SalesReportData,
  ReportSeriesPoint,
  StatusBreakdownRow,
} from './types';

const M = 1_000_000;
const viNum = new Intl.NumberFormat('vi-VN');

const METHOD_COLORS = ['primary', 'orange', 'teal', 'yellow', 'grape', 'cyan'];

export interface SalesBuildDeps {
  statusOptions: ResolvedStatusOption[];

  employeeName: (id: string | undefined) => string | undefined;

  methodLabel: (code: string | undefined) => string;
}

function coerceMillis(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Date.parse(String(v));
  return Number.isNaN(n) ? null : n;
}

export function salesOrderAnchorDate(o: SalesOrder): string {
  return businessDateString(
    coerceMillis(o.extra?.orderDate) ?? coerceMillis(o.createdAt) ?? Date.now(),
  );
}

function isCancelled(o: SalesOrder): boolean {
  return o.extra?.cancellation != null;
}

function orderRevenue(o: SalesOrder): number {
  let sum = 0;
  for (const it of o.items) {
    if (it.role === 'set-component') continue;
    sum += (it.quantity ?? 0) * (it.unitPrice ?? 0);
  }
  return sum;
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function fmtDecimal(n: number): string {
  return viNum.format(Math.round(n * 100) / 100);
}

export function buildSalesReport(
  period: ResolvedPeriod,
  orders: SalesOrder[],
  deps: SalesBuildDeps,
): SalesReportData {
  const stageOf = new Map(deps.statusOptions.map((o) => [o.value, o.stage]));
  const isCompleted = (o: SalesOrder) =>
    !isCancelled(o) && (o.isClosed || stageOf.get(o.extra?.status ?? '') === 'COMPLETED');

  const statusCounts = new Map<string, number>();
  let cancelledCount = 0;
  for (const o of orders) {
    if (isCancelled(o)) {
      cancelledCount += 1;
      continue;
    }
    const v = o.extra?.status ?? '';
    statusCounts.set(v, (statusCounts.get(v) ?? 0) + 1);
  }
  const statusBreakdown: StatusBreakdownRow[] = [];
  for (const opt of deps.statusOptions) {
    const count = statusCounts.get(opt.value) ?? 0;
    if (count > 0)
      statusBreakdown.push({ value: opt.value, label: opt.label, color: opt.color, count });
    statusCounts.delete(opt.value);
  }
  let otherStatus = 0;
  for (const c of statusCounts.values()) otherStatus += c;
  if (otherStatus > 0)
    statusBreakdown.push({ value: '', label: 'Khác', color: '#868e96', count: otherStatus });
  if (cancelledCount > 0)
    statusBreakdown.push({
      value: '__cancelled',
      label: 'Đã huỷ',
      color: '#e03131',
      count: cancelledCount,
    });

  const revenueOrders = orders.filter(isCompleted);
  const revenueOf = new Map(revenueOrders.map((o) => [o.id, orderRevenue(o)]));
  const totalRevenue = revenueOrders.reduce((a, o) => a + (revenueOf.get(o.id) ?? 0), 0);
  const orderCount = revenueOrders.length;
  const distinctCustomers = new Set(
    revenueOrders.map((o) => o.extra?.customerName?.trim()).filter((n): n is string => !!n),
  ).size;

  const perBucket = new Array<number>(period.buckets.length).fill(0);
  for (const o of revenueOrders) {
    const idx = period.bucketOf(salesOrderAnchorDate(o));
    if (idx >= 0) perBucket[idx] += (revenueOf.get(o.id) ?? 0) / M;
  }
  const series: ReportSeriesPoint[] = period.buckets.map((b, i) => ({
    label: b.label,
    value: Math.round(perBucket[i] ?? 0),
  }));

  const staff = rankOrders(
    revenueOrders,
    revenueOf,
    (o) => deps.employeeName(o.extra?.assignedStaff)?.trim() || null,
    'Chưa gán NV',
  );
  const customers = rankOrders(
    revenueOrders,
    revenueOf,
    (o) => o.extra?.customerName?.trim() || null,
    'Không rõ',
  );
  const products = rankProducts(revenueOrders);

  const methodCounts = new Map<string, number>();
  for (const o of revenueOrders) {
    const label = deps.methodLabel(o.extra?.deliveryMethod) || 'Khác';
    methodCounts.set(label, (methodCounts.get(label) ?? 0) + 1);
  }
  const methods: SalesMethodRow[] = [...methodCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count], i) => ({
      name,
      orders: count,
      pct: pct(count, orderCount),
      color: METHOD_COLORS[i % METHOD_COLORS.length] ?? 'primary',
    }));

  const kpis: ReportKpi[] = [
    { key: 'revenue', value: fmtDecimal(totalRevenue / (1000 * M)), unitKey: 'billion' },
    { key: 'orders', value: viNum.format(orderCount), unitKey: 'orders' },
    { key: 'customers', value: viNum.format(distinctCustomers), unitKey: 'customersShort' },
    {
      key: 'avgOrder',
      value: fmtDecimal(orderCount > 0 ? totalRevenue / orderCount / M : 0),
      unitKey: 'million',
    },
  ];

  return {
    periodLabel: period.label,
    periodRange: period.rangeText,
    kpis,
    statusBreakdown,
    series,
    seriesUnitKey: 'million',
    staff,
    customers,
    products,
    methods,
  };
}

function rankOrders(
  orders: SalesOrder[],
  revenueOf: Map<string, number>,
  keyOf: (o: SalesOrder) => string | null,
  fallback: string,
  limit = 8,
): SalesRankRow[] {
  const agg = new Map<string, { amount: number; orders: number }>();
  for (const o of orders) {
    const name = keyOf(o) ?? fallback;
    const cur = agg.get(name) ?? { amount: 0, orders: 0 };
    cur.amount += revenueOf.get(o.id) ?? 0;
    cur.orders += 1;
    agg.set(name, cur);
  }
  return [...agg.entries()]
    .map(([name, v]) => ({ name, amount: v.amount, orders: v.orders }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

function rankProducts(orders: SalesOrder[], limit = 8): SalesRankRow[] {
  const agg = new Map<string, { name: string; amount: number; qty: number }>();
  for (const o of orders) {
    for (const it of o.items) {
      if (it.role === 'set-component') continue;
      const code = it.productCode || it.productName || '—';
      const cur = agg.get(code) ?? { name: it.productName || code, amount: 0, qty: 0 };
      cur.amount += (it.quantity ?? 0) * (it.unitPrice ?? 0);
      cur.qty += it.quantity ?? 0;
      agg.set(code, cur);
    }
  }
  return [...agg.entries()]
    .map(([code, v]) => ({ name: v.name, sub: code, amount: v.amount, qty: v.qty }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}
