import { Box, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import type {
  ReportKpi,
  ReportSeriesPoint as SeriesPoint,
  SalesRankRow as RankRow,
  SalesReportData,
  StatusBreakdownRow,
} from './reports/types';

const isMobile = device.isMobile;

function kpiLabel(t: TFunction, key: ReportKpi['key']): string {
  switch (key) {
    case 'revenue':
      return t('report.kpi.revenue');
    case 'orders':
      return t('report.kpi.orders');
    case 'customers':
      return t('report.kpi.customers');
    case 'avgOrder':
      return t('report.kpi.avgOrder');
    default:
      return key;
  }
}

function unitLabel(t: TFunction, unitKey: string): string {
  switch (unitKey) {
    case 'billion':
      return t('report.units.billion');
    case 'million':
      return t('report.units.million');
    case 'orders':
      return t('report.units.orders');
    case 'customersShort':
      return t('report.units.customersShort');
    case 'pieces':
      return t('report.units.pieces');
    default:
      return '';
  }
}

const formatVnd = (n: number): string => `${n.toLocaleString('vi-VN')} ₫`;
const formatInt = (n: number): string => n.toLocaleString('vi-VN');
const formatPct = (n: number): string => `${n.toFixed(1).replace('.', ',')}%`;

function colorValue(c: string): string {
  return c.startsWith('#') ? c : `var(--mantine-color-${c}-6)`;
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
  const { t } = useTranslation();
  return (
    <Paper withBorder radius="md" p="md">
      <Text fz="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.03em' }}>
        {kpiLabel(t, kpi.key)}
      </Text>
      <Group gap={5} align="baseline" mt={6} wrap="nowrap">
        <Text fz={isMobile ? 24 : 28} fw={800} lh={1.1}>
          {kpi.value}
        </Text>
        <Text fz="sm" fw={700} c="dimmed">
          {unitLabel(t, kpi.unitKey)}
        </Text>
      </Group>
    </Paper>
  );
}

function StatusStrip({ rows }: { rows: StatusBreakdownRow[] }) {
  const total = rows.reduce((a, r) => a + r.count, 0) || 1;
  if (rows.length === 0) {
    return (
      <Text c="dimmed" fz="sm">
        Không có đơn hàng trong kỳ.
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

function TrendChart({ series, unitText }: { series: SeriesPoint[]; unitText: string }) {
  const { t } = useTranslation();
  const max = Math.max(...series.map((s) => s.value), 1);
  const avg = Math.round(series.reduce((a, s) => a + s.value, 0) / (series.length || 1));
  const dense = series.length > 7;

  return (
    <Stack gap={6}>
      <Group justify="space-between" wrap="wrap" gap={4}>
        <Text fz="xs" c="dimmed">
          {t('report.trend.peak')}: {formatInt(max)} {unitText}
        </Text>
        <Text fz="xs" c="dimmed">
          {t('report.trend.avg')}: {formatInt(avg)} {unitText}
          {t('report.trend.perDay')}
        </Text>
      </Group>
      <Box
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: dense ? 3 : 8,
          height: isMobile ? 130 : 168,
        }}
      >
        {series.map((s, i) => (
          <Box
            key={i}
            title={`${s.label}: ${formatInt(s.value)} ${unitText}`}
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
      <Box style={{ display: 'flex', gap: dense ? 3 : 8 }}>
        {series.map((s, i) => (
          <Text key={i} fz={10} c="dimmed" ta="center" style={{ flex: 1, minWidth: 0 }}>
            {!dense || i === 0 || (i + 1) % 5 === 0 ? s.label : ''}
          </Text>
        ))}
      </Box>
    </Stack>
  );
}

function RankBar({ pct }: { pct: number }) {
  return (
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
          width: `${pct}%`,
          background: 'var(--mantine-color-primary-5)',
          borderRadius: 5,
        }}
      />
    </Box>
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

function StaffTable({ rows }: { rows: RankRow[] }) {
  const { t } = useTranslation();
  const max = Math.max(...rows.map((r) => r.amount), 1);
  const total = rows.reduce((a, r) => a + r.amount, 0) || 1;
  return (
    <Table.ScrollContainer minWidth={560}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th {...HEAD_PROPS} colSpan={2}>
              {t('report.byStaff.col')}
            </Table.Th>
            <Table.Th {...HEAD_PROPS}>{t('report.byStaff.share')}</Table.Th>
            <Table.Th {...HEAD_PROPS} ta="right">
              {t('report.byStaff.revenue')}
            </Table.Th>
            <Table.Th {...HEAD_PROPS} ta="right">
              {t('report.byStaff.share')}
            </Table.Th>
            <Table.Th {...HEAD_PROPS} ta="right">
              {t('report.byStaff.orders')}
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
              <Table.Td style={{ width: '30%' }}>
                <RankBar pct={(r.amount / max) * 100} />
              </Table.Td>
              <Table.Td ta="right">
                <Text
                  fw={700}
                  fz="sm"
                  style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatVnd(r.amount)}
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                <Text c="dimmed" fz="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatPct((r.amount / total) * 100)}
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                <Text c="dimmed" fz="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.orders}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function CustomerTable({ rows }: { rows: RankRow[] }) {
  const { t } = useTranslation();
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <Table.ScrollContainer minWidth={520}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th {...HEAD_PROPS} colSpan={2}>
              {t('report.byCustomer.col')}
            </Table.Th>
            <Table.Th {...HEAD_PROPS}>{t('report.byStaff.share')}</Table.Th>
            <Table.Th {...HEAD_PROPS} ta="right">
              {t('report.byStaff.revenue')}
            </Table.Th>
            <Table.Th {...HEAD_PROPS} ta="right">
              {t('report.byStaff.orders')}
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
              <Table.Td style={{ width: '30%' }}>
                <RankBar pct={(r.amount / max) * 100} />
              </Table.Td>
              <Table.Td ta="right">
                <Text
                  fw={700}
                  fz="sm"
                  style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatVnd(r.amount)}
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                <Text
                  c="dimmed"
                  fz="sm"
                  style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                >
                  {r.orders} {t('report.units.orders')}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function ProductTable({ rows }: { rows: RankRow[] }) {
  const { t } = useTranslation();
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <Table.ScrollContainer minWidth={520}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th {...HEAD_PROPS} colSpan={2}>
              {t('report.byProduct.col')}
            </Table.Th>
            <Table.Th {...HEAD_PROPS}>{t('report.byStaff.revenue')}</Table.Th>
            <Table.Th {...HEAD_PROPS} ta="right">
              {t('report.byProduct.qty')}
            </Table.Th>
            <Table.Th {...HEAD_PROPS} ta="right">
              {t('report.byStaff.revenue')}
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
                <Text fw={700} fz="sm" lh={1.2}>
                  {r.name}
                </Text>
                {r.sub && (
                  <Text c="dimmed" fz="xs" ff="monospace">
                    {r.sub}
                  </Text>
                )}
              </Table.Td>
              <Table.Td style={{ width: '28%' }}>
                <RankBar pct={(r.amount / max) * 100} />
              </Table.Td>
              <Table.Td ta="right">
                <Text
                  c="dimmed"
                  fz="sm"
                  style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                >
                  {formatInt(r.qty ?? 0)} {t('report.units.pieces')}
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                <Text
                  fw={700}
                  fz="sm"
                  style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatVnd(r.amount)}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function MethodBars({ data }: { data: SalesReportData }) {
  const { t } = useTranslation();
  return (
    <Stack gap="md">
      {data.methods.map((m) => (
        <Box
          key={m.name}
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '110px 1fr 78px' : '170px 1fr 96px',
            gap: isMobile ? 10 : 14,
            alignItems: 'center',
          }}
        >
          <Text fz="sm" fw={600} lineClamp={1}>
            {m.name}
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
              · {m.orders} {t('report.units.orders')}
            </Text>
          </Text>
        </Box>
      ))}
    </Stack>
  );
}

export default function SalesReport({ data }: { data: SalesReportData }) {
  const { t } = useTranslation();
  const unitText = unitLabel(t, data.seriesUnitKey);

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        {data.kpis.map((k) => (
          <KpiCard key={k.key} kpi={k} />
        ))}
      </SimpleGrid>

      <ReportSection title={t('report.status.heading')}>
        <StatusStrip rows={data.statusBreakdown} />
      </ReportSection>

      <ReportSection title={t('report.trend.heading')}>
        <TrendChart series={data.series} unitText={unitText} />
      </ReportSection>

      <ReportSection title={t('report.byStaff.heading')}>
        <StaffTable rows={data.staff} />
      </ReportSection>

      <ReportSection title={t('report.byCustomer.heading')}>
        <CustomerTable rows={data.customers} />
      </ReportSection>

      <ReportSection title={t('report.byProduct.heading')}>
        <ProductTable rows={data.products} />
      </ReportSection>

      <ReportSection title={t('report.byMethod.heading')}>
        <MethodBars data={data} />
      </ReportSection>
    </Stack>
  );
}
