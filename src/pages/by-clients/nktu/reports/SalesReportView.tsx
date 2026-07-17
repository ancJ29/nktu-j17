import {
  Box,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import { device } from '@credo/base-ui/utils';
import { formatDateTime } from '@/utils/dateFormat';
import SalesReport from '../SalesReport';
import { aggregateSalesReport } from './aggregateSalesReport';
import { recentMonthKeys, recentWeekKeys, resolveMonth, resolveWeekPeriod } from './reportPeriods';
import { useReportSnapshot } from './useReportSnapshot';
import type { NktuReportKind, SalesReportData } from './types';

const isMobile = device.isMobile;
const PERIOD_COUNT = 12;

type SalesKind = Extract<NktuReportKind, 'sales-monthly' | 'sales-weekly'>;

interface Props {
  title: string;
  kind: SalesKind;
  
  period?: string;
  onPeriodChange: (period: string) => void;
}

function periodMeta(kind: SalesKind, key: string): { label: string; rangeText: string } {
  const p = kind === 'sales-monthly' ? resolveMonth(key) : resolveWeekPeriod(key);
  return { label: p.label, rangeText: p.rangeText };
}

export default function SalesReportView({ title, kind, period, onPeriodChange }: Props) {
  const periods = useMemo(
    () => (kind === 'sales-monthly' ? recentMonthKeys(PERIOD_COUNT) : recentWeekKeys(PERIOD_COUNT)),
    [kind],
  );
  const selectedKey = period && periods.includes(period) ? period : periods[0];
  const meta = useMemo(() => periodMeta(kind, selectedKey), [kind, selectedKey]);

  const aggregate = useCallback((key: string) => aggregateSalesReport(kind, key), [kind]);
  const { snapshot, working, error, initialized, refresh } = useReportSnapshot({
    kind,
    periodKey: selectedKey,
    aggregate,
  });

  const periodOptions = useMemo(
    () =>
      periods.map((k) => {
        const m = periodMeta(kind, k);
        return { value: k, label: `${m.label} · ${m.rangeText}` };
      }),
    [periods, kind],
  );

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
          <Box>
            <Title order={3}>{title}</Title>
            <Text size="sm" c="dimmed">
              Kỳ: {meta.rangeText}
            </Text>
          </Box>
          <Select
            data={periodOptions}
            value={selectedKey}
            onChange={(v) => v && onPeriodChange(v)}
            allowDeselect={false}
            w={isMobile ? '100%' : 280}
            aria-label="Chọn kỳ báo cáo"
          />
        </Group>
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap={8} wrap="nowrap">
            {working && snapshot && <Loader size="xs" />}
            <Text fz="xs" c="dimmed">
              {snapshot
                ? `Cập nhật lúc ${formatDateTime(snapshot.generatedAt)}${
                    snapshot.generatedByName ? ` · ${snapshot.generatedByName}` : ''
                  } · chưa gồm VAT`
                : working
                  ? 'Đang tổng hợp…'
                  : 'Chưa có báo cáo.'}
            </Text>
          </Group>
          {snapshot && (
            <Button
              size="compact-sm"
              variant="light"
              color="primary"
              leftSection={<IconRefresh size={15} />}
              loading={working}
              onClick={refresh}
            >
              Cập nhật lại
            </Button>
          )}
        </Group>
      </Stack>

      {snapshot ? (
        <SalesReport data={snapshot.data as SalesReportData} />
      ) : working || !initialized ? (
        <Paper withBorder radius="md" p="xl">
          <Stack align="center" gap="sm" py="lg">
            <Loader size="md" />
            <Text size="sm" c="dimmed">
              Đang tổng hợp báo cáo cho {meta.label}…
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Paper withBorder radius="md" p="xl">
          <Stack align="center" gap="sm" py="lg">
            <ThemeIcon size={56} radius="xl" variant="light" color={error ? 'red' : 'gray'}>
              <IconAlertTriangle size={28} stroke={1.5} />
            </ThemeIcon>
            <Text fw={700} ta="center">
              {error ? 'Không tổng hợp được báo cáo' : `Chưa có báo cáo cho ${meta.label}`}
            </Text>
            <Button
              mt="xs"
              color="primary"
              leftSection={<IconRefresh size={16} />}
              onClick={refresh}
            >
              Thử lại
            </Button>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
