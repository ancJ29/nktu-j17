import { SegmentedControl, SimpleGrid, Stack } from '@mantine/core';
import { useMemo } from 'react';
import { device } from '@credo/base-ui/utils';
import { buildReceivingReport } from '@/pages/v2/reports/buildReceivingReport';
import { addDays } from '@/pages/v2/reports/buildRevenueReport';
import type { ReportViewProps } from '@/pages/v2/reports/registry';
import { useWindowRows } from '@/pages/v2/reports/useWindowRows';
import { goodsReceiptFlowErrors, goodsReceiptStageOf } from '@/pages/v2/goods-receipts/statusFlow';
import { fetchGoodsReceiptV2Window } from '@/stores/useGoodsReceiptV2Store';
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
  goodsReceiptsLink,
  presetRange,
  vendorLink,
  windowPresetOf,
} from './reportShared';

const isMobile = device.isMobile;

export default function ReceivingReport({ param, onParamChange }: ReportViewProps) {
  const preset = windowPresetOf(param);
  const { fromDay, toDay } = useMemo(() => presetRange(preset.days), [preset.days]);
  const fetchFromDay = useMemo(() => addDays(fromDay, -WIDEN_BACK_DAYS), [fromDay]);

  const { rows, error, loadedAt, refreshing, reload } = useWindowRows(
    fetchGoodsReceiptV2Window,
    fetchFromDay,
    toDay,
  );
  const report = useMemo(
    () => rows && buildReceivingReport(rows, { fromDay, toDay, resolveStage: goodsReceiptStageOf }),
    [rows, fromDay, toDay],
  );

  if (goodsReceiptFlowErrors.length > 0) {
    return <FlowInvalidAlert errors={goodsReceiptFlowErrors} />;
  }

  const maxReceipts = report ? Math.max(...report.byVendor.map((r) => r.receipts), 1) : 1;

  return (
    <Stack gap="lg">
      <ReportHeader
        title="Nhập hàng theo nhà cung cấp"
        subtitle="Phiếu nhập đã nhận, theo ngày nhận hàng"
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
          <UnknownStatusAlert count={report.unknownStatusReceipts} />

          <SimpleGrid cols={{ base: 2, sm: 2 }} spacing="sm">
            <KpiCard
              label="Phiếu nhập"
              value={String(report.totals.receipts)}
              to={goodsReceiptsLink({ fromDay, toDay })}
            />
            <KpiCard label="Dòng hàng" value={String(report.totals.lines)} />
          </SimpleGrid>

          <ReportTable
            identityHeader="Nhà cung cấp"
            minWidth={520}
            barWidth="24%"
            empty="Chưa có phiếu nhập trong khoảng thời gian này."
            rows={report.byVendor.map((r) => ({
              key: r.key || '__none__',
              title: r.key ? r.label || r.key : 'Không có nhà cung cấp',
              titleDimmed: !r.key,
              ...(r.key && vendorLink(r.key) ? { titleTo: vendorLink(r.key) } : {}),
              barPct: (r.receipts / maxReceipts) * 100,
              metrics: [
                {
                  label: 'Phiếu nhập',
                  value: r.receipts,
                  ...(r.key ? { to: goodsReceiptsLink({ fromDay, toDay }, r.key) } : {}),
                },
                { label: 'Dòng hàng', value: r.lines, c: 'dimmed' },
              ],
            }))}
          />
        </>
      )}
    </Stack>
  );
}
