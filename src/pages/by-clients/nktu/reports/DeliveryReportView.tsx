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
import { useMemo } from 'react';
import { device } from '@credo/base-ui/utils';
import { formatDateTime } from '@/utils/dateFormat';
import DeliveryReport from './DeliveryReport';
import { aggregateWeeklyDeliveryReport } from './aggregateWeeklyDeliveryReport';
import { recentWeekKeys, resolveIsoWeek } from './reportPeriods';
import { useReportSnapshot } from './useReportSnapshot';
import type { DeliveryWeeklyReportData } from './types';

const isMobile = device.isMobile;
const WEEK_COUNT = 12;

interface Props {
  title: string;
  
  period?: string;
  onPeriodChange: (period: string) => void;
}

export default function DeliveryReportView({ title, period, onPeriodChange }: Props) {
  const weeks = useMemo(() => recentWeekKeys(WEEK_COUNT), []);
  const selectedKey = period && weeks.includes(period) ? period : weeks[0];
  const week = useMemo(() => resolveIsoWeek(selectedKey), [selectedKey]);

  const { snapshot, working, error, initialized, refresh } = useReportSnapshot({
    kind: 'dr-weekly',
    periodKey: selectedKey,
    aggregate: aggregateWeeklyDeliveryReport,
  });

  const weekOptions = useMemo(
    () =>
      weeks.map((w) => {
        const r = resolveIsoWeek(w);
        return { value: w, label: `${r.label} · ${r.rangeText}` };
      }),
    [weeks],
  );

  return (
    <Stack gap="lg">
      {/* Header */}
      <Stack gap="xs">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
          <Box>
            <Title order={3}>{title}</Title>
            <Text size="sm" c="dimmed">
              Kỳ: {week.rangeText}
            </Text>
          </Box>
          <Select
            data={weekOptions}
            value={selectedKey}
            onChange={(v) => v && onPeriodChange(v)}
            allowDeselect={false}
            w={isMobile ? '100%' : 280}
          />
        </Group>
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap={8} wrap="nowrap">
            {working && snapshot && <Loader size="xs" />}
            <Text fz="xs" c="dimmed">
              {snapshot
                ? `Cập nhật lúc ${formatDateTime(snapshot.generatedAt)}${
                    snapshot.generatedByName ? ` · ${snapshot.generatedByName}` : ''
                  }`
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
        <DeliveryReport data={snapshot.data as DeliveryWeeklyReportData} />
      ) : working || !initialized ? (
        <Paper withBorder radius="md" p="xl">
          <Stack align="center" gap="sm" py="lg">
            <Loader size="md" />
            <Text size="sm" c="dimmed">
              Đang tổng hợp báo cáo cho {week.label}…
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
              {error ? 'Không tổng hợp được báo cáo' : `Chưa có báo cáo cho ${week.label}`}
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
