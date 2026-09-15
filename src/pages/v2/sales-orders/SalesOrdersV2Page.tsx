import { Group, Stack, Text } from '@mantine/core';
import type { DataTableColumn } from '@credo/base-ui/components';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SalesOrderConfigAlerts, SalesOrderV2StatusBadge } from './chrome';
import { useDatePresetLabels } from '@/hooks/useDatePresetLabels';
import { useNavigate } from 'react-router';
import { DesktopFilterBar, type MultiSelectFilter } from '@/components/DesktopFilterBar';
import { summarizeSelection } from '@/components/desktopFilterDefs';
import { DesktopFilterMorePopover } from '@/components/DesktopFilterMorePopover';
import { FilterPill } from '@/components/FilterPill';
import { ListDataTable } from '@/components/ListDataTable';
import { ListPageHeader } from '@/components/ListPageHeader';
import { PostingPendingBadge } from '@/components/PostingPendingBadge';
import { StickyListChrome } from '@/components/StickyListChrome';
import { ROUTES } from '@/constants/routes';
import { LIST_LAZY_RENDER_CHUNK } from '@/config/listDefaults';
import { useListFilter } from '@/hooks/useListFilter';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { setSalesOrderV2Range, useSalesOrderV2Store } from '@/stores/useSalesOrderV2Store';
import { useCustomerV2Store } from '@/stores/useCustomerV2Store';
import type { SalesOrderV2 } from '@/types/sales-order-v2';
import { EMPTY_DATE_RANGE, type MoreFilterDef } from '@/types/date-range';
import { featureFlags } from '@/utils/features';
import { perms } from '@/utils/permission';
import { formatDate } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import { formatDateRangeLabel } from '@/utils/listFilterDateRange';
import { customFieldColumnKey, readCustomFieldValue } from '@/utils/customFields';
import { orderListColumns } from '@/utils/listColumnOrder';
import { anchorDayOf, inDayRange } from '../anchorDay';
import { useTransactionalV2ListFilters } from '../useTransactionalV2ListFilters';
import { useSalesOrderCustomFields } from './customFields';
import { salesOrderListColumns, salesOrderHiddenColumns } from './listColumns';
import {
  salesOrderDefaultListStatuses,
  salesOrderFlow,
  salesOrderStatusDisplay,
} from './statusFlow';
import { paymentTrackingOn } from './payment';
import { SalesOrderDeliveryBadge } from './SalesOrderDeliveryBadge';
import { SalesOrderPaymentBadge } from './SalesOrderPaymentBadge';

const RANGE_DAYS = featureFlags.salesOrdersV2.defaultRangeDays;

const MULTI_KEYS = ['customerIds', 'itemIds'] as const;

