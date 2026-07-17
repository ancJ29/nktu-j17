import { Box, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { device } from '@credo/base-ui/utils';
import type { DeliveryWeeklyReportData, ReportKpi, ReportRankRow } from './types';

const isMobile = device.isMobile;

const formatInt = (n: number): string => n.toLocaleString('vi-VN');

function colorValue(c: string): string {
  return c.startsWith('#') ? c : `var(--mantine-color-${c}-6)`;
}

function kpiLabel(key: ReportKpi['key']): string {
  switch (key) {
    case 'total':
      return 'Tổng phiếu giao';
    case 'delivered':
      return 'Đã giao xong';
    case 'customers':
      return 'Khách hàng';
    case 'completionRate':
      return 'Tỷ lệ hoàn thành';
    default:
      return key;
  }
}

function unitText(unitKey: string): string {
  switch (unitKey) {
    case 'requests':
      return 'phiếu';
    case 'customersShort':
      return 'KH';
    case 'percent':
      return '%';
    default:
      return '';
  }
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper withBorder radius="md" shadow="xs">
      <Group px="lg" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        <Title order={5} fw={700} lineClamp={1}>
          {title}
        </Title>
      </Group>
      <Box px="lg" py="md">
        {children}
      </Box>
    </Paper>
  );
}

const HEAD_PROPS = {
  fz: 'xs',
  fw: 600,
  c: 'dimmed',
  tt: 'uppercase' as const,
  style: { letterSpacing: '0.02em', whiteSpace: 'nowrap' as const },
};

function KpiCard({ kpi }: { kpi: ReportKpi }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Text fz="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.03em' }}>
        {kpiLabel(kpi.key)}
      </Text>
      <Group gap={5} align="baseline" mt={6} wrap="nowrap">
        <Text fz={isMobile ? 24 : 28} fw={800} lh={1.1}>
          {kpi.value}
        </Text>
        <Text fz="sm" fw={700} c="dimmed">
          {unitText(kpi.unitKey)}
        </Text>
      </Group>
    </Paper>
  );
}

function StatusStrip({ data }: { data: DeliveryWeeklyReportData }) {
  const rows = data.statusBreakdown;
  const total = rows.reduce((a, r) => a + r.count, 0) || 1;
  if (rows.length === 0) {
    return (
      <Text c="dimmed" fz="sm">
        Không có phiếu giao trong tuần.
      </Text>
    );
  }
  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 2, sm: Math.min(rows.length, 4) }} spacing="sm">
        {rows.map((r) => (
          <Paper key={r.value} withBorder radius="md" p="sm" bg="var(--mantine-color-gray-0)">
            <Text fz={24} fw={800} lh={1.1}>
              {formatInt(r.count)}
            </Text>
            <Group gap={7} mt={2} wrap="nowrap">
              <Box
                w={10}
                h={10}
                style={{ borderRadius: 3, background: colorValue(r.color), flexShrink: 0 }}
              />
              <Text fz="sm" c="dimmed" lineClamp={1}>
                {r.label} · {Math.round((r.count / total) * 100)}%
              </Text>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>
      <Box
        style={{
          display: 'flex',
          height: 14,
          borderRadius: 7,
          overflow: 'hidden',
          border: '1px solid var(--mantine-color-gray-2)',
        }}
      >
        {rows.map((r) => (
          <Box
            key={r.value}
            style={{ width: `${(r.count / total) * 100}%`, background: colorValue(r.color) }}
          />
        ))}
      </Box>
    </Stack>
  );
}

function TrendChart({ data }: { data: DeliveryWeeklyReportData }) {
  const series = data.series;
  const max = Math.max(...series.map((s) => s.value), 1);
  const avg = Math.round(series.reduce((a, s) => a + s.value, 0) / (series.length || 1));

  return (
    <Stack gap={6}>
      <Group justify="space-between" wrap="wrap" gap={4}>
        <Text fz="xs" c="dimmed">
          Cao nhất: {formatInt(max)} phiếu
        </Text>
        <Text fz="xs" c="dimmed">
          Trung bình: {formatInt(avg)} phiếu/ngày
        </Text>
      </Group>
      <Box
        style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: isMobile ? 130 : 168 }}
      >
        {series.map((s, i) => (
          <Box
            key={i}
            title={`${s.label}: ${formatInt(s.value)} phiếu`}
            style={{
              flex: 1,
              height: '100%',
              minWidth: 0,
              display: 'flex',
              alignItems: 'flex-end',
              background: 'var(--mantine-color-primary-0)',
              borderRadius: '3px 3px 0 0',
            }}
          >
            <Box
              style={{
                width: '100%',
                height: `${(s.value / max) * 100}%`,
                background:
                  s.value === max
                    ? 'var(--mantine-color-primary-7)'
                    : 'var(--mantine-color-primary-5)',
                borderRadius: '3px 3px 0 0',
              }}
            />
          </Box>
        ))}
      </Box>
      <Box style={{ display: 'flex', gap: 8 }}>
        {series.map((s, i) => (
          <Text key={i} fz={10} c="dimmed" ta="center" style={{ flex: 1, minWidth: 0 }}>
            {s.label}
          </Text>
        ))}
      </Box>
    </Stack>
  );
}

