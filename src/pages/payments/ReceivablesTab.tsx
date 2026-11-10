import { Badge, Card, Group, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { device } from '@credo/base-ui/utils';
import type { DataTableColumn } from '@credo/base-ui/components';
import { ListCardList } from '@/components/ListCardList';
import { ListDataTable } from '@/components/ListDataTable';
import { ListPageHeader } from '@/components/ListPageHeader';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { setSalesOrderQueryRange, useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { formatDate } from '@/utils/dateFormat';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { defaultLastNDaysRange } from '@/utils/listFilterDateRange';
import { getPricingVatRate, perms } from '@/utils/permission';
import { PaymentsLoadError } from './PaymentsLoadError';
import { createdInWindow, usePaymentsWindowLoad } from './paymentsWindow';
import {
  RECEIVABLES_WINDOW_DAYS,
  WALK_IN_KEY,
  groupReceivables,
  receivableListUrl,
  scopeReceivableOrders,
  type ReceivableRow,
} from './receivables';

const isMobile = device.isMobile;
const canViewAll = perms.salesOrder.canViewAll();
const canViewSelf = perms.salesOrder.canViewSelf();
const vatRate = getPricingVatRate();

type PartyRow = ReceivableRow & { id: string; name: string };

const money = (n: number) => n.toLocaleString();
const dueText = (day: string) => (day ? formatDate(Date.parse(`${day}T00:00:00+07:00`)) : '—');

export function ReceivablesTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { items, loading, error, cachedAt, forceRefresh } = useSalesOrderStore();
  const {
    items: customers,
    loadAll: loadCustomers,
    initialized: customersInit,
  } = useCustomerStore();

  useEffect(() => {
    if (!customersInit) loadCustomers();
  }, [customersInit, loadCustomers]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('salesOrders.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const fetchRange = useMemo(() => defaultLastNDaysRange(RECEIVABLES_WINDOW_DAYS), []);
  const load = usePaymentsWindowLoad({
    range: fetchRange,
    setStoreRange: setSalesOrderQueryRange,
    forceRefresh,
  });
  const { ready } = load;

  const failed = ready && (load.rejected || !!error);

  const customerByCode = useMemo(() => new Map(customers.map((c) => [c.code, c])), [customers]);

  const todayVn = todayInVnDateString();
  const rows = useMemo<PartyRow[]>(() => {
    const scoped = scopeReceivableOrders(ready ? createdInWindow(items, fetchRange) : [], {
      canViewAll,
      canViewSelf,
      me: getCurrentEmployeeId() ?? undefined,
    });
    return groupReceivables(scoped, todayVn, vatRate).map((r) => {
      const customer = customerByCode.get(r.customerCode);
      const name =
        r.customerCode === WALK_IN_KEY
          ? t('payments.receivable.walkIn')
          : customer?.extra?.shortName || customer?.name || r.customerCode;
      return { ...r, id: r.customerCode || '__walk-in__', name };
    });
  }, [items, ready, fetchRange, todayVn, customerByCode, t]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const sums = useMemo(
    () =>
      shown.reduce(
        (a, r) => ({
          overdue: a.overdue + r.overdue,
          notYetDue: a.notYetDue + r.notYetDue,
          undated: a.undated + r.undated,
          total: a.total + r.total,
        }),
        { overdue: 0, notYetDue: 0, undated: 0, total: 0 },
      ),
    [shown],
  );

  const columns = useMemo<Array<DataTableColumn<PartyRow>>>(
    () => [
      {
        key: 'name',
        header: t('payments.receivable.columns.party'),
        render: (r) => <Text fw={600}>{r.name}</Text>,
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
            {money(r.overdue)}
          </Text>
        ),
      },
      {
        key: 'notYetDue',
        header: t('payments.columns.notYetDue'),
        ta: 'right',
        width: '150px',
        render: (r) => <Text>{money(r.notYetDue)}</Text>,
      },
      {
        key: 'undated',
        header: t('payments.columns.undated'),
        ta: 'right',
        width: '150px',
        render: (r) => <Text>{money(r.undated)}</Text>,
      },
      {
        key: 'total',
        header: t('payments.receivable.columns.total'),
        ta: 'right',
        width: '160px',
        render: (r) => <Text fw={700}>{money(r.total)}</Text>,
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

  const open = (r: PartyRow) => navigate(receivableListUrl(r.customerCode));

  const header = (
    <ListPageHeader
      title={t('payments.receivable.title')}
      cachedAt={cachedAt}
      loading={loading}
      onRefresh={forceRefresh}
      subtitle={
        <Text size="sm" c="dimmed">
          {t('payments.window', { days: RECEIVABLES_WINDOW_DAYS })}
        </Text>
      }
    />
  );

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      {header}

      {failed ? (
        <PaymentsLoadError days={RECEIVABLES_WINDOW_DAYS} onRetry={load.retry} />
      ) : (
        <>
          <Card withBorder radius="md" padding="sm" shadow="sm">
            <Group gap="lg" wrap="wrap">
              <Cell label={t('payments.receivable.partiesLabel')} value={String(shown.length)} />
              <Cell label={t('payments.columns.overdue')} value={money(sums.overdue)} />
              <Cell label={t('payments.columns.notYetDue')} value={money(sums.notYetDue)} />
              <Cell label={t('payments.columns.undated')} value={money(sums.undated)} />
              <Cell
                label={t('payments.receivable.columns.total')}
                value={money(sums.total)}
                strong
              />
            </Group>
          </Card>

          <TextInput
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder={t('payments.receivable.searchPlaceholder')}
            aria-label={t('payments.receivable.searchPlaceholder')}
          />

          {isMobile ? (
            <ListCardList
              data={shown}
              isLoading={!ready}
              emptyMessage={t('payments.receivable.empty')}
              onRowClick={open}
              renderCard={(r) => (
                <Stack gap={4}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={600}>{r.name}</Text>
                    {r.overdue > 0 && (
                      <Badge color="red" variant="light">
                        {t('payments.columns.overdue')}: {money(r.overdue)}
                      </Badge>
                    )}
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      {t('payments.receivable.columns.total')}
                    </Text>
                    <Text fw={700}>{money(r.total)}</Text>
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
              emptyMessage={t('payments.receivable.empty')}
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
