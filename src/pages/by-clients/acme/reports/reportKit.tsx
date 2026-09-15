import {
  Alert,
  Anchor,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconRefresh, IconRotateClockwise } from '@tabler/icons-react';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { device } from '@credo/base-ui/utils';
import type { ReportReloadMode } from '@/pages/v2/reports/useWindowRows';

const isMobile = device.isMobile;

export function ReportLink({ to, children }: { to?: string; children: ReactNode }) {
  if (!to) return <>{children}</>;
  return (
    <Anchor component={Link} to={to} underline="hover" c="inherit" fw="inherit" fz="inherit">
      {children}
    </Anchor>
  );
}

export function KpiCard({ label, value, to }: { label: string; value: string; to?: string }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Text fz="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.03em' }}>
        {label}
      </Text>
      <Text
        fz={isMobile ? 20 : 24}
        fw={800}
        lh={1.1}
        mt={6}
        c={to ? 'primary' : undefined}
        style={{ wordBreak: 'break-all' }}
      >
        <ReportLink to={to}>{value}</ReportLink>
      </Text>
    </Paper>
  );
}

export interface ReportRefreshProps {
  loadedAt?: number;
  refreshing: boolean;
  onReload: (mode: ReportReloadMode) => void;
}

function RefreshControl({ loadedAt, refreshing, onReload }: ReportRefreshProps) {
  return (
    <Stack gap={4} align={isMobile ? 'stretch' : 'flex-end'}>
      <Group gap="xs" wrap="nowrap" grow={isMobile}>
        <Button
          size="compact-sm"
          variant="light"
          leftSection={<IconRefresh size={14} />}
          loading={refreshing}
          onClick={() => onReload('update')}
        >
          Cập nhật
        </Button>
        <Tooltip label="Bỏ dữ liệu đã lưu trên máy, đọc lại toàn bộ kỳ" withArrow>
          <Button
            size="compact-sm"
            variant="subtle"
            color="gray"
            leftSection={<IconRotateClockwise size={14} />}
            disabled={refreshing}
            onClick={() => onReload('regenerate')}
          >
            Tính lại
          </Button>
        </Tooltip>
      </Group>
      {loadedAt !== undefined && (
        <Text fz="xs" c="dimmed" ta={isMobile ? 'center' : 'right'}>
          Cập nhật lúc{' '}
          {new Date(loadedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}
    </Stack>
  );
}

export function ReportHeader({
  title,
  subtitle,
  control,
  refresh,
}: {
  title: string;
  subtitle: string;
  control: ReactNode;
  refresh: ReportRefreshProps;
}) {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
      <div>
        <Title order={3}>{title}</Title>
        <Text size="sm" c="dimmed">
          {subtitle}
        </Text>
      </div>
      <Stack gap="sm" style={isMobile ? { width: '100%' } : undefined}>
        {control}
        <RefreshControl {...refresh} />
      </Stack>
    </Group>
  );
}

export function RankBar({ pct }: { pct: number }) {
  return (
    <Box
      style={{
        height: 8,
        background: 'var(--mantine-color-primary-0)',
        borderRadius: 5,
        overflow: 'hidden',
        minWidth: 60,
      }}
    >
      <Box
        style={{
          height: '100%',
          width: `${pct}%`,
          background: 'var(--mantine-color-primary-5)',
          borderRadius: 5,
        }}
      />
    </Box>
  );
}

export function LoadingRow() {
  return (
    <Group gap="sm" justify="center" py="xl">
      <Loader size="sm" />
      <Text size="sm" c="dimmed">
        Đang tổng hợp…
      </Text>
    </Group>
  );
}

export function LoadErrorAlert() {
  return (
    <Alert color="red" icon={<IconAlertTriangle size={18} />}>
      Không tải được dữ liệu đơn hàng. Thử lại sau.
    </Alert>
  );
}

export function FlowInvalidAlert({ errors }: { errors: string[] }) {
  return (
    <Alert
      color="red"
      icon={<IconAlertTriangle size={18} />}
      title="Cấu hình trạng thái không hợp lệ"
    >
      {errors.join(' · ')}
    </Alert>
  );
}

export function UnknownStatusAlert({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
      {count} đơn có trạng thái ngoài cấu hình hiện tại — chưa được tính vào báo cáo.
    </Alert>
  );
}

export function UnpricedFootnote({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Text size="xs" c="dimmed">
      {count} đơn chưa nhập giá không được cộng vào doanh thu.
    </Text>
  );
}

export interface ReportMetric {
  label: string;
  value: ReactNode;

  to?: string;

  c?: string;
  strong?: boolean;
}

export interface ReportRowData {
  key: string;

  title: ReactNode;

  subtitle?: ReactNode;
  titleTo?: string;
  titleDimmed?: boolean;

  barPct?: number;

  metrics: ReportMetric[];
}

function MetricValue({ metric }: { metric: ReportMetric }) {
  return (
    <Text
      span
      fw={metric.strong ? 700 : undefined}
      c={metric.c ?? (metric.to ? 'primary' : undefined)}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <ReportLink to={metric.to}>{metric.value}</ReportLink>
    </Text>
  );
}

function RowIdentity({ row }: { row: ReportRowData }) {
  return (
    <>
      <Text fw={600} fz="sm" lh={1.25} c={row.titleDimmed ? 'dimmed' : undefined}>
        <ReportLink to={row.titleTo}>{row.title}</ReportLink>
      </Text>
      {row.subtitle !== undefined && (
        <Text c="dimmed" fz="xs" ff="monospace">
          {row.subtitle}
        </Text>
      )}
    </>
  );
}

export function ReportTable({
  identityHeader,
  rows,
  empty,
  minWidth = 560,
  barWidth = '22%',
}: {
  identityHeader: string;
  rows: ReportRowData[];
  empty: string;
  minWidth?: number;
  barWidth?: string;
}) {
  const metricLabels = rows[0]?.metrics.map((m) => m.label) ?? [];
  const hasBar = rows.some((r) => r.barPct !== undefined);

  if (isMobile) {
    if (rows.length === 0) {
      return (
        <Paper withBorder radius="md" p="md">
          <Text c="dimmed" fz="sm" ta="center">
            {empty}
          </Text>
        </Paper>
      );
    }
    return (
      <Stack gap="xs">
        {rows.map((row) => {
          const [primary, ...rest] = row.metrics;
          return (
            <Paper key={row.key} withBorder radius="md" p="sm">
              <Stack gap={6}>
                <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <RowIdentity row={row} />
                  </Box>
                  {primary && (
                    <Text fz="sm" fw={700} lh={1.25} style={{ whiteSpace: 'nowrap' }}>
                      <MetricValue metric={primary} />
                    </Text>
                  )}
                </Group>
                {row.barPct !== undefined && <RankBar pct={row.barPct} />}
                {rest.length > 0 && (
                  <Text fz="xs" c="dimmed" lh={1.4}>
                    {rest.map((metric, i) => (
                      <Fragment key={metric.label}>
                        {i > 0 && ' · '}
                        {metric.label} <MetricValue metric={metric} />
                      </Fragment>
                    ))}
                  </Text>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    );
  }

  return (
    <Paper withBorder radius="md">
      <Table.ScrollContainer minWidth={minWidth}>
        <Table verticalSpacing="sm" striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{identityHeader}</Table.Th>
              {hasBar && <Table.Th />}
              {metricLabels.map((label) => (
                <Table.Th key={label} ta="right">
                  {label}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={metricLabels.length + (hasBar ? 2 : 1)}>
                  <Text c="dimmed" fz="sm" ta="center" py="sm">
                    {empty}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {rows.map((row) => (
              <Table.Tr key={row.key}>
                <Table.Td>
                  <RowIdentity row={row} />
                </Table.Td>
                {hasBar && (
                  <Table.Td style={{ width: barWidth }}>
                    {row.barPct !== undefined && <RankBar pct={row.barPct} />}
                  </Table.Td>
                )}
                {row.metrics.map((metric) => (
                  <Table.Td key={metric.label} ta="right">
                    <MetricValue metric={metric} />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}
