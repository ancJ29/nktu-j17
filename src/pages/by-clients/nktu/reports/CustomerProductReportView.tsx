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
import CustomerProductReport from './CustomerProductReport';
import { aggregateCustomerProductReport } from './aggregateCustomerProductReport';
import { recentMonthKeys, resolveMonth } from './reportPeriods';
import { useReportSnapshot } from './useReportSnapshot';
import type { CustomerProductReportData } from './types';

const isMobile = device.isMobile;
const MONTH_COUNT = 12;

interface Props {
  title: string;

  period?: string;
  onPeriodChange: (period: string) => void;
}

export default function CustomerProductReportView({ title, period, onPeriodChange }: Props) {
  const months = useMemo(() => recentMonthKeys(MONTH_COUNT), []);
  const selectedKey = period && months.includes(period) ? period : months[0];
  const meta = useMemo(() => resolveMonth(selectedKey), [selectedKey]);

  const { snapshot, working, error, initialized, refresh } = useReportSnapshot({
    kind: 'sales-customer',
    periodKey: selectedKey,
    aggregate: aggregateCustomerProductReport,
  });

  const monthOptions = useMemo(
    () =>
      months.map((m) => {
        const r = resolveMonth(m);
        return { value: m, label: `${r.label} · ${r.rangeText}` };
      }),
    [months],
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
            data={monthOptions}
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
                  } · đơn chưa huỷ, chưa gồm VAT`
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
        <CustomerProductReport data={snapshot.data as CustomerProductReportData} />
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
