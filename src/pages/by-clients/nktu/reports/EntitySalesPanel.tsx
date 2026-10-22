import {
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { IconChartBar, IconRefresh } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import type { EntitySalesTarget } from '@/pages/reports/EntitySalesPanel';
import { formatDateTime } from '@/utils/dateFormat';
import { aggregateCustomerProductReport } from './aggregateCustomerProductReport';
import { recentMonthKeys, resolveMonth } from './reportPeriods';
import { useReportSnapshot } from './useReportSnapshot';
import type { CustomerProductReportData } from './types';

const isMobile = device.isMobile;
const MONTH_COUNT = 12;

const formatVnd = (n: number): string => `${Math.round(n).toLocaleString('vi-VN')} ₫`;
const formatNum = (n: number): string => n.toLocaleString('vi-VN', { maximumFractionDigits: 3 });

interface Row {
  key: string;
  name: string;
  sub?: string;
  unit?: string;
  qty: number;
  amount: number;
  orders: number;
}

interface Resolved {
  rows: Row[];

  orders: number;
  amount: number;

  qty?: number;
  unit?: string;

  chips: { key: 'completed' | 'buyers'; value: string }[];

  matched: boolean;
}

function resolveCustomer(data: CustomerProductReportData, code: string): Resolved {
  const entry = data.customers.find((c) => c.key === `code:${code}`);
  if (!entry) return EMPTY;
  const products = new Map(data.products.map((p) => [p.key, p]));
  const rows = data.cells
    .filter((c) => c.c === entry.key)
    .map((c) => {
      const p = products.get(c.p);
      return {
        key: c.p,
        name: p?.name ?? c.p,
        ...(p?.code ? { sub: p.code } : {}),
        ...(p?.unit ? { unit: p.unit } : {}),
        qty: c.qty,
        amount: c.amount,
        orders: c.orders,
      };
    })
    .sort((a, b) => b.amount - a.amount);
  return {
    rows,
    orders: entry.orders,
    amount: entry.amount,
    chips: [
      {
        key: 'completed',
        value: `${formatNum(entry.completedOrders)} · ${formatVnd(entry.completedAmount)}`,
      },
    ],
    matched: true,
  };
}

function resolveProduct(
  data: CustomerProductReportData,
  target: Extract<EntitySalesTarget, { kind: 'product' }>,
): Resolved {
  const entries = data.products.filter((p) =>
    target.code ? p.code === target.code : !p.code && p.name === target.name,
  );
  if (entries.length === 0) return EMPTY;
  const keys = new Set(entries.map((p) => p.key));
  const customers = new Map(data.customers.map((c) => [c.key, c]));
  const multiUnit = entries.length > 1;
  const unitOf = new Map(entries.map((p) => [p.key, p.unit]));
  const rows = data.cells
    .filter((c) => keys.has(c.p))
    .map((c) => {
      const customer = customers.get(c.c);

      const unit = multiUnit ? unitOf.get(c.p) : undefined;
      return {
        key: `${c.c}-${c.p}`,
        name: customer?.name ?? c.c,
        ...(customer?.code ? { sub: customer.code } : {}),
        ...(unit ? { unit } : {}),
        qty: c.qty,
        amount: c.amount,
        orders: c.orders,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const buyers = new Set(data.cells.filter((c) => keys.has(c.p)).map((c) => c.c)).size;
  return {
    rows,

    orders: entries.reduce((a, p) => a + p.orders, 0),
    amount: entries.reduce((a, p) => a + p.amount, 0),

    ...(multiUnit
      ? {}
      : { qty: entries[0]?.qty ?? 0, ...(entries[0]?.unit ? { unit: entries[0].unit } : {}) }),
    chips: [{ key: 'buyers', value: formatNum(buyers) }],
    matched: true,
  };
}

const EMPTY: Resolved = { rows: [], orders: 0, amount: 0, chips: [], matched: false };

export default function EntitySalesPanel({ target }: { target: EntitySalesTarget }) {
  const { t } = useTranslation();
  const months = useMemo(() => recentMonthKeys(MONTH_COUNT), []);
  const [periodKey, setPeriodKey] = useState(months[0] ?? '');
  const meta = useMemo(() => resolveMonth(periodKey), [periodKey]);

  const { snapshot, working, error, initialized, refresh } = useReportSnapshot({
    kind: 'sales-customer',
    periodKey,
    aggregate: aggregateCustomerProductReport,
    auto: false,
  });

  const data = snapshot?.data as CustomerProductReportData | undefined;
  const resolved = useMemo<Resolved>(() => {
    if (!data) return EMPTY;
    return target.kind === 'customer'
      ? resolveCustomer(data, target.code)
      : resolveProduct(data, target);
  }, [data, target]);

  const monthOptions = useMemo(
    () =>
      months.map((m) => {
        const r = resolveMonth(m);
        return { value: m, label: `${r.label} · ${r.rangeText}` };
      }),
    [months],
  );

  const maxAmount = Math.max(...resolved.rows.map((r) => r.amount), 1);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <Select
          data={monthOptions}
          value={periodKey}
          onChange={(v) => v && setPeriodKey(v)}
          allowDeselect={false}
          w={isMobile ? '100%' : 280}
        />
        <Group gap={8} wrap="nowrap">
          {working && <Loader size="xs" />}
          <Button
            size="compact-sm"
            variant="light"
            color="primary"
            leftSection={<IconRefresh size={15} />}
            loading={working}
            onClick={refresh}
          >
            {snapshot ? t('report.entityTab.recompute') : t('report.entityTab.generate')}
          </Button>
        </Group>
      </Group>

      {snapshot && (
        <Group gap="lg" wrap="wrap">
          <Figure label={t('report.byStaff.revenue')} value={formatVnd(resolved.amount)} />
          <Figure label={t('report.byStaff.orders')} value={formatNum(resolved.orders)} />
          {resolved.qty != null && (
            <Figure
              label={t('report.byProduct.qty')}
              value={`${formatNum(resolved.qty)}${resolved.unit ? ` ${resolved.unit}` : ''}`}
            />
          )}
          {resolved.chips.map((c) => (
            <Figure
              key={c.key}
              label={
                c.key === 'completed'
                  ? t('report.customerProduct.completed')
                  : t('report.byCustomer.col')
              }
              value={c.value}
            />
          ))}
        </Group>
      )}

      {!snapshot ? (
        <EmptyState
          text={
            error
              ? t('report.entityTab.failed')
              : working || !initialized
                ? t('report.entityTab.loading')
                : t('report.entityTab.noSnapshot', { period: meta.label })
          }
        />
      ) : !resolved.matched || resolved.rows.length === 0 ? (
        <EmptyState text={t('report.customerProduct.empty')} />
      ) : (
        <Table.ScrollContainer minWidth={520}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  {target.kind === 'customer'
                    ? t('report.byProduct.col')
                    : t('report.byCustomer.col')}
                </Table.Th>
                <Table.Th ta="right">{t('report.byProduct.qty')}</Table.Th>
                <Table.Th ta="right">{t('report.byStaff.revenue')}</Table.Th>
                <Table.Th ta="right">{t('report.byStaff.orders')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {resolved.rows.map((r) => (
                <Table.Tr key={r.key}>
                  <Table.Td>
                    <Text fw={600} fz="sm" lh={1.2}>
                      {r.name}
                    </Text>
                    <Group gap={6} mt={2}>
                      {r.sub && (
                        <Text c="dimmed" fz="xs" ff="monospace">
                          {r.sub}
                        </Text>
                      )}
                      {r.unit && (
                        <Badge size="xs" variant="light" color="gray" radius="sm">
                          {r.unit}
                        </Badge>
                      )}
                    </Group>
                    <Box
                      mt={6}
                      style={{
                        height: 6,
                        maxWidth: 160,
                        background: 'var(--mantine-color-primary-0)',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        style={{
                          height: '100%',
                          width: `${(r.amount / maxAmount) * 100}%`,
                          background: 'var(--mantine-color-primary-5)',
                        }}
                      />
                    </Box>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text fw={600} fz="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatNum(r.qty)}
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
                      {r.orders}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {snapshot && (
        <Text fz="xs" c="dimmed">
          {t('report.entityTab.generatedAt', {
            at: formatDateTime(snapshot.generatedAt),
          })}
          {snapshot.generatedByName ? ` · ${snapshot.generatedByName}` : ''} ·{' '}
          {t('report.entityTab.basis')}
        </Text>
      )}
    </Stack>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
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

function EmptyState({ text }: { text: string }) {
  return (
    <Paper withBorder radius="md" p="lg">
      <Group justify="center" gap="sm" py="md">
        <IconChartBar size={20} stroke={1.6} color="var(--mantine-color-dimmed)" />
        <Text size="sm" c="dimmed" ta="center">
          {text}
        </Text>
      </Group>
    </Paper>
  );
}
