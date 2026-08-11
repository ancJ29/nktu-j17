import {
  Badge,
  Box,
  Group,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import type { TFunction } from 'i18next';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import type { CustomerEntry, CustomerProductReportData, ProductEntry, ReportKpi } from './types';

const isMobile = device.isMobile;

type Pivot = 'customer' | 'product';

function kpiLabel(t: TFunction, key: ReportKpi['key']): string {
  switch (key) {
    case 'revenue':
      return t('report.kpi.revenue');
    case 'orders':
      return t('report.kpi.orders');
    case 'customers':
      return t('report.kpi.customers');
    case 'products':
      return t('report.kpi.products');
    default:
      return key;
  }
}

function unitLabel(t: TFunction, unitKey: string): string {
  switch (unitKey) {
    case 'vnd':
      return t('report.units.vnd');
    case 'orders':
      return t('report.units.orders');
    case 'customersShort':
      return t('report.units.customersShort');
    case 'productsShort':
      return t('report.units.productsShort');
    default:
      return '';
  }
}

const formatVnd = (n: number): string => `${Math.round(n).toLocaleString('vi-VN')} ₫`;
const formatNum = (n: number): string => n.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
const formatPct = (n: number): string => `${n.toFixed(1).replace('.', ',')}%`;

const HEAD_PROPS = {
  fz: 'xs',
  fw: 600,
  c: 'dimmed',
  tt: 'uppercase' as const,
  style: { letterSpacing: '0.02em', whiteSpace: 'nowrap' as const },
};

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

function KpiCard({ kpi }: { kpi: ReportKpi }) {
  const { t } = useTranslation();
  return (
    <Paper withBorder radius="md" p="md">
      <Text fz="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.03em' }}>
        {kpiLabel(t, kpi.key)}
      </Text>
      <Group gap={5} align="baseline" mt={6} wrap="nowrap">
        <Text fz={isMobile ? 20 : 24} fw={800} lh={1.1} style={{ wordBreak: 'break-all' }}>
          {kpi.value}
        </Text>
        <Text fz="sm" fw={700} c="dimmed">
          {unitLabel(t, kpi.unitKey)}
        </Text>
      </Group>
    </Paper>
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

interface BreakdownRow {
  key: string;
  name: string;

  sub?: string;

  unit?: string;
  qty: number;
  amount: number;
  orders: number;
}

export default function CustomerProductReport({ data }: { data: CustomerProductReportData }) {
  const { t } = useTranslation();
  const [pivot, setPivot] = useState<Pivot>('customer');
  const [picked, setPicked] = useState<Record<Pivot, string | null>>({
    customer: null,
    product: null,
  });

  const entries: (CustomerEntry | ProductEntry)[] =
    pivot === 'customer' ? data.customers : data.products;

  const selected = entries.find((e) => e.key === picked[pivot]) ?? entries[0];
  const selectedKey = selected?.key ?? null;

  const options = useMemo(
    () =>
      entries.map((e) => ({
        value: e.key,
        label:
          'unit' in e
            ? `${e.name}${e.unit ? ` (${e.unit})` : ''}${e.code ? ` · ${e.code}` : ''}`
            : `${e.name}${e.code ? ` · ${e.code}` : ''}`,
      })),
    [entries],
  );

  const rows = useMemo<BreakdownRow[]>(() => {
    if (!selectedKey) return [];
    const counterpart = new Map<string, CustomerEntry | ProductEntry>(
      (pivot === 'customer' ? data.products : data.customers).map((e) => [e.key, e]),
    );
    return data.cells
      .filter((c) => (pivot === 'customer' ? c.c === selectedKey : c.p === selectedKey))
      .map((c) => {
        const key = pivot === 'customer' ? c.p : c.c;
        const e = counterpart.get(key);
        return {
          key,
          name: e?.name ?? key,
          ...(e?.code ? { sub: e.code } : {}),
          ...(e && 'unit' in e && e.unit ? { unit: e.unit } : {}),
          qty: c.qty,
          amount: c.amount,
          orders: c.orders,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [data, pivot, selectedKey]);

  const maxAmount = Math.max(...rows.map((r) => r.amount), 1);
  const totalAmount = rows.reduce((a, r) => a + r.amount, 0) || 1;
  const isCustomerPivot = pivot === 'customer';
  const asCustomer = selected && !('unit' in selected) ? (selected as CustomerEntry) : undefined;
  const asProduct = selected && 'unit' in selected ? (selected as ProductEntry) : undefined;

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        {data.kpis.map((k) => (
          <KpiCard key={k.key} kpi={k} />
        ))}
      </SimpleGrid>

      <ReportSection title={t('report.customerProduct.pickHeading')}>
        <Stack gap="sm">
          <SegmentedControl
            fullWidth={isMobile}
            value={pivot}
            onChange={(v) => setPivot(v as Pivot)}
            data={[
              { value: 'customer', label: t('report.customerProduct.pivotCustomer') },
              { value: 'product', label: t('report.customerProduct.pivotProduct') },
            ]}
          />
          <Select
            searchable
            allowDeselect={false}
            nothingFoundMessage={t('report.customerProduct.empty')}
            placeholder={
              isCustomerPivot
                ? t('report.customerProduct.pickCustomer')
                : t('report.customerProduct.pickProduct')
            }
            data={options}
            value={selectedKey}
            onChange={(v) => v && setPicked((p) => ({ ...p, [pivot]: v }))}
            w={isMobile ? '100%' : 420}
          />

          {selected && (
            <Group gap="lg" wrap="wrap" mt={4}>
              <Box>
                <Text fw={700} fz="lg" lh={1.2}>
                  {selected.name}
                </Text>
                <Group gap={6} mt={4}>
                  {selected.code && (
                    <Badge size="sm" variant="light" color="gray">
                      {selected.code}
                    </Badge>
                  )}
                  {asProduct?.unit && (
                    <Badge size="sm" variant="light" color="teal">
                      {asProduct.unit}
                    </Badge>
                  )}
                </Group>
              </Box>
              <Group gap="xl" wrap="wrap">
                <SummaryFigure
                  label={t('report.byStaff.revenue')}
                  value={formatVnd(selected.amount)}
                />
                <SummaryFigure
                  label={t('report.byStaff.orders')}
                  value={formatNum(selected.orders)}
                />
                {asProduct && (
                  <SummaryFigure
                    label={t('report.byProduct.qty')}
                    value={`${formatNum(asProduct.qty)}${asProduct.unit ? ` ${asProduct.unit}` : ''}`}
                  />
                )}
                {asProduct && (
                  <SummaryFigure
                    label={t('report.byCustomer.col')}
                    value={formatNum(asProduct.customers)}
                  />
                )}
                {asCustomer && (
                  <SummaryFigure
                    label={t('report.customerProduct.completed')}
                    value={`${formatNum(asCustomer.completedOrders)} · ${formatVnd(
                      asCustomer.completedAmount,
                    )}`}
                  />
                )}
              </Group>
            </Group>
          )}
        </Stack>
      </ReportSection>

      <ReportSection
        title={
          isCustomerPivot
            ? t('report.customerProduct.productsHeading')
            : t('report.customerProduct.customersHeading')
        }
      >
        {rows.length === 0 ? (
          <Text c="dimmed" fz="sm">
            {t('report.customerProduct.empty')}
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={620}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th {...HEAD_PROPS}>
                    {isCustomerPivot ? t('report.byProduct.col') : t('report.byCustomer.col')}
                  </Table.Th>
                  <Table.Th {...HEAD_PROPS}>{t('report.byStaff.share')}</Table.Th>
                  <Table.Th {...HEAD_PROPS} ta="right">
                    {t('report.byProduct.qty')}
                  </Table.Th>
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
                {rows.map((r) => (
                  <Table.Tr key={r.key}>
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
                    <Table.Td style={{ width: '24%' }}>
                      <RankBar pct={(r.amount / maxAmount) * 100} />
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text
                        fw={700}
                        fz="sm"
                        style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                      >
                        {formatNum(r.qty)}
                        {r.unit ? (
                          <Text span c="dimmed" fw={500}>
                            {' '}
                            {r.unit}
                          </Text>
                        ) : null}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text
                        fw={700}
                        fz="sm"
                        style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                      >
                        {formatVnd(r.amount)}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text c="dimmed" fz="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatPct((r.amount / totalAmount) * 100)}
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
        )}
      </ReportSection>
    </Stack>
  );
}

function SummaryFigure({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text fz="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.02em' }}>
        {label}
      </Text>
      <Text fw={800} fz={isMobile ? 'md' : 'lg'} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Text>
    </Box>
  );
}
