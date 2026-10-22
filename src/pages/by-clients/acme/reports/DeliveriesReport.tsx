import { SegmentedControl, SimpleGrid, Stack } from '@mantine/core';
import { useMemo } from 'react';
import { device } from '@credo/base-ui/utils';
import { buildDeliveryReport } from '@/pages/v2/reports/buildDeliveryReport';
import { addDays } from '@/pages/v2/reports/buildRevenueReport';
import type { ReportViewProps } from '@/pages/v2/reports/registry';
import { useWindowRows } from '@/pages/v2/reports/useWindowRows';
import { deliveryNoteFlowErrors, deliveryNoteStageOf } from '@/pages/v2/delivery-notes/statusFlow';
import { fetchDeliveryNoteV2Window } from '@/stores/useDeliveryNoteV2Store';
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
  deliveryNotesLink,
  presetRange,
  windowPresetOf,
} from './reportShared';

const isMobile = device.isMobile;

export default function DeliveriesReport({ param, onParamChange }: ReportViewProps) {
  const preset = windowPresetOf(param);
  const { fromDay, toDay } = useMemo(() => presetRange(preset.days), [preset.days]);
  const fetchFromDay = useMemo(() => addDays(fromDay, -WIDEN_BACK_DAYS), [fromDay]);

  const { rows, error, loadedAt, refreshing, reload } = useWindowRows(
    fetchDeliveryNoteV2Window,
    fetchFromDay,
    toDay,
  );
  const report = useMemo(
    () => rows && buildDeliveryReport(rows, { fromDay, toDay, resolveStage: deliveryNoteStageOf }),
    [rows, fromDay, toDay],
  );

  if (deliveryNoteFlowErrors.length > 0) {
    return <FlowInvalidAlert errors={deliveryNoteFlowErrors} />;
  }

  return (
    <Stack gap="lg">
      <ReportHeader
        title="Tình hình giao hàng"
        subtitle="Phiếu giao theo ngày giao, chia theo nhân viên phụ trách"
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
          <UnknownStatusAlert count={report.unknownStatusNotes} />

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <KpiCard label="Đã giao" value={String(report.totals.delivered)} />
            <KpiCard label="Đang thực hiện" value={String(report.totals.inProgress)} />
            <KpiCard label="Đã huỷ" value={String(report.totals.cancelled)} />
            <KpiCard
              label="Tổng phiếu"
              value={String(report.totals.total)}
              to={deliveryNotesLink({ fromDay, toDay })}
            />
          </SimpleGrid>

          <ReportTable
            identityHeader="Nhân viên giao"
            empty="Chưa có phiếu giao trong khoảng thời gian này."
            rows={report.byAssignee.map((r) => ({
              key: r.key || '__none__',
              title: r.key ? r.label || r.key : 'Chưa phân công',
              titleDimmed: !r.key,

              ...(r.key ? { titleTo: deliveryNotesLink({ fromDay, toDay }, r.key) } : {}),
              metrics: [
                { label: 'Đã giao', value: r.delivered },
                { label: 'Đang thực hiện', value: r.inProgress },
                { label: 'Đã huỷ', value: r.cancelled, c: r.cancelled > 0 ? 'red' : 'dimmed' },
                { label: 'Tổng', value: r.total, strong: true },
              ],
            }))}
          />
        </>
      )}
    </Stack>
  );
}
