import { Badge, Card, Group, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { device } from '@credo/base-ui/utils';
import type { DataTableColumn } from '@credo/base-ui/components';
import { ListCardList } from '@/components/ListCardList';
import { ListDataTable } from '@/components/ListDataTable';
import { ListPageHeader } from '@/components/ListPageHeader';
import { setPurchaseOrderQueryRange, usePurchaseOrderStore } from '@/stores/usePurchaseOrderStore';
import { useVendorStore } from '@/stores/useVendorStore';
import { formatMoney } from '@/pages/purchase-orders/purchaseOrderModel';
import { businessDateString } from '@/utils/code';
import { formatDate } from '@/utils/dateFormat';
import { defaultLastNDaysRange } from '@/utils/listFilterDateRange';
import { PaymentsLoadError } from './PaymentsLoadError';
import { createdInWindow, usePaymentsWindowLoad } from './paymentsWindow';
import {
  PAYABLES_WINDOW_DAYS,
  groupPayables,
  payableListUrl,
  sumPayablesByCurrency,
  type PayableCurrency,
  type PayableRow,
} from './payables';

const isMobile = device.isMobile;

type PartyRow = PayableRow & { id: string; name: string };

const dueText = (day: string) => (day ? formatDate(Date.parse(`${day}T00:00:00+07:00`)) : '—');
const money = (n: number, c: PayableCurrency) => formatMoney(n, c);

export function PayablesTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { items, loading, error, cachedAt, forceRefresh } = usePurchaseOrderStore(
    useShallow((s) => ({
      items: s.items,
      loading: s.loading,
      error: s.error,
      cachedAt: s.cachedAt,
      forceRefresh: s.forceRefresh,
    })),
  );
  const { items: vendors, loadAll: loadVendors, initialized: vendorsInit } = useVendorStore();

  useEffect(() => {
    if (!vendorsInit) loadVendors();
  }, [vendorsInit, loadVendors]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('purchaseOrders.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const fetchRange = useMemo(() => defaultLastNDaysRange(PAYABLES_WINDOW_DAYS), []);
  const load = usePaymentsWindowLoad({
    range: fetchRange,
    setStoreRange: setPurchaseOrderQueryRange,
    forceRefresh,
  });
  const { ready } = load;

  const failed = ready && (load.rejected || !!error);

  const vendorByCode = useMemo(() => new Map(vendors.map((v) => [v.code, v])), [vendors]);

  const today = businessDateString();
  const rows = useMemo<PartyRow[]>(
    () =>
      groupPayables(ready ? createdInWindow(items, fetchRange) : [], today).map((r) => {
        const vendor = vendorByCode.get(r.vendorCode);
        const name = vendor?.extra?.shortName?.trim() || vendor?.name || r.vendorCode || '—';
        return { ...r, id: `${r.vendorCode}|${r.currency}`, name };
      }),
    [items, ready, fetchRange, today, vendorByCode],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const totals = useMemo(() => sumPayablesByCurrency(shown), [shown]);

  const columns = useMemo<Array<DataTableColumn<PartyRow>>>(
    () => [
      {
        key: 'name',
        header: t('payments.payable.columns.party'),
        render: (r) => <Text fw={600}>{r.name}</Text>,
      },
      {
        key: 'currency',
        header: t('payments.payable.columns.currency'),
        width: '100px',
        render: (r) => <Text>{r.currency}</Text>,
      },
      {
        key: 'orderCount',
        header: t('payments.columns.orders'),
        ta: 'right',
        width: '120px',
        render: (r) => <Text>{r.orderCount}</Text>,
      },
      {
        key: 'overdue',
        header: t('payments.columns.overdue'),
        ta: 'right',
        width: '150px',
        render: (r) => (
          <Text c={r.overdue > 0 ? 'red' : 'dimmed'} fw={r.overdue > 0 ? 600 : 400}>
            {money(r.overdue, r.currency)}
          </Text>
        ),
      },
      {
        key: 'notYetDue',
        header: t('payments.columns.notYetDue'),
        ta: 'right',
        width: '150px',
        render: (r) => <Text>{money(r.notYetDue, r.currency)}</Text>,
      },
      {
        key: 'undated',
        header: t('payments.columns.undated'),
        ta: 'right',
        width: '150px',
        render: (r) => <Text>{money(r.undated, r.currency)}</Text>,
      },
      {
        key: 'total',
        header: t('payments.payable.columns.total'),
        ta: 'right',
        width: '160px',
        render: (r) => <Text fw={700}>{money(r.total, r.currency)}</Text>,
      },
      {
        key: 'earliestDue',
        header: t('payments.columns.earliestDue'),
        ta: 'right',
        width: '140px',
        render: (r) => <Text>{dueText(r.earliestDue)}</Text>,
      },
    ],
    [t],
  );

  const open = (r: PartyRow) => navigate(payableListUrl(r.vendorCode));

  const header = (
    <ListPageHeader
      title={t('payments.payable.title')}
      cachedAt={cachedAt}
      loading={loading}
      onRefresh={forceRefresh}
      subtitle={
        <Text size="sm" c="dimmed">
          {t('payments.window', { days: PAYABLES_WINDOW_DAYS })}
        </Text>
      }
    />
  );

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      {header}

      {failed ? (
        <PaymentsLoadError days={PAYABLES_WINDOW_DAYS} onRetry={load.retry} />
      ) : (
        <>
          <Card withBorder radius="md" padding="sm" shadow="sm">
            <Stack gap="xs">
              {totals.length === 0 && (
                <Text size="sm" c="dimmed">
                  {t('payments.payable.empty')}
                </Text>
              )}
              {totals.map((c) => (
                <Group key={c.currency} gap="lg" wrap="wrap">
                  <Cell label={t('payments.payable.columns.currency')} value={c.currency} />
                  <Cell
                    label={t('payments.columns.overdue')}
                    value={money(c.overdue, c.currency)}
                  />
                  <Cell
                    label={t('payments.columns.notYetDue')}
                    value={money(c.notYetDue, c.currency)}
                  />
                  <Cell
                    label={t('payments.columns.undated')}
                    value={money(c.undated, c.currency)}
                  />
                  <Cell
                    label={t('payments.payable.columns.total')}
                    value={money(c.total, c.currency)}
                    strong
                  />
                </Group>
              ))}
            </Stack>
          </Card>

          <TextInput
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder={t('payments.payable.searchPlaceholder')}
            aria-label={t('payments.payable.searchPlaceholder')}
          />

          {isMobile ? (
            <ListCardList
              data={shown}
              isLoading={!ready}
              emptyMessage={t('payments.payable.empty')}
              onRowClick={open}
              renderCard={(r) => (
                <Stack gap={4}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={600}>
                      {r.name} · {r.currency}
                    </Text>
                    {r.overdue > 0 && (
                      <Badge color="red" variant="light">
                        {t('payments.columns.overdue')}: {money(r.overdue, r.currency)}
                      </Badge>
                    )}
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      {t('payments.payable.columns.total')}
                    </Text>
                    <Text fw={700}>{money(r.total, r.currency)}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {t('payments.columns.orders')}: {r.orderCount} ·{' '}
                    {t('payments.columns.earliestDue')}: {dueText(r.earliestDue)}
                  </Text>
                </Stack>
              )}
            />
          ) : (
            <ListDataTable
              data={shown}
              columns={columns}
              isLoading={!ready}
              emptyMessage={t('payments.payable.empty')}
              onRowClick={open}
            />
          )}
        </>
      )}
    </Stack>
  );
}

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="md" fw={strong ? 700 : 600}>
        {value}
      </Text>
    </Stack>
  );
}