function RankNumber({ index }: { index: number }) {
  const top = index === 0;
  return (
    <Box
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 800,
        background: top ? 'var(--mantine-color-primary-6)' : 'var(--mantine-color-primary-0)',
        color: top ? '#fff' : 'var(--mantine-color-primary-7)',
      }}
    >
      {index + 1}
    </Box>
  );
}

function RankTable({ rows, colLabel }: { rows: ReportRankRow[]; colLabel: string }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  if (rows.length === 0) {
    return (
      <Text c="dimmed" fz="sm">
        Chưa có dữ liệu.
      </Text>
    );
  }
  return (
    <Table.ScrollContainer minWidth={420}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th {...HEAD_PROPS} colSpan={2}>
              {colLabel}
            </Table.Th>
            <Table.Th {...HEAD_PROPS}>Tỷ trọng</Table.Th>
            <Table.Th {...HEAD_PROPS} ta="right">
              Số phiếu
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r, i) => (
            <Table.Tr key={r.name}>
              <Table.Td style={{ width: 34 }}>
                <RankNumber index={i} />
              </Table.Td>
              <Table.Td>
                <Text fw={700} fz="sm">
                  {r.name}
                </Text>
              </Table.Td>
              <Table.Td style={{ width: '40%' }}>
                <Box
                  style={{
                    height: 8,
                    background: 'var(--mantine-color-primary-0)',
                    borderRadius: 5,
                    overflow: 'hidden',
                    minWidth: 70,
                  }}
                >
                  <Box
                    style={{
                      height: '100%',
                      width: `${(r.count / max) * 100}%`,
                      background: 'var(--mantine-color-primary-5)',
                      borderRadius: 5,
                    }}
                  />
                </Box>
              </Table.Td>
              <Table.Td ta="right">
                <Text fw={700} fz="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatInt(r.count)}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function DirectionBars({ data }: { data: DeliveryWeeklyReportData }) {
  return (
    <Stack gap="md">
      {data.direction.map((m) => (
        <Box
          key={m.key}
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '90px 1fr 78px' : '130px 1fr 96px',
            gap: isMobile ? 10 : 14,
            alignItems: 'center',
          }}
        >
          <Text fz="sm" fw={600} lineClamp={1}>
            {m.label}
          </Text>
          <Box
            style={{
              height: 12,
              background: 'var(--mantine-color-gray-1)',
              border: '1px solid var(--mantine-color-gray-2)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <Box
              style={{
                height: '100%',
                width: `${m.pct}%`,
                background: colorValue(m.color),
                borderRadius: 6,
              }}
            />
          </Box>
          <Text
            fz="sm"
            fw={700}
            ta="right"
            style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
          >
            {m.pct}%{' '}
            <Text span c="dimmed" fw={500}>
              · {m.count} phiếu
            </Text>
          </Text>
        </Box>
      ))}
    </Stack>
  );
}

export default function DeliveryReport({ data }: { data: DeliveryWeeklyReportData }) {
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        {data.kpis.map((k) => (
          <KpiCard key={k.key} kpi={k} />
        ))}
      </SimpleGrid>

      <ReportSection title="Trạng thái phiếu giao">
        <StatusStrip data={data} />
      </ReportSection>

      <ReportSection title="Phiếu giao theo ngày">
        <TrendChart data={data} />
      </ReportSection>

      <ReportSection title="Theo tài xế">
        <RankTable rows={data.drivers} colLabel="Tài xế" />
      </ReportSection>

      <ReportSection title="Theo khách hàng">
        <RankTable rows={data.customers} colLabel="Khách hàng" />
      </ReportSection>

      <ReportSection title="Chiều giao nhận">
        <DirectionBars data={data} />
      </ReportSection>
    </Stack>
  );
}
