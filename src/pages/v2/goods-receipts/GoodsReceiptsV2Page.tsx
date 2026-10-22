import { Group, Stack, Text } from '@mantine/core';
import type { DataTableColumn } from '@credo/base-ui/components';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GoodsReceiptConfigAlerts, GoodsReceiptV2StatusBadge } from './chrome';
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
import { setGoodsReceiptV2Range, useGoodsReceiptV2Store } from '@/stores/useGoodsReceiptV2Store';
import { useVendorV2Store } from '@/stores/useVendorV2Store';
import type { GoodsReceiptV2 } from '@/types/goods-receipt-v2';
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
import { useGoodsReceiptCustomFields } from './customFields';
import { goodsReceiptListColumns, goodsReceiptHiddenColumns } from './listColumns';
import {
  goodsReceiptDefaultListStatuses,
  goodsReceiptFlow,
  goodsReceiptStatusDisplay,
} from './statusFlow';

const RANGE_DAYS = featureFlags.goodsReceiptsV2.defaultRangeDays;

const MULTI_KEYS = ['vendorIds'] as const;

export function GoodsReceiptsV2Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const receipts = useGoodsReceiptV2Store((s) => s.items);
  const loading = useGoodsReceiptV2Store((s) => s.loading);
  const initialized = useGoodsReceiptV2Store((s) => s.initialized);
  const loadAll = useGoodsReceiptV2Store((s) => s.loadAll);
  const forceRefresh = useGoodsReceiptV2Store((s) => s.forceRefresh);
  const cachedAt = useGoodsReceiptV2Store((s) => s.cachedAt);

  const vendors = useVendorV2Store((s) => s.items);
  const loadVendors = useVendorV2Store((s) => s.loadAll);

  const scrollViewportRef = useListScrollRestoration(ROUTES.GOODS_RECEIPTS_V2.LIST);

  const filters = useTransactionalV2ListFilters({
    cacheKey: 'cmngt:goods-receipt-v2-filters',
    defaultStatuses: goodsReceiptDefaultListStatuses,
    rangeDays: RANGE_DAYS,
    multiKeys: MULTI_KEYS,
    setStoreRange: setGoodsReceiptV2Range,
    loadAll,
    forceRefresh,
  });
  const { statuses, search, dateRange, anchorRange } = filters;
  const vendorIds = filters.multi.vendorIds;
  const setMulti = filters.setMulti;
  const setVendorIds = useCallback((values: string[]) => setMulti('vendorIds', values), [setMulti]);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  const matches = useCallback(
    (receipt: GoodsReceiptV2, needle: string) =>
      [receipt.receiptNumber, receipt.vendorName, receipt.reference, receipt.notes]
        .concat(receipt.items.flatMap((line) => [line.itemCode, line.itemName]))
        .some((field) => (field ?? '').toLowerCase().includes(needle)),
    [],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return receipts.filter(
      (receipt) =>
        (receipt.derivativesPending === true ||
          statuses.length === 0 ||
          statuses.includes(receipt.status)) &&
        (vendorIds.length === 0 ||
          (receipt.vendorId !== undefined && vendorIds.includes(receipt.vendorId))) &&
        inDayRange(anchorDayOf(receipt.receivedDate, receipt.createdAt), anchorRange) &&
        (needle === '' || matches(receipt, needle)),
    );
  }, [receipts, statuses, vendorIds, anchorRange, search, matches]);

  const { paginated, totalItems, hasMore, loadMore } = useListFilter(filtered, {
    shouldPagination: false,
    lazyKey: ROUTES.GOODS_RECEIPTS_V2.LIST,
  });

  const customFields = useGoodsReceiptCustomFields();
  const listFields = useMemo(
    () => customFields.filter((field) => field.showInList === true),
    [customFields],
  );

  const columns = useMemo<Array<DataTableColumn<GoodsReceiptV2>>>(() => {
    const built: Array<DataTableColumn<GoodsReceiptV2>> = [
      {
        key: 'receiptNumber',
        header: t('goodsReceiptsV2.columns.receiptNumber'),
        render: (row) => <Text fw={500}>{row.receiptNumber}</Text>,
      },
      {
        key: 'vendorName',
        header: t('goodsReceiptsV2.columns.vendor'),
        render: (row) => row.vendorName ?? '—',
      },
      {
        key: 'receivedDate',
        header: t('goodsReceiptsV2.columns.receivedDate'),
        render: (row) => (row.receivedDate ? formatDate(row.receivedDate) : '—'),
      },
      {
        key: 'items',
        header: t('goodsReceiptsV2.columns.items'),
        render: (row) => formatNumber(row.items.length),
      },
      {
        key: 'totalQuantity',
        header: t('goodsReceiptsV2.columns.totalQuantity'),
        render: (row) => formatNumber(row.totalQuantity),
      },
      {
        key: 'status',
        header: t('goodsReceiptsV2.columns.status'),
        render: (row) => (
          <Group gap={6} wrap="nowrap">
            <GoodsReceiptV2StatusBadge status={row.status} />
            {row.derivativesPending === true && (
              <PostingPendingBadge
                label={t('goodsReceiptsV2.pending.badge')}
                hint={t('goodsReceiptsV2.pending.message')}
              />
            )}
          </Group>
        ),
      },

      ...listFields.map((field) => ({
        key: customFieldColumnKey(field.key),
        header: field.label,
        render: (row: GoodsReceiptV2) => readCustomFieldValue(row.extra, field) ?? '—',
      })),
    ];
    return orderListColumns(built, goodsReceiptListColumns, goodsReceiptHiddenColumns);
  }, [t, listFields]);

  const openRow = useCallback(
    (row: GoodsReceiptV2) => void navigate(ROUTES.GOODS_RECEIPTS_V2.DETAIL.replace(':id', row.id)),
    [navigate],
  );

  const vendorOptions = useMemo(
    () => vendors.map((vendor) => ({ value: vendor.id, label: vendor.name })),
    [vendors],
  );

  const statusOptions = useMemo(
    () =>
      goodsReceiptFlow.statuses.map(({ value }) => ({
        value,
        label: goodsReceiptStatusDisplay(t, value).label,
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
        t('goodsReceiptsV2.columns.status'),
        t('common.filters.statusCount', { count: statuses.length }),
      ),
      w: 220,
    },
    {
      multi: true,
      value: vendorIds,
      onChange: setVendorIds,
      data: vendorOptions,
      placeholder: summarizeSelection(
        vendorIds,
        vendorOptions,
        t('goodsReceiptsV2.columns.vendor'),
        t('common.filters.vendorCount', { count: vendorIds.length }),
      ),

      visible: vendorOptions.length > 0 || vendorIds.length > 0,
      searchable: true,
      w: 220,
    },
  ];

  const presetLabels = useDatePresetLabels();

  const dateFilter: MoreFilterDef[] = [
    {
      type: 'dateRange',
      key: 'partitionDay',
      title: t('goodsReceiptsV2.filters.period'),
      value: dateRange,
      onChange: filters.setDateRange,
    },
  ];

  const dateIsDefault = filters.dateRangeIsDefault;
  const statusIsDefault = filters.statusesAreDefault;

  const hasPills =
    (!statusIsDefault && statuses.length > 0) ||
    vendorIds.length > 0 ||
    anchorRange !== undefined ||
    !dateIsDefault;

  return (
    <Stack gap="md">
      <GoodsReceiptConfigAlerts />
      <StickyListChrome>
        <ListPageHeader
          title={t('nav.goodsReceiptsV2')}
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={() => void forceRefresh()}
          createCta={{
            label: t('goodsReceiptsV2.addItem'),
            enabled: perms.goodsReceipt.canCreate(),
            onClick: () => void navigate(ROUTES.GOODS_RECEIPTS_V2.NEW),
          }}
        />
        {/* The selects ride the bar's own `filters` array rather than a
            sibling in an outer Group: the bar stretches and its search carries
            `flex: 1`, so a wrapper leaves it at content width and puts the
            select the wrong side of the copy-link button. */}
        <DesktopFilterBar
          search={search}
          onSearchChange={filters.setSearch}
          searchPlaceholder={t('goodsReceiptsV2.searchPlaceholder')}
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
                  {t('goodsReceiptsV2.columns.status')}: {goodsReceiptStatusDisplay(t, value).label}
                </FilterPill>
              ))}
            {vendorIds.map((id) => (
              <FilterPill
                key={id}
                onClose={() => setVendorIds(vendorIds.filter((kept) => kept !== id))}
              >
                {t('goodsReceiptsV2.columns.vendor')}:{' '}
                {vendorOptions.find((option) => option.value === id)?.label ?? id}
              </FilterPill>
            ))}
            {anchorRange && (
              <FilterPill onClose={filters.clearAnchorRange}>
                {t('goodsReceiptsV2.filters.receivedDate')}: {formatDate(anchorRange.from)} –{' '}
                {formatDate(anchorRange.to)}
              </FilterPill>
            )}
            {/* A linked business window owns the period; the widened query behind it is not a pill. */}
            {!dateIsDefault && !anchorRange && (
              <FilterPill onClose={() => filters.setDateRange(EMPTY_DATE_RANGE)}>
                {t('goodsReceiptsV2.filters.period')}:{' '}
                {formatDateRangeLabel(dateRange, presetLabels)}
              </FilterPill>
            )}
          </Group>
        )}
      </StickyListChrome>

      <ListDataTable
        data={paginated}
        columns={columns}
        isLoading={loading && !initialized}
        emptyMessage={t('goodsReceiptsV2.noItems')}
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
