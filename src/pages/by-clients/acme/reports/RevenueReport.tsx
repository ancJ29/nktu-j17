import { SegmentedControl, SimpleGrid, Stack } from '@mantine/core';
import { useMemo } from 'react';
import { device } from '@credo/base-ui/utils';
import {
  addDays,
  buildRevenueReport,
  periodRangeOf,
  type RevenueGrouping,
} from '@/pages/v2/reports/buildRevenueReport';
import type { ReportViewProps } from '@/pages/v2/reports/registry';
import { useWindowRows } from '@/pages/v2/reports/useWindowRows';
import { fetchSalesOrderV2Window } from '@/stores/useSalesOrderV2Store';
import { salesOrderFlowErrors, salesOrderStageOf } from '@/pages/v2/sales-orders/statusFlow';
import {
  FlowInvalidAlert,
  KpiCard,
  LoadErrorAlert,
  LoadingRow,
  ReportHeader,
  ReportTable,
  UnknownStatusAlert,
  UnpricedFootnote,
} from './reportKit';
import { WIDEN_BACK_DAYS, formatVnd, presetRange, salesOrdersLink } from './reportShared';

const isMobile = device.isMobile;

const GROUPINGS: ReadonlyArray<{ value: RevenueGrouping; label: string; days: number }> = [
  { value: 'day', label: 'Ngày', days: 30 },
  { value: 'week', label: 'Tuần', days: 12 * 7 },
  { value: 'month', label: 'Tháng', days: 365 },
];

function periodLabel(grouping: RevenueGrouping, periodKey: string): string {
  if (grouping === 'day') {
    const [, m, d] = periodKey.split('-');
    return `${d}/${m}`;
  }
  if (grouping === 'week') {
    const [year, week] = periodKey.split('-W');
    return `Tuần ${Number(week)} · ${year}`;
  }
  const [year, month] = periodKey.split('-');
  return `Tháng ${Number(month)}/${year}`;
}

export default function RevenueReport({ param, onParamChange }: ReportViewProps) {
  const grouping: RevenueGrouping = param === 'week' || param === 'month' ? param : 'day';

  const { fromDay, toDay } = useMemo(() => {
    const preset = GROUPINGS.find((g) => g.value === grouping)!;
    return presetRange(preset.days);
  }, [grouping]);
  const fetchFromDay = useMemo(() => addDays(fromDay, -WIDEN_BACK_DAYS), [fromDay]);

  const {
    rows: source,
    error,
    loadedAt,
    refreshing,
    reload,
  } = useWindowRows(fetchSalesOrderV2Window, fetchFromDay, toDay);
  const report = useMemo(
    () =>
      source &&
      buildRevenueReport(source, { grouping, fromDay, toDay, resolveStage: salesOrderStageOf }),
    [source, grouping, fromDay, toDay],
  );

  if (salesOrderFlowErrors.length > 0) {
    return <FlowInvalidAlert errors={salesOrderFlowErrors} />;
  }

  const rows = report ? [...report.rows].reverse() : [];

  return (
    <Stack gap="lg">
      <ReportHeader
        title="Doanh thu"
        subtitle="Đơn hàng đã xác nhận hoặc hoàn tất, theo ngày đặt hàng"
        control={
          <SegmentedControl
            fullWidth={isMobile}
            value={grouping}
            onChange={(v) => onParamChange(v === 'day' ? undefined : v)}
            data={GROUPINGS.map((g) => ({ value: g.value, label: g.label }))}
          />
        }
        refresh={{ loadedAt, refreshing, onReload: reload }}
      />

      {!report && !error && <LoadingRow />}
      {error && <LoadErrorAlert />}

      {report && (
        <>
          <UnknownStatusAlert count={report.unknownStatusOrders} />

          <SimpleGrid cols={{ base: 2, sm: report.totals.unpricedOrders > 0 ? 4 : 3 }} spacing="sm">
            <KpiCard label="Tổng doanh thu" value={formatVnd(report.totals.revenue)} />
            <KpiCard
              label="Số đơn"
              value={String(report.totals.orders)}
              to={salesOrdersLink({ fromDay, toDay })}
            />
            <KpiCard
              label="TB / đơn"
              value={
                report.totals.pricedOrders > 0
                  ? formatVnd(report.totals.revenue / report.totals.pricedOrders)
                  : '—'
              }
            />
            {report.totals.unpricedOrders > 0 && (
              <KpiCard label="Đơn chưa có giá" value={String(report.totals.unpricedOrders)} />
            )}
          </SimpleGrid>

          <ReportTable
            identityHeader="Kỳ"
            minWidth={420}
            empty="Chưa có đơn hàng trong khoảng thời gian này."
            rows={rows.map((r) => ({
              key: r.periodKey,
              title: periodLabel(grouping, r.periodKey),
              metrics: [
                {
                  label: 'Doanh thu',

                  value: r.pricedOrders > 0 ? formatVnd(r.revenue) : '—',
                },
                {
                  label: 'Số đơn',
                  value: r.orders,

                  ...(r.orders > 0
                    ? { to: salesOrdersLink(periodRangeOf(grouping, r.periodKey)) }
                    : { c: 'dimmed' }),
                },
                {
                  label: 'TB / đơn',
                  value: r.pricedOrders > 0 ? formatVnd(r.revenue / r.pricedOrders) : '—',
                },
              ],
            }))}
          />

          <UnpricedFootnote count={report.totals.unpricedOrders} />
        </>
      )}
    </Stack>
  );
}
