import { SegmentedControl, SimpleGrid, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { device } from '@credo/base-ui/utils';
import { buildProductSales } from '@/pages/v2/reports/buildProductSales';
import { addDays } from '@/pages/v2/reports/buildRevenueReport';
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
} from './reportKit';
import {
  WIDEN_BACK_DAYS,
  WINDOW_PRESETS,
  formatVnd,
  presetRange,
  salesOrdersLink,
  soldItemLink,
  soldItemOf,
  windowPresetOf,
} from './reportShared';

const isMobile = device.isMobile;

const formatQty = (n: number): string => n.toLocaleString('vi-VN', { maximumFractionDigits: 3 });

export default function TopProductsReport({ param, onParamChange }: ReportViewProps) {
  const preset = windowPresetOf(param);
  const { fromDay, toDay } = useMemo(() => presetRange(preset.days), [preset.days]);
  const fetchFromDay = useMemo(() => addDays(fromDay, -WIDEN_BACK_DAYS), [fromDay]);

  const { rows, error, loadedAt, refreshing, reload } = useWindowRows(
    fetchSalesOrderV2Window,
    fetchFromDay,
    toDay,
  );
  const report = useMemo(
    () => rows && buildProductSales(rows, { fromDay, toDay, resolveStage: salesOrderStageOf }),
    [rows, fromDay, toDay],
  );

  if (salesOrderFlowErrors.length > 0) {
    return <FlowInvalidAlert errors={salesOrderFlowErrors} />;
  }

  const maxRevenue = report ? Math.max(...report.entries.map((e) => e.revenue), 1) : 1;
  const totalRevenue = report ? report.totals.revenue || 1 : 1;
  const unpricedLines = report ? report.entries.reduce((a, e) => a + e.unpricedLines, 0) : 0;

  return (
    <Stack gap="lg">
      <ReportHeader
        title="Sản phẩm bán ra"
        subtitle="Số lượng và doanh thu theo từng sản phẩm, trên đơn đã xác nhận hoặc hoàn tất"
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

          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
            <KpiCard label="Tổng doanh thu" value={formatVnd(report.totals.revenue)} />
            <KpiCard
              label="Số đơn"
              value={String(report.totals.orders)}
              to={salesOrdersLink({ fromDay, toDay })}
            />
            <KpiCard label="Mặt hàng" value={String(report.entries.length)} />
          </SimpleGrid>

          <ReportTable
            identityHeader="Sản phẩm"
            minWidth={640}
            barWidth="18%"
            empty="Chưa có đơn hàng trong khoảng thời gian này."
            rows={report.entries.map((e) => ({
              key: e.key,
              title: e.name,
              subtitle: e.code,
              ...(soldItemLink(e.key) ? { titleTo: soldItemLink(e.key) } : {}),
              barPct: (e.revenue / maxRevenue) * 100,
              metrics: [
                {
                  label: 'Số lượng',
                  value: (
                    <>
                      {formatQty(e.quantity)}
                      {e.unit ? (
                        <Text span c="dimmed" fz="sm">
                          {' '}
                          {e.unit}
                        </Text>
                      ) : null}
                    </>
                  ),
                },
                {
                  label: 'Doanh thu',

                  value: e.pricedLines > 0 ? formatVnd(e.revenue) : '—',
                },
                {
                  label: '%',
                  value:
                    e.pricedLines > 0
                      ? `${((e.revenue / totalRevenue) * 100).toFixed(1).replace('.', ',')}%`
                      : '—',
                  c: 'dimmed',
                },
                {
                  label: 'Số đơn',
                  value: e.orders,
                  ...(e.orders > 0
                    ? {
                        to: salesOrdersLink(
                          { fromDay, toDay },
                          { itemId: soldItemOf(e.key).itemId },
                        ),
                      }
                    : {}),
                },
              ],
            }))}
          />

          {unpricedLines > 0 && (
            <Text size="xs" c="dimmed">
              {unpricedLines} dòng hàng chưa nhập giá không được cộng vào doanh thu.
            </Text>
          )}
        </>
      )}
    </Stack>
  );
}
