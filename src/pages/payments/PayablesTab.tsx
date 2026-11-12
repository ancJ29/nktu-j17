import { Button, Card, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { device } from '@credo/base-ui/utils';
import type { DataTableColumn } from '@credo/base-ui/components';
import { ConfirmModal } from '@/components/ConfirmModal';
import { LIST_LAZY_RENDER_CHUNK } from '@/config/listDefaults';
import { ListCardList } from '@/components/ListCardList';
import { ListDataTable } from '@/components/ListDataTable';
import { ListPageHeader } from '@/components/ListPageHeader';
import { selectionColumn } from '@/components/selectionColumn';
import { ROUTES } from '@/constants/routes';
import { useListFilter } from '@/hooks/useListFilter';
import { useSelectionMode } from '@/hooks/useRowSelection';
import { PurchaseOrderPaymentState } from '@/pages/purchase-orders/PurchaseOrderPaymentState';
import {
  paidInFull,
  writePurchaseOrderPayment,
  writePurchaseOrderTracking,
} from '@/pages/purchase-orders/purchaseOrderPaymentWrite';
import { setPurchaseOrderQueryRange, usePurchaseOrderStore } from '@/stores/usePurchaseOrderStore';
import { useVendorStore } from '@/stores/useVendorStore';
import {
  formatMoney,
  orderTotal,
  poCurrency,
  poOrderDateIso,
} from '@/pages/purchase-orders/purchaseOrderModel';
import type { PurchaseOrder } from '@/types';
import { businessDateString } from '@/utils/code';
import { formatDate } from '@/utils/dateFormat';
import { defaultLastNDaysRange } from '@/utils/listFilterDateRange';
import { isPricingManagementEnabled, perms } from '@/utils/permission';
import { PayableRowActions } from './PayableRowActions';
import { PaymentsLoadError } from './PaymentsLoadError';
import { bulkMark } from './bulkMarkPayments';
import { createdInWindow, usePaymentsWindowLoad } from './paymentsWindow';
import { usePaymentsUrlState } from './paymentsUrlState';
import {
  PAYABLES_WINDOW_DAYS,
  matchesPayableFilter,
  payableOf,
  sumPayables,
  type PayableCurrency,
} from './payables';
import { RECEIVABLE_FILTERS, parseReceivableFilter } from './receivables';

const isMobile = device.isMobile;

const canMark = perms.purchaseOrder.canMarkPaid();
const showPrice = isPricingManagementEnabled() && perms.purchaseOrder.canViewPrice();

const money = (n: number, c: PayableCurrency) => formatMoney(n, c);
const deadlineText = (po: PurchaseOrder) =>
  po.paymentDeadline ? formatDate(po.paymentDeadline) : '—';

export function PayablesTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, updateState } = usePaymentsUrlState();
  const filter = parseReceivableFilter(state.pf);
  const vendorCode = state.pv ?? null;
  const search = state.pq ?? '';
  const selection = useSelectionMode();
  const { selectionMode } = selection;
  const [bulkKind, setBulkKind] = useState<'paid' | 'untrack' | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

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
  const vendorName = (po: PurchaseOrder) => {
    const v = vendorByCode.get(po.vendorCode);
    return v?.extra?.shortName?.trim() || v?.name || po.vendorName || po.vendorCode || '—';
  };
  const vendorOptions = useMemo(
    () =>
      vendors
        .filter((v) => v.isActive)
        .map((v) => ({ value: v.code, label: v.extra?.shortName?.trim() || v.name })),
    [vendors],
  );

  const today = businessDateString();
  const rows = useMemo<PurchaseOrder[]>(() => {
    const q = search.trim().toLowerCase();
    const kept = (ready ? createdInWindow(items, fetchRange) : []).filter((po) => {
      if (!matchesPayableFilter(po, filter, today)) return false;
      if (vendorCode && po.vendorCode !== vendorCode) return false;
      if (!q) return true;
      const v = vendorByCode.get(po.vendorCode);
      const name = v?.extra?.shortName?.trim() || v?.name || po.vendorName || '';
      return (po.orderNumber ?? '').toLowerCase().includes(q) || name.toLowerCase().includes(q);
    });

    const due = (po: PurchaseOrder) => payableOf(po, today)?.dueDay ?? '';
    return kept.sort((a, b) => {
      const da = due(a);
      const db = due(b);
      if (da !== db) return da === '' ? 1 : db === '' ? -1 : da < db ? -1 : 1;
      return (a.orderNumber ?? '').localeCompare(b.orderNumber ?? '');
    });
  }, [items, ready, fetchRange, today, filter, vendorCode, search, vendorByCode]);

  const totals = useMemo(() => sumPayables(rows, today), [rows, today]);

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
  const leftOf = (po: PurchaseOrder) => payableOf(po, today)?.remaining ?? 0;

  const canBulk = !isMobile && canMark;
  const selectable = useMemo(
    () => rows.filter((po) => payableOf(po, today) !== null),
    [rows, today],
  );
  const selectableIds = useMemo(() => selectable.map((po) => po.id), [selectable]);
  const chosen = useMemo(
    () => selectable.filter((po) => selection.isSelected(po.id)),
    [selectable, selection],
  );

  const chosenTotal = useMemo(
    () =>
      sumPayables(chosen, today)
        .map((c) => `${money(c.total, c.currency)} ${c.currency}`)
        .join(' + '),
    [chosen, today],
  );
  const headerSel = selection.headerState(selectableIds);

  const runBulk = async () => {
    const kind = bulkKind;
    if (!kind) return;
    setProgress({ done: 0, total: chosen.length });

    const result = await bulkMark(
      chosen,
      (po) =>
        kind === 'paid'
          ? writePurchaseOrderPayment(po, paidInFull(po))
          : writePurchaseOrderTracking(po, true),
      (done, total) => setProgress({ done, total }),
    );
    setProgress(null);
    setBulkKind(null);

    const stay = new Set(
      [...result.conflicted, ...result.failed.map((f) => f.item)].map((po) => po.id),
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

  const columns = useMemo<Array<DataTableColumn<PurchaseOrder>>>(
    () => [
      {
        key: 'orderNumber',
        header: t('purchaseOrders.columns.orderNumber'),
        width: '150px',
        render: (po) => (
          <Text fz="sm" fw={500} style={{ whiteSpace: 'nowrap' }}>
            {po.orderNumber || '—'}
          </Text>
        ),
      },
      {
        key: 'orderDate',
        header: t('purchaseOrders.form.orderDateLabel'),
        width: '110px',
        render: (po) => (
          <Text fz="sm">{poOrderDateIso(po) ? formatDate(poOrderDateIso(po)) : '—'}</Text>
        ),
      },
      {
        key: 'vendor',
        header: t('common.labels.vendor'),
        width: '200px',
        render: (po) => <Text fz="sm">{vendorName(po)}</Text>,
      },
      {
        key: 'currency',
        header: t('payments.payable.columns.currency'),
        width: '90px',
        render: (po) => <Text fz="sm">{poCurrency(po)}</Text>,
      },
      {
        key: 'total',
        header: t('purchaseOrders.columns.total'),
        ta: 'right',
        width: '140px',
        render: (po) => (
          <Text fz="sm" ta="right">
            {money(orderTotal(po), poCurrency(po))}
          </Text>
        ),
      },
      {
        key: 'left',
        header: t('payments.payable.columns.total'),
        ta: 'right',
        width: '140px',
        render: (po) => (
          <Text fz="sm" fw={600} ta="right">
            {money(leftOf(po), poCurrency(po))}
          </Text>
        ),
      },
      {
        key: 'deadline',
        header: t('purchaseOrders.form.paymentDeadlineLabel'),
        width: '120px',
        render: (po) => {
          const overdue = payableOf(po, today)?.bucket === 'overdue';
          return (
            <Text fz="sm" c={overdue ? 'red' : undefined} fw={overdue ? 600 : undefined}>
              {deadlineText(po)}
            </Text>
          );
        },
      },
      {
        key: 'payment',
        header: t('purchaseOrders.columns.payment'),
        width: '170px',
        render: (po) => <PurchaseOrderPaymentState order={po} />,
      },

      {
        key: 'marks',
        header: '',
        width: '210px',
        render: (po) =>
          canMark && payableOf(po, today) !== null ? (
            <PayableRowActions order={po} showPrice={showPrice} />
          ) : null,
      },
    ],

    [t, today, vendorByCode],
  );

  const tableColumns = useMemo(() => {
    if (!selectionMode) return columns;
    const sel = selectionColumn<PurchaseOrder>({
      keyOf: (po) => po.id,
      isSelected: (id) => selection.isSelected(id),
      onToggleRow: (id) => selection.toggle(id),
      onToggleAll: () => selection.toggleAllIn(selectableIds),
      allSelected: headerSel.allSelected,
      someSelected: headerSel.someSelected,
      selectAllLabel: t('payments.bulk.selectAll'),
      rowLabel: (po) => po.orderNumber,
    });
    const boxed = new Set(selectableIds);

    return [
      { ...sel, render: (po: PurchaseOrder) => (boxed.has(po.id) ? sel.render(po) : null) },
      ...columns.filter((c) => c.key !== 'marks'),
    ];
  }, [columns, selectionMode, selection, selectableIds, headerSel, t]);

  const open = (po: PurchaseOrder) => navigate(ROUTES.PURCHASE_ORDERS.DETAIL.replace(':id', po.id));

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

          <Group gap="sm" wrap="wrap" align="flex-end">
            <Select
              aria-label={t('payments.filter.label')}
              data={RECEIVABLE_FILTERS.map((f) => ({ value: f, label: t(`payments.filter.${f}`) }))}
              value={filter}
              allowDeselect={false}
              onChange={(v) => updateState({ pf: parseReceivableFilter(v) })}
              w={isMobile ? '100%' : 200}
            />
            <Select
              aria-label={t('common.labels.vendor')}
              placeholder={t('common.labels.vendor')}
              data={vendorOptions}
              value={vendorCode}
              clearable
              searchable
              onChange={(v) => updateState({ pv: v ?? undefined })}
              w={isMobile ? '100%' : 240}
            />
            <TextInput
              value={search}
              onChange={(e) => updateState({ pq: e.currentTarget.value })}
              placeholder={t('payments.payable.searchPlaceholder')}
              aria-label={t('payments.payable.searchPlaceholder')}
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
            title={t(bulkKind === 'paid' ? 'payments.bulk.paidAll' : 'payments.bulk.untrackAll', {
              count: chosen.length,
            })}
            message={t(
              bulkKind === 'paid' ? 'payments.bulk.confirmPaid' : 'payments.bulk.confirmUntrack',
              { count: chosen.length, total: chosenTotal },
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
              emptyMessage={t('payments.payable.empty')}
              onRowClick={open}
              renderCard={(po) => (
                <Stack gap={4}>
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Text fw={700} style={{ minWidth: 0, wordBreak: 'break-word' }}>
                      {po.orderNumber}
                    </Text>
                    <PurchaseOrderPaymentState order={po} />
                  </Group>
                  <Text size="sm">{vendorName(po)}</Text>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      {t('payments.payable.columns.total')}
                    </Text>
                    <Text fw={700}>
                      {money(leftOf(po), poCurrency(po))} {poCurrency(po)}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {t('purchaseOrders.form.paymentDeadlineLabel')}: {deadlineText(po)}
                  </Text>
                </Stack>
              )}
            />
          ) : (
            <ListDataTable
              columnWidthsKey="payments-payables"
              data={shownRows}
              hasMore={hasMore}
              onLoadMore={loadMore}
              loadingMoreLabel={loadingMoreLabel}
              columns={tableColumns}
              isLoading={!ready}
              emptyMessage={t('payments.payable.empty')}

              onRowClick={
                selectionMode
                  ? (po) => {
                      if (selectableIds.includes(po.id)) selection.toggle(po.id);
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