export function SalesOrdersV2Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const orders = useSalesOrderV2Store((s) => s.items);
  const loading = useSalesOrderV2Store((s) => s.loading);
  const initialized = useSalesOrderV2Store((s) => s.initialized);
  const loadAll = useSalesOrderV2Store((s) => s.loadAll);
  const forceRefresh = useSalesOrderV2Store((s) => s.forceRefresh);
  const cachedAt = useSalesOrderV2Store((s) => s.cachedAt);

  const customers = useCustomerV2Store((s) => s.items);
  const loadCustomers = useCustomerV2Store((s) => s.loadAll);

  const scrollViewportRef = useListScrollRestoration(ROUTES.SALES_ORDERS_V2.LIST);

  const filters = useTransactionalV2ListFilters({
    cacheKey: 'cmngt:sales-order-v2-filters',
    defaultStatuses: salesOrderDefaultListStatuses,
    rangeDays: RANGE_DAYS,
    multiKeys: MULTI_KEYS,
    setStoreRange: setSalesOrderV2Range,
    loadAll,
    forceRefresh,
  });
  const { statuses, search, dateRange, anchorRange } = filters;
  const customerIds = filters.multi.customerIds;
  const itemIds = filters.multi.itemIds;
  const setMulti = filters.setMulti;
  const setCustomerIds = useCallback(
    (values: string[]) => setMulti('customerIds', values),
    [setMulti],
  );

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const matches = useCallback(
    (order: SalesOrderV2, needle: string) =>
      [order.orderNumber, order.customerName, order.reference, order.notes]
        .concat(order.items.flatMap((line) => [line.itemCode, line.itemName]))
        .some((field) => (field ?? '').toLowerCase().includes(needle)),
    [],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter(
      (order) =>
        (order.derivativesPending === true ||
          statuses.length === 0 ||
          statuses.includes(order.status)) &&
        (customerIds.length === 0 ||
          (order.customerId !== undefined && customerIds.includes(order.customerId))) &&
        (itemIds.length === 0 || order.items.some((line) => itemIds.includes(line.itemId))) &&
        inDayRange(anchorDayOf(order.orderDate, order.createdAt), anchorRange) &&
        (needle === '' || matches(order, needle)),
    );
  }, [orders, statuses, customerIds, itemIds, anchorRange, search, matches]);

  const itemLabel = useCallback(
    (itemId: string) => {
      for (const order of orders) {
        const line = order.items.find((l) => l.itemId === itemId);
        if (line) return line.itemCode ? `${line.itemCode} · ${line.itemName}` : line.itemName;
      }
      return itemId;
    },
    [orders],
  );

  const { paginated, totalItems, hasMore, loadMore } = useListFilter(filtered, {
    shouldPagination: false,
    lazyKey: ROUTES.SALES_ORDERS_V2.LIST,
  });

  const customFields = useSalesOrderCustomFields();
  const listFields = useMemo(
    () => customFields.filter((field) => field.showInList === true),
    [customFields],
  );

  const columns = useMemo<Array<DataTableColumn<SalesOrderV2>>>(() => {
    const built: Array<DataTableColumn<SalesOrderV2>> = [
      {
        key: 'orderNumber',
        header: t('salesOrdersV2.columns.orderNumber'),
        render: (row) => <Text fw={500}>{row.orderNumber}</Text>,
      },
      {
        key: 'customerName',
        header: t('salesOrdersV2.columns.customer'),
        render: (row) => row.customerName ?? '—',
      },
      {
        key: 'orderDate',
        header: t('salesOrdersV2.columns.orderDate'),
        render: (row) => (row.orderDate ? formatDate(row.orderDate) : '—'),
      },
      {
        key: 'items',
        header: t('salesOrdersV2.columns.items'),
        render: (row) => formatNumber(row.items.length),
      },
      {
        key: 'requestedDate',
        header: t('salesOrdersV2.columns.requestedDate'),
        render: (row) => (row.requestedDate ? formatDate(row.requestedDate) : '—'),
      },
      {
        key: 'totalQuantity',
        header: t('salesOrdersV2.columns.totalQuantity'),
        render: (row) => formatNumber(row.totalQuantity),
      },
      {
        key: 'totalAmount',
        header: t('salesOrdersV2.columns.totalAmount'),
        render: (row) => (row.totalAmount === undefined ? '—' : formatNumber(row.totalAmount)),
      },

      ...(paymentTrackingOn
        ? [
            {
              key: 'paymentStatus',
              header: t('salesOrdersV2.columns.paymentStatus'),
              render: (row: SalesOrderV2) => <SalesOrderPaymentBadge order={row} />,
            },
          ]
        : []),
      {
        key: 'status',
        header: t('salesOrdersV2.columns.status'),
        render: (row) => (
          <Group gap={6} wrap="nowrap">
            <SalesOrderV2StatusBadge status={row.status} />
            {/* A second dimension beside the workflow status, like payment —
                except this one is DERIVED, so it cannot fall behind the notes
                that move it. It draws nothing on most rows. */}
            <SalesOrderDeliveryBadge order={row} />
            {row.derivativesPending === true && (
              <PostingPendingBadge
                label={t('salesOrdersV2.pending.badge')}
                hint={t('salesOrdersV2.pending.message')}
              />
            )}
          </Group>
        ),
      },

      ...listFields.map((field) => ({
        key: customFieldColumnKey(field.key),
        header: field.label,
        render: (row: SalesOrderV2) => readCustomFieldValue(row.extra, field) ?? '—',
      })),
    ];
    return orderListColumns(built, salesOrderListColumns, salesOrderHiddenColumns);
  }, [t, listFields]);

  const openRow = useCallback(
    (row: SalesOrderV2) => void navigate(ROUTES.SALES_ORDERS_V2.DETAIL.replace(':id', row.id)),
    [navigate],
  );

  const customerOptions = useMemo(
    () => customers.map((customer) => ({ value: customer.id, label: customer.name })),
    [customers],
  );

  const statusOptions = useMemo(
    () =>
      salesOrderFlow.statuses.map(({ value }) => ({
        value,
        label: salesOrderStatusDisplay(t, value).label,
      })),
    [t],
  );

  const barFilters: MultiSelectFilter[] = [
    {
      multi: true,
      value: statuses,
      onChange: filters.setStatuses,
      data: statusOptions,
      placeholder: summarizeSelection(
        statuses,
        statusOptions,
        t('salesOrdersV2.columns.status'),
        t('common.filters.statusCount', { count: statuses.length }),
      ),
      w: 220,
    },
    {
      multi: true,
      value: customerIds,
      onChange: setCustomerIds,
      data: customerOptions,
      placeholder: summarizeSelection(
        customerIds,
        customerOptions,
        t('salesOrdersV2.columns.customer'),
        t('common.filters.customerCount', { count: customerIds.length }),
      ),

      visible: customerOptions.length > 0 || customerIds.length > 0,
      searchable: true,
      w: 220,
    },
  ];

  const presetLabels = useDatePresetLabels();

  const dateFilter: MoreFilterDef[] = [
    {
      type: 'dateRange',
      key: 'partitionDay',
      title: t('salesOrdersV2.filters.period'),
      value: dateRange,
      onChange: filters.setDateRange,
    },
  ];

  const dateIsDefault = filters.dateRangeIsDefault;
  const statusIsDefault = filters.statusesAreDefault;
  const hasPills =
    (!statusIsDefault && statuses.length > 0) ||
    customerIds.length > 0 ||
    itemIds.length > 0 ||
    anchorRange !== undefined ||
    !dateIsDefault;

  return (
    <Stack gap="md">
      <SalesOrderConfigAlerts />
      <StickyListChrome>
        <ListPageHeader
          title={t('nav.salesOrdersV2')}
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={() => void forceRefresh()}
          createCta={{
            label: t('salesOrdersV2.addItem'),
            enabled: perms.salesOrder.canCreate(),
            onClick: () => void navigate(ROUTES.SALES_ORDERS_V2.NEW),
          }}
        />
        {/* The selects ride the bar's own `filters` array rather than a
            sibling in an outer Group: the bar stretches and its search carries
            `flex: 1`, so a wrapper leaves it at content width and puts the
            select the wrong side of the copy-link button. */}
        <DesktopFilterBar
          search={search}
          onSearchChange={filters.setSearch}
          searchPlaceholder={t('salesOrdersV2.searchPlaceholder')}
          hideStatus
          filters={barFilters}
          moreSection={
            <DesktopFilterMorePopover filters={dateFilter} presetLabels={presetLabels} />
          }
          hasActiveFilters={filters.hasActiveFilters}
          onClear={filters.clearFilters}
        />

        {/* Pills name what a summary can only count, and are the fastest way to
            drop ONE value. A resting default earns none — a selection nobody
            made is not a narrowing to close, and a client with four configured
            statuses would otherwise open under four pills every visit. */}
        {hasPills && (
          <Group gap="xs">
            {!statusIsDefault &&
              statuses.map((value) => (
                <FilterPill
                  key={value}
                  onClose={() => filters.setStatuses(statuses.filter((kept) => kept !== value))}
                >
                  {t('salesOrdersV2.columns.status')}: {salesOrderStatusDisplay(t, value).label}
                </FilterPill>
              ))}
            {customerIds.map((id) => (
              <FilterPill
                key={id}
                onClose={() => setCustomerIds(customerIds.filter((kept) => kept !== id))}
              >
                {t('salesOrdersV2.columns.customer')}:{' '}
                {customerOptions.find((option) => option.value === id)?.label ?? id}
              </FilterPill>
            ))}
            {itemIds.map((id) => (
              <FilterPill
                key={id}
                onClose={() =>
                  setMulti(
                    'itemIds',
                    itemIds.filter((kept) => kept !== id),
                  )
                }
              >
                {t('salesOrdersV2.filters.item')}: {itemLabel(id)}
              </FilterPill>
            ))}
            {anchorRange && (
              <FilterPill onClose={filters.clearAnchorRange}>
                {t('salesOrdersV2.filters.orderDate')}: {formatDate(anchorRange.from)} –{' '}
                {formatDate(anchorRange.to)}
              </FilterPill>
            )}
            {/* A linked business window owns the period; the widened query behind it is not a pill. */}
            {!dateIsDefault && !anchorRange && (
              <FilterPill onClose={() => filters.setDateRange(EMPTY_DATE_RANGE)}>
                {t('salesOrdersV2.filters.period')}: {formatDateRangeLabel(dateRange, presetLabels)}
              </FilterPill>
            )}
          </Group>
        )}
      </StickyListChrome>

      <ListDataTable
        data={paginated}
        columns={columns}
        isLoading={loading && !initialized}
        emptyMessage={t('salesOrdersV2.noItems')}
        onRowClick={openRow}
        viewportRef={scrollViewportRef}
        hasMore={hasMore}
        onLoadMore={loadMore}
        loadingMoreLabel={t('__new__.01-common.list.loadingMore', {
          chunk: Math.min(totalItems - paginated.length, LIST_LAZY_RENDER_CHUNK),
          total: totalItems,
        })}
      />
    </Stack>
  );
}
