import { Button, Card, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { device } from '@credo/base-ui/utils';
import type { DataTableColumn } from '@credo/base-ui/components';
import { ConfirmModal } from '@/components/ConfirmModal';
import { LIST_LAZY_RENDER_CHUNK } from '@/config/listDefaults';
import { ListCardList } from '@/components/ListCardList';
import { ListDataTable } from '@/components/ListDataTable';
import { ListPageHeader } from '@/components/ListPageHeader';
import { selectionColumn } from '@/components/selectionColumn';
import { ROUTES } from '@/constants/routes';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { useListFilter } from '@/hooks/useListFilter';
import { useSelectionMode } from '@/hooks/useRowSelection';
import { SalesOrderPaymentMark } from '@/pages/sales-orders/SalesOrderPaymentMark';
import { salesOrderUntrackPatch } from '@/pages/sales-orders/salesOrderMetaPatch';
import { setSalesOrderQueryRange, useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import type { SalesOrder } from '@/types';
import { resolveSalesOrderCustomerName } from '@/utils/customerDisplay';
import { formatDate } from '@/utils/dateFormat';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { defaultLastNDaysRange } from '@/utils/listFilterDateRange';
import { getPricingVatRate, isPricingManagementEnabled, perms } from '@/utils/permission';
import { getSalesOrderReadyDate } from '@/utils/salesOrderReadyDate';
import { computeSalesOrderTotals, isSalesOrderOverdue } from '@/utils/salesOrderPricing';
import { PaymentsLoadError } from './PaymentsLoadError';
import { ReceivableRowActions } from './ReceivableRowActions';
import { bulkMark } from './bulkMarkPayments';
import {
  PAID_IN_FULL_PATCH,
  isMarkable,
  viewerMayMark,
  writeReceivableMark,
} from './receivableMarks';
import { createdInWindow, usePaymentsWindowLoad } from './paymentsWindow';
import { usePaymentsUrlState } from './paymentsUrlState';
import {
  RECEIVABLES_WINDOW_DAYS,
  RECEIVABLE_FILTERS,
  matchesReceivableFilter,
  parseReceivableFilter,
  receivableOf,
  scopeReceivableOrders,
  sumReceivables,
} from './receivables';

const isMobile = device.isMobile;
const canViewAll = perms.salesOrder.canViewAll();
const canViewSelf = perms.salesOrder.canViewSelf();
const vatRate = getPricingVatRate();
const viewer = {
  showPrice: isPricingManagementEnabled() && perms.salesOrder.canViewPrice(),
  canManagePayment: perms.salesOrder.canManagePayment(),
};

const money = (n: number) => n.toLocaleString();
const dueText = (ms: number | undefined) => (ms ? formatDate(ms) : '—');

export function ReceivablesTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, updateState } = usePaymentsUrlState();
  const filter = parseReceivableFilter(state.rf);
  const customerCode = state.rc ?? null;
  const search = state.rq ?? '';
  const selection = useSelectionMode();
  const { selectionMode } = selection;
  const [bulkKind, setBulkKind] = useState<'paid' | 'untrack' | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { items, loading, error, cachedAt, forceRefresh } = useSalesOrderStore();
  const {
    items: customers,
    loadAll: loadCustomers,
    initialized: customersInit,
    getByCode,
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

  const customerOptions = useMemo(
    () =>
      customers
        .filter((c) => c.isActive)
        .map((c) => ({ value: c.code, label: c.extra?.shortName || c.name })),
    [customers],
  );

  const todayVn = todayInVnDateString();
  const rows = useMemo<SalesOrder[]>(() => {
    const scoped = scopeReceivableOrders(ready ? createdInWindow(items, fetchRange) : [], {
      canViewAll,
      canViewSelf,
      me: getCurrentEmployeeId() ?? undefined,
    });
    const q = search.trim().toLowerCase();
    const kept = scoped.filter((o) => {
      if (!matchesReceivableFilter(o, filter, todayVn, vatRate)) return false;
      if (customerCode && o.extra?.customerCode !== customerCode) return false;
      if (!q) return true;
      const name = resolveSalesOrderCustomerName(o, getByCode) ?? '';
      return (o.orderNumber ?? '').toLowerCase().includes(q) || name.toLowerCase().includes(q);
    });

    const due = (o: SalesOrder) => receivableOf(o, todayVn, vatRate)?.dueDay ?? '';
    return kept.sort((a, b) => {
      const da = due(a);
      const db = due(b);
      if (da !== db) return da === '' ? 1 : db === '' ? -1 : da < db ? -1 : 1;
      return (a.orderNumber ?? '').localeCompare(b.orderNumber ?? '');
    });
  }, [items, ready, fetchRange, todayVn, filter, customerCode, search, getByCode]);

  const sums = useMemo(() => sumReceivables(rows, todayVn, vatRate), [rows, todayVn]);

  const {
    paginated: shownRows,
    totalItems,
    hasMore,
    loadMore,
  } = useListFilter(rows, { lazyKey: ROUTES.PAYMENTS.LIST, shouldPagination: false });
  const loadingMoreLabel = t('__new__.01-common.list.loadingMore', {
    chunk: Math.min(totalItems - shownRows.length, LIST_LAZY_RENDER_CHUNK),
    total: totalItems,
  });

  const canBulk = !isMobile && viewer.showPrice && viewer.canManagePayment;
  const selectable = useMemo(
    () => rows.filter((o) => viewerMayMark(o, viewer) && isMarkable(o, todayVn, vatRate)),
    [rows, todayVn],
  );
  const selectableIds = useMemo(() => selectable.map((o) => o.id), [selectable]);
  const chosen = useMemo(
    () => selectable.filter((o) => selection.isSelected(o.id)),
    [selectable, selection],
  );
  const chosenTotal = chosen.reduce(
    (a, o) => a + (receivableOf(o, todayVn, vatRate)?.remaining ?? 0),
    0,
  );
  const headerSel = selection.headerState(selectableIds);

  const runBulk = async () => {
    const kind = bulkKind;
    if (!kind) return;
    const patch = kind === 'paid' ? PAID_IN_FULL_PATCH : salesOrderUntrackPatch(true);
    setProgress({ done: 0, total: chosen.length });

    const result = await bulkMark(
      chosen,
      (o) => writeReceivableMark(o, patch),
      (done, total) => setProgress({ done, total }),
    );
    setProgress(null);
    setBulkKind(null);

    const stay = new Set(
      [...result.conflicted, ...result.failed.map((f) => f.item)].map((o) => o.id),
    );
    selection.clear();
    for (const id of stay) selection.toggle(id);
    notifications.show({
      color: result.failed.length > 0 ? 'red' : result.conflicted.length > 0 ? 'yellow' : 'teal',
      title: t('payments.bulk.doneTitle'),
      message: t('payments.bulk.done', {
        saved: result.saved.length,
        conflicted: result.conflicted.length,
        failed: result.failed.length,
      }),
      autoClose: 10000,
    });
  };

  const customerName = (o: SalesOrder) => resolveSalesOrderCustomerName(o, getByCode) ?? '-';
  const leftOf = (o: SalesOrder) => receivableOf(o, todayVn, vatRate)?.remaining ?? 0;

  const columns = useMemo<Array<DataTableColumn<SalesOrder>>>(
    () => [
      {
        key: 'orderNumber',
        header: t('salesOrders.columns.orderNumber'),
        width: '180px',
        render: (o) => (
          <Text fz="md" fw={500}>
            {o.orderNumber}
          </Text>
        ),
      },
      {
        key: 'orderDate',
        header: t('__new__.01-common.labels.orderDate'),
        width: '120px',
        render: (o) => <Text size="sm">{formatDate(getSalesOrderReadyDate(o))}</Text>,
      },
      {
        key: 'customer',
        header: t('common.labels.customer'),
        width: '200px',
        render: (o) => <Text fz="md">{customerName(o)}</Text>,
      },
      {
        key: 'grandTotal',
        header: t('salesOrders.finance.grandTotalLabel'),
        ta: 'right',
        width: '150px',
        render: (o) => (
          <Text size="sm" ta="right">
            {money(computeSalesOrderTotals(o, vatRate).grandTotal)}
          </Text>
        ),
      },
      {
        key: 'left',
        header: t('payments.receivable.columns.total'),
        ta: 'right',
        width: '150px',
        render: (o) => (
          <Text size="sm" fw={600} ta="right">
            {money(leftOf(o))}
          </Text>
        ),
      },
      {
        key: 'dueDate',
        header: t('salesOrders.finance.dueDateLabel'),
        width: '120px',
        render: (o) => {
          const overdue = isSalesOrderOverdue(o, todayVn, vatRate);
          return (
            <Text size="sm" c={overdue ? 'red' : undefined} fw={overdue ? 600 : undefined}>
              {dueText(o.extra?.paymentDeadline)}
            </Text>
          );
        },
      },
      {
        key: 'payment',
        header: t('salesOrders.finance.paymentLabel'),
        width: '170px',
        render: (o) => <SalesOrderPaymentMark order={o} vatRate={vatRate} todayVn={todayVn} />,
      },

      {
        key: 'marks',
        header: '',
        width: '210px',
        render: (o) =>
          viewerMayMark(o, viewer) && isMarkable(o, todayVn, vatRate) ? (
            <ReceivableRowActions order={o} vatRate={vatRate} left={leftOf(o)} />
          ) : null,
      },
    ],

    [t, todayVn, getByCode],
  );

  const tableColumns = useMemo(() => {
    if (!selectionMode) return columns;
    const sel = selectionColumn<SalesOrder>({
      keyOf: (o) => o.id,
      isSelected: (id) => selection.isSelected(id),
      onToggleRow: (id) => selection.toggle(id),
      onToggleAll: () => selection.toggleAllIn(selectableIds),
      allSelected: headerSel.allSelected,
      someSelected: headerSel.someSelected,
      selectAllLabel: t('payments.bulk.selectAll'),
      rowLabel: (o) => o.orderNumber,
    });
    const boxed = new Set(selectableIds);

    return [
      { ...sel, render: (o: SalesOrder) => (boxed.has(o.id) ? sel.render(o) : null) },
      ...columns.filter((c) => c.key !== 'marks'),
    ];
  }, [columns, selectionMode, selection, selectableIds, headerSel, t]);

  const open = (o: SalesOrder) => navigate(ROUTES.SALES_ORDERS.DETAIL.replace(':id', o.id));

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

          <Group gap="sm" wrap="wrap" align="flex-end">
            <Select
              aria-label={t('payments.filter.label')}
              data={RECEIVABLE_FILTERS.map((f) => ({ value: f, label: t(`payments.filter.${f}`) }))}
              value={filter}
              allowDeselect={false}
              onChange={(v) => updateState({ rf: parseReceivableFilter(v) })}
              w={isMobile ? '100%' : 200}
            />
            <Select
              aria-label={t('common.labels.customer')}
              placeholder={t('common.labels.customer')}
              data={customerOptions}
              value={customerCode}
              clearable
              searchable
              onChange={(v) => updateState({ rc: v ?? undefined })}
              w={isMobile ? '100%' : 240}
            />
            <TextInput
              value={search}
              onChange={(e) => updateState({ rq: e.currentTarget.value })}
              placeholder={t('payments.receivable.searchPlaceholder')}
              aria-label={t('payments.receivable.searchPlaceholder')}
              style={{ flex: 1, minWidth: 200 }}
            />
          </Group>

          {canBulk && (
            <Group gap="sm" wrap="wrap">
              {selectionMode ? (
                <>
                  <Button
                    color="teal"
                    size="compact-md"
                    disabled={chosen.length === 0 || progress !== null}
                    onClick={() => setBulkKind('paid')}
                  >
                    {t('payments.bulk.paidAll', { count: chosen.length })}
                  </Button>
                  <Button
                    variant="default"
                    size="compact-md"
                    disabled={chosen.length === 0 || progress !== null}
                    onClick={() => setBulkKind('untrack')}
                  >
                    {t('payments.bulk.untrackAll', { count: chosen.length })}
                  </Button>
                  <Button
                    variant="subtle"
                    size="compact-md"
                    disabled={progress !== null}
                    onClick={selection.exitSelectionMode}
                  >
                    {t('payments.bulk.exit')}
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  size="compact-md"
                  disabled={selectable.length === 0}
                  onClick={selection.enterSelectionMode}
                >
                  {t('payments.bulk.select')}
                </Button>
              )}
            </Group>
          )}

          <ConfirmModal
            opened={bulkKind !== null}
            onClose={() => progress === null && setBulkKind(null)}
            onConfirm={() => void runBulk()}
            title={
              bulkKind === 'paid'
                ? t('payments.bulk.paidAll', { count: chosen.length })
                : t('payments.bulk.untrackAll', { count: chosen.length })
            }
            message={t(
              bulkKind === 'paid' ? 'payments.bulk.confirmPaid' : 'payments.bulk.confirmUntrack',
              {
                count: chosen.length,
                total: money(chosenTotal),
              },
            )}
            confirmLabel={
              bulkKind === 'paid' ? t('payments.mark.paid') : t('payments.mark.untrack')
            }
            confirmColor={bulkKind === 'paid' ? 'teal' : 'gray'}
            loading={progress !== null}
          >
            {progress && (
              <Text size="sm" c="dimmed">
                {t('payments.bulk.progress', { done: progress.done, total: progress.total })}
              </Text>
            )}
          </ConfirmModal>

          {isMobile ? (
            <ListCardList
              data={shownRows}
              hasMore={hasMore}
              onLoadMore={loadMore}
              loadingMoreLabel={loadingMoreLabel}
              isLoading={!ready}
              emptyMessage={t('payments.receivable.empty')}
              onRowClick={open}
              renderCard={(o) => (
                <Stack gap={4}>
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Text fw={700} style={{ minWidth: 0, wordBreak: 'break-word' }}>
                      {o.orderNumber}
                    </Text>
                    <SalesOrderPaymentMark order={o} vatRate={vatRate} todayVn={todayVn} />
                  </Group>
                  <Text size="sm">{customerName(o)}</Text>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      {t('payments.receivable.columns.total')}
                    </Text>
                    <Text fw={700}>{money(leftOf(o))}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {t('salesOrders.finance.dueDateLabel')}: {dueText(o.extra?.paymentDeadline)}
                  </Text>
                </Stack>
              )}
            />
          ) : (
            <ListDataTable
              columnWidthsKey="payments-receivables"
              data={shownRows}
              hasMore={hasMore}
              onLoadMore={loadMore}
              loadingMoreLabel={loadingMoreLabel}
              columns={tableColumns}
              isLoading={!ready}
              emptyMessage={t('payments.receivable.empty')}

              onRowClick={
                selectionMode
                  ? (o) => {
                      if (selectableIds.includes(o.id)) selection.toggle(o.id);
                    }
                  : open
              }
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
      <Text size="md" fw={strong ? 700 : 600} data-testid={strong ? 'strip-total' : undefined}>
        {value}
      </Text>
    </Stack>
  );
}
