import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type NktuReportKind = 'dr-weekly' | 'sales-monthly' | 'sales-weekly';

export interface ReportKpi {
  key: string;
  value: string;

  unitKey: string;
}

export interface StatusBreakdownRow {
  value: string;
  label: string;

  color: string;
  count: number;
}

export interface ReportSeriesPoint {
  label: string;
  value: number;
}

export interface ReportRankRow {
  name: string;
  sub?: string;

  count: number;

  amount?: number;
}

export interface ReportShareRow {
  key: string;
  label: string;
  count: number;

  pct: number;

  color: string;
}

export interface DeliveryWeeklyReportData {
  periodLabel: string;

  periodRange: string;
  kpis: ReportKpi[];
  statusBreakdown: StatusBreakdownRow[];
  series: ReportSeriesPoint[];
  drivers: ReportRankRow[];
  customers: ReportRankRow[];
  direction: ReportShareRow[];
}

export interface SalesRankRow {
  name: string;

  sub?: string;

  amount: number;
  orders?: number;

  qty?: number;
}

export interface SalesMethodRow {
  name: string;
  orders: number;
  pct: number;

  color: string;
}

export interface SalesReportData {
  periodLabel: string;
  periodRange: string;
  kpis: ReportKpi[];
  statusBreakdown: StatusBreakdownRow[];

  series: ReportSeriesPoint[];

  seriesUnitKey: string;
  staff: SalesRankRow[];
  customers: SalesRankRow[];
  products: SalesRankRow[];
  methods: SalesMethodRow[];
}

export type NktuReport = SingleRecordRow & {
  reportKey: string;
  kind: NktuReportKind;

  periodKey: string;

  generatedAt: number;

  generatedByName?: string;

  sourceHash: string;

  data: DeliveryWeeklyReportData | SalesReportData;
  extra?: { isDeleted?: boolean; [k: string]: unknown };
};
