import type { DeliveryRequest } from '@/types';
import { businessDateString } from '@/utils/code';
import { WEEKDAY_LABELS, weekdayIndex, type ResolvedWeek } from './reportPeriods';
import { sourceHashOf } from './sourceHash';
import type {
  DeliveryWeeklyReportData,
  ReportKpi,
  ReportRankRow,
  ReportSeriesPoint,
  ReportShareRow,
  StatusBreakdownRow,
} from './types';

export interface ReportStatusOption {
  value: string;
  label: string;
  color: string;
}

const viNum = new Intl.NumberFormat('vi-VN');

function coerceMillis(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Date.parse(String(v));
  return Number.isNaN(n) ? null : n;
}

export function effectiveDate(dr: DeliveryRequest): string {
  const millis =
    coerceMillis(dr.extra?.deliveryTimestamp) ??
    coerceMillis(dr.scheduledDate) ??
    coerceMillis(dr.createdAt) ??
    Date.now();
  return businessDateString(millis);
}

export { sourceHashOf };

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function rankBy(
  requests: DeliveryRequest[],
  keyOf: (dr: DeliveryRequest) => string | null,
  fallback: string,
  limit = 8,
): ReportRankRow[] {
  const counts = new Map<string, number>();
  for (const dr of requests) {
    const name = keyOf(dr) ?? fallback;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function statusBreakdownOf(
  requests: DeliveryRequest[],
  statusOptions: ReportStatusOption[],
): StatusBreakdownRow[] {
  const counts = new Map<string, number>();
  for (const dr of requests) {
    const v = dr.extra?.status ?? '';
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const rows: StatusBreakdownRow[] = [];
  for (const opt of statusOptions) {
    const count = counts.get(opt.value) ?? 0;
    if (count > 0) rows.push({ value: opt.value, label: opt.label, color: opt.color, count });
    counts.delete(opt.value);
  }
  let other = 0;
  for (const c of counts.values()) other += c;
  if (other > 0) rows.push({ value: '', label: 'Khác', color: '#868e96', count: other });
  return rows;
}

export function buildDeliveryWeeklyReport(
  week: ResolvedWeek,
  requests: DeliveryRequest[],
  statusOptions: ReportStatusOption[],
): DeliveryWeeklyReportData {
  const total = requests.length;

  const statusBreakdown = statusBreakdownOf(requests, statusOptions);

  const perDay = new Array<number>(WEEKDAY_LABELS.length).fill(0);
  for (const dr of requests) {
    const idx = weekdayIndex(effectiveDate(dr));
    if (idx < perDay.length) perDay[idx] += 1;
  }
  const series: ReportSeriesPoint[] = WEEKDAY_LABELS.map((label, i) => ({
    label,
    value: perDay[i] ?? 0,
  }));

  const drivers = rankBy(
    requests,
    (dr) => dr.extra?.assignedDriverName?.trim() || null,
    'Chưa gán tài xế',
  );
  const customers = rankBy(
    requests,
    (dr) => dr.customerName?.trim() || dr.vendorName?.trim() || null,
    'Không rõ',
  );

  let outbound = 0;
  let inbound = 0;
  for (const dr of requests) {
    if ((dr.direction ?? 'outbound') === 'inbound') inbound += 1;
    else outbound += 1;
  }
  const direction: ReportShareRow[] = [
    {
      key: 'outbound',
      label: 'Giao đi',
      count: outbound,
      pct: pct(outbound, total),
      color: 'primary',
    },
    { key: 'inbound', label: 'Nhận về', count: inbound, pct: pct(inbound, total), color: 'teal' },
  ];

  const distinctCustomers = new Set(
    requests.map((dr) => dr.customerName?.trim()).filter((n): n is string => !!n),
  ).size;
  const completed = requests.filter((dr) => dr.isClosed).length;

  const kpis: ReportKpi[] = [
    { key: 'total', value: viNum.format(total), unitKey: 'requests' },
    { key: 'delivered', value: viNum.format(completed), unitKey: 'requests' },
    { key: 'customers', value: viNum.format(distinctCustomers), unitKey: 'customersShort' },
    { key: 'completionRate', value: String(pct(completed, total)), unitKey: 'percent' },
  ];

  return {
    periodLabel: week.label,
    periodRange: week.rangeText,
    kpis,
    statusBreakdown,
    series,
    drivers,
    customers,
    direction,
  };
}
