import { SegmentedControl, SimpleGrid, Stack } from '@mantine/core';
import { useMemo } from 'react';
import { device } from '@credo/base-ui/utils';
import {
  type BreakdownEntry,
  buildRevenueBreakdown,
  type RevenueBreakdown,
} from '@/pages/v2/reports/buildRevenueBreakdown';
import { addDays } from '@/pages/v2/reports/buildRevenueReport';
import type { ReportViewProps } from '@/pages/v2/reports/registry';
import { useWindowRows } from '@/pages/v2/reports/useWindowRows';
import { fetchSalesOrderV2Window } from '@/stores/useSalesOrderV2Store';
import { salesOrderFlowErrors, salesOrderStageOf } from '@/pages/v2/sales-orders/statusFlow';
import type { SalesOrderV2 } from '@/types/sales-order-v2';
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
import {
  WIDEN_BACK_DAYS,
  WINDOW_PRESETS,
  formatVnd,
  presetRange,
  salesOrdersLink,
  windowPresetOf,
} from './reportShared';

const isMobile = device.isMobile;

export interface BreakdownReportProps extends ReportViewProps {
  title: string;
  subtitle: string;

  dimensionHeader: string;

  dimensionOf: (order: SalesOrderV2) => { key: string; label: string };

  links?: {
    entry?: (entry: BreakdownEntry) => string | undefined;
    orders?: (
      entry: BreakdownEntry,
      range: { fromDay: string; toDay: string },
    ) => string | undefined;
  };
}

export default function BreakdownReport({
  param,
  onParamChange,
  title,
  subtitle,
  dimensionHeader,
  dimensionOf,
  links,
}: BreakdownReportProps) {
  const preset = windowPresetOf(param);
  const { fromDay, toDay } = useMemo(() => presetRange(preset.days), [preset.days]);
  const fetchFromDay = useMemo(() => addDays(fromDay, -WIDEN_BACK_DAYS), [fromDay]);

  const { rows, error, loadedAt, refreshing, reload } = useWindowRows(
    fetchSalesOrderV2Window,
    fetchFromDay,
    toDay,
  );
  const report: RevenueBreakdown | undefined = useMemo(
    () =>
      rows &&
      buildRevenueBreakdown(rows, {
        fromDay,
        toDay,
        resolveStage: salesOrderStageOf,
        dimensionOf,
      }),
    [rows, fromDay, toDay, dimensionOf],
  );

  if (salesOrderFlowErrors.length > 0) {
    return <FlowInvalidAlert errors={salesOrderFlowErrors} />;
  }

  const maxRevenue = report ? Math.max(...report.entries.map((e) => e.revenue), 1) : 1;
  const totalRevenue = report ? report.totals.revenue || 1 : 1;

  return (
    <Stack gap="lg">
      <ReportHeader
        title={title}
        subtitle={subtitle}
        control={
          <SegmentedControl
            fullWidth={isMobile}
            value={preset.value}
            onChange={(v) => onParamChange(v === WINDOW_PRESETS[0]!.value ? undefined : v)}
            data={WINDOW_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          />
        }
        refresh={{ loadedAt, refreshing, onReload: reload }}
      />

      {!report && !error && <LoadingRow />}
      {error && <LoadErrorAlert />}

      {report && (
        <>
          <UnknownStatusAlert count={report.unknownStatusOrders} />

          <SimpleGrid cols={{ base: 2, sm: report.totals.unpricedOrders > 0 ? 3 : 2 }} spacing="sm">
            <KpiCard label="Tổng doanh thu" value={formatVnd(report.totals.revenue)} />
            <KpiCard
              label="Số đơn"
              value={String(report.totals.orders)}
              to={salesOrdersLink({ fromDay, toDay })}
            />
            {report.totals.unpricedOrders > 0 && (
              <KpiCard label="Đơn chưa có giá" value={String(report.totals.unpricedOrders)} />
            )}
          </SimpleGrid>

          <ReportTable
            identityHeader={dimensionHeader}
            empty="Chưa có đơn hàng trong khoảng thời gian này."
            rows={report.entries.map((e) => ({
              key: e.key,
              title: e.label,
              ...(links?.entry?.(e) ? { titleTo: links.entry(e) } : {}),
              barPct: (e.revenue / maxRevenue) * 100,
              metrics: [
                {
                  label: 'Doanh thu',

                  value: e.pricedOrders > 0 ? formatVnd(e.revenue) : '—',
                },
                {
                  label: '%',
                  value:
                    e.pricedOrders > 0
                      ? `${((e.revenue / totalRevenue) * 100).toFixed(1).replace('.', ',')}%`
                      : '—',
                  c: 'dimmed',
                },
                {
                  label: 'Số đơn',
                  value: e.orders,
                  ...(links?.orders?.(e, { fromDay, toDay })
                    ? { to: links.orders(e, { fromDay, toDay }) }
                    : {}),
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
