import { Drawer, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { setGoodsReceiptQueryRange, useGoodsReceiptStore } from '@/stores/useGoodsReceiptStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useVendorStore } from '@/stores/useVendorStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { useProductStore } from '@/stores/useProductStore';
import { ListPagination } from '@/components/custom/ListPagination';
import { device } from '@credo/base-ui/utils';
import { useListFilter } from '@/hooks/useListFilter';
import { useTransactionalRangeRefetch } from '@/hooks/useTransactionalRangeRefetch';
import {
  DesktopFilterBar,
  type SelectFilter,
  type MultiSelectFilter,
} from '@/components/DesktopFilterBar';
import { DesktopFilterMorePopover } from '@/components/DesktopFilterMorePopover';
import { FilterPill } from '@/components/FilterPill';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { ListStatsCards, type ListStatCell } from '@/components/ListStatsCards';
import {
  MobileFilterBar,
  type MobileFilterDef,
  type MobileMultiFilterDef,
} from '@/components/MobileFilterBar';
import { MobileFilterMoreDrawer } from '@/components/MobileFilterMoreDrawer';
import { QuickFilterChips, type QuickFilterChip } from '@/components/QuickFilterChips';
import { TransactionalFilterPillsRow } from '@/components/TransactionalFilterPillsRow';
import { type MoreFilterDef, type DateRangePreset, type DateRangeValue } from '@/types/date-range';
import { EMPTY_DATE_RANGE, formatDateRangeLabel } from '@/utils/listFilterDateRange';
import {
  getGoodsReceiptPicDepartments,
  isLocationsEnabled,
  makeEmployeeDepartmentFilter,
  perms,
} from '@/utils/permission';

import { useListScrollRestoration, useLookupLabels } from '@/hooks';
import type { GoodsReceipt } from '@/types';
import { GoodsReceiptCardList } from './GoodsReceiptCardList';
import { GoodsReceiptDataTable } from './GoodsReceiptDataTable';
import {
  GoodsReceiptItemsListMobile,
  GoodsReceiptItemsTableDesktop,
} from './GoodsReceiptItemsTable';
import { GOODS_RECEIPT_STATUSES, findStatus } from './goodsReceiptStatuses';
import { useGoodsReceiptListFilters } from './useGoodsReceiptListFilters';
import type { GoodsReceiptListVariant } from './goodsReceiptListVariant';

const isMobile = device.isMobile;
const canCreate = perms.goodsReceipt.canCreate();
const locationsEnabled = isLocationsEnabled();
const picEmployeeFilter = makeEmployeeDepartmentFilter(getGoodsReceiptPicDepartments());

function quickChipDateRange(preset: 'today' | 'thisWeek'): DateRangeValue {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === 'today') return { from: today, to: today, preset };
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: monday, to: sunday, preset };
}

type GoodsReceiptListProps = {
  readonly variant: GoodsReceiptListVariant;
};

export function GoodsReceiptList({ variant }: GoodsReceiptListProps) {
  const shouldDisplayStats = variant.showStatsCards;
  const { t } = useTranslation();
  const scrollViewportRef = useListScrollRestoration(ROUTES.GOODS_RECEIPTS.LIST);

  const {
    items: storeReceipts,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useGoodsReceiptStore();

  const { items: vendors, loadAll: loadVendors, initialized: vendorsInit } = useVendorStore();
  const {
    items: employees,
    loadAll: loadEmployees,
    initialized: employeesInit,
  } = useEmployeeStore();
  const {
    items: locations,
    loadAll: loadLocations,
    initialized: locationsInit,
  } = useLocationStore();

  const products = useProductStore((s) => s.items);

  const unitLabels = useLookupLabels('unit');

  const [itemsReceipt, setItemsReceipt] = useState<GoodsReceipt | null>(null);

  const skuByItemCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) {
      const sku = p.extra?.sku?.trim();
      if (sku) m.set(p.code, sku);
    }
    return m;
  }, [products]);

  const filters = useGoodsReceiptListFilters(storeReceipts);

  useEffect(() => {
    if (!initialized && !error) loadAll();
    if (!vendorsInit) loadVendors();
    if (!employeesInit) loadEmployees();
    if (locationsEnabled && !locationsInit) loadLocations();
  }, [
    initialized,
    error,
    loadAll,
    vendorsInit,
    loadVendors,
    employeesInit,
    loadEmployees,
    locationsInit,
    loadLocations,
  ]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('goodsReceipts.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  useTransactionalRangeRefetch({
    range: filters.createdDateRange,
    setStoreRange: setGoodsReceiptQueryRange,
    forceRefresh,
  });

  const {
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    filtered,
    paginated,
    totalPages,
  } = useListFilter(filters.allReceipts, {
    filters: { _: 'noop' },
    filterFn: () => true,

    searchFields: (item) => {
      const fields: (string | undefined)[] = [
        item.receiptNumber,
        item.vendorName,
        item.reference,
        item.notes,
      ];
      for (const line of item.items) {
        fields.push(line.itemName, line.itemCode, skuByItemCode.get(line.itemCode));
      }
      return fields;
    },

    search: filters.search,
    onSearchChange: filters.setSearch,
    page: filters.page,
    onPageChange: filters.setPage,
  });

  const clearAll = filters.clearFilters;

  const hasActiveFilters = filters.hasActiveFilters || !!search;

  const statusFilterData = useMemo(
    () =>
      GOODS_RECEIPT_STATUSES.map((s) => ({
        value: s.value,
        label: t(s.labelKey),
      })),
    [t],
  );

  const vendorFilterData = useMemo(
    () =>
      vendors
        .filter((v) => !v.extra?.isDeleted)
        .map((v) => ({
          value: v.code,
          label: v.extra?.shortName?.trim() || v.name,
        })),
    [vendors],
  );

  const staffFilterData = useMemo(
    () => employees.filter(picEmployeeFilter).map((e) => ({ value: e.id, label: e.name })),
    [employees],
  );

  const employeeNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  const locationFilterData = useMemo(
    () => locations.map((l) => ({ value: l.code, label: l.name })),
    [locations],
  );

  const statsCells = useMemo<ListStatCell[]>(() => {
    if (!shouldDisplayStats) return [];
    const byCounts: Record<string, number> = {};
    for (const r of filtered) {
      byCounts[r.status] = (byCounts[r.status] ?? 0) + 1;
    }

    return [
      { key: 'total', label: t('goodsReceipts.stats.total'), value: filtered.length },
      ...GOODS_RECEIPT_STATUSES.map((s) => ({
        key: s.value,
        label: t(s.labelKey),
        value: byCounts[s.value] ?? 0,
        color: s.color,
      })),
    ];
  }, [filtered, t, shouldDisplayStats]);

  const statusPlaceholder = useMemo(() => {
    if (filters.statusFilter.length === 0) return t('__new__.01-common.filters.all');
    if (filters.statusFilter.length === 1) {
      const single = findStatus(filters.statusFilter[0] as 'draft' | 'received' | 'cancelled');
      return t(single.labelKey);
    }
    return t('common.filters.statusCount', { count: filters.statusFilter.length });
  }, [filters.statusFilter, t]);

  const presetLabels: Partial<Record<DateRangePreset, string>> = {
    today: t('common.datePreset.today'),
    yesterday: t('common.datePreset.yesterday'),
    tomorrow: t('common.datePreset.tomorrow'),
    thisWeek: t('common.datePreset.thisWeek'),
    lastWeek: t('common.datePreset.lastWeek'),
    nextWeek: t('common.datePreset.nextWeek'),

    custom: t('goodsReceipts.datePreset.custom'),
  };

  const desktopFilters: (SelectFilter | MultiSelectFilter)[] = [
    {
      value: filters.statusFilter,
      onChange: filters.setStatusFilter,
      data: statusFilterData,
      placeholder: statusPlaceholder,
      visible: statusFilterData.length > 0,
      w: 200,
      multi: true,
    },
    {
      value: filters.vendorFilter,
      onChange: filters.setVendorFilter,
      data: vendorFilterData,
      placeholder: t('common.labels.vendor'),
      visible: vendorFilterData.length > 0,
      searchable: true,
      w: 250,
    },
    {
      value: filters.staffFilter,
      onChange: filters.setStaffFilter,
      data: staffFilterData,
      placeholder: t('common.labels.assignedTo'),
      visible: staffFilterData.length > 0,
      searchable: true,
      w: 220,
    },
  ];

  const mobileFilters: (MobileFilterDef | MobileMultiFilterDef)[] = [
    {
      title: t('__new__.01-common.labels.status'),
      value: filters.statusFilter,
      options: [{ value: 'all', label: t('__new__.01-common.filters.all') }, ...statusFilterData],
      onChange: filters.setStatusFilter,
      visible: statusFilterData.length > 0,
      multi: true,
    },
  ];

  const dateAndExtraFilters: MoreFilterDef[] = [
    {
      type: 'dateRange',
      key: 'createdDate',
      title: t('common.columns.createdDate'),
      value: filters.createdDateRange,
      onChange: filters.setCreatedDateRange,
    },
    {
      type: 'dateRange',
      key: 'receivedDate',
      title: t('goodsReceipts.columns.receivedDate'),
      value: filters.receivedDateRange,
      onChange: filters.setReceivedDateRange,
    },
    ...(locationsEnabled
      ? ([
          {
            type: 'select',
            key: 'location',
            title: t('goodsReceipts.filterLocation'),
            placeholder: t('goodsReceipts.filterLocation'),
            value: filters.locationFilter,
            options: locationFilterData,
            onChange: filters.setLocationFilter,
          },
        ] as MoreFilterDef[])
      : []),
  ];

  const draftActive = filters.statusFilter.length === 1 && filters.statusFilter[0] === 'draft';
  const todayActive = filters.createdDateRange.preset === 'today';
  const thisWeekActive = filters.createdDateRange.preset === 'thisWeek';
  const mobileQuickChips: QuickFilterChip[] = useMemo(
    () => [
      {
        key: 'draft',
        label: t('goodsReceipts.statuses.draft'),
        active: draftActive,
        onClick: () => filters.setStatusFilter(draftActive ? [] : ['draft']),
      },
      {
        key: 'today',
        label: t('common.datePreset.today'),
        active: todayActive,
        onClick: () =>
          filters.setCreatedDateRange(todayActive ? EMPTY_DATE_RANGE : quickChipDateRange('today')),
      },
      {
        key: 'thisWeek',
        label: t('common.datePreset.thisWeek'),
        active: thisWeekActive,
        onClick: () =>
          filters.setCreatedDateRange(
            thisWeekActive ? EMPTY_DATE_RANGE : quickChipDateRange('thisWeek'),
          ),
      },
    ],
    [t, filters, draftActive, todayActive, thisWeekActive],
  );

  const mobileMoreFilters: MoreFilterDef[] = [
    {
      type: 'select',
      key: 'vendor',
      title: t('common.labels.vendor'),
      placeholder: t('common.labels.vendor'),
      value: filters.vendorFilter,
      options: vendorFilterData,
      onChange: filters.setVendorFilter,
    },
    {
      type: 'select',
      key: 'staff',
      title: t('common.labels.assignedTo'),
      placeholder: t('common.labels.assignedTo'),
      value: filters.staffFilter,
      options: staffFilterData,
      onChange: filters.setStaffFilter,
    },
    ...dateAndExtraFilters,
  ];

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('goodsReceipts.title')}
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={forceRefresh}
          createCta={{
            to: ROUTES.GOODS_RECEIPTS.NEW,
            label: t('goodsReceipts.addItem'),
            enabled: canCreate,

            mobileVariant: 'hidden',
          }}
        />

        <ListStatsCards visible={initialized} cells={statsCells} />

        {isMobile && <QuickFilterChips chips={mobileQuickChips} />}

        {/* Filter bar */}
        {isMobile ? (
          <MobileFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.goodsReceipts.list.searchPlaceholder')}
            status="all"
            onStatusChange={() => {}}
            hideStatus
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: '',
              inactive: '',
            }}
            filters={mobileFilters}
            moreSection={
              <MobileFilterMoreDrawer
                filters={mobileMoreFilters}
                drawerTitle={t('common.filters.more')}
                applyLabel={t('common.filters.apply')}
                presetLabels={presetLabels}
              />
            }
            hasActiveFilters={hasActiveFilters}
            onClear={clearAll}
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.goodsReceipts.list.searchPlaceholder')}
            status="all"
            onStatusChange={() => {}}
            hideStatus
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: '',
              inactive: '',
            }}
            filters={desktopFilters}
            moreSection={
              <DesktopFilterMorePopover filters={dateAndExtraFilters} presetLabels={presetLabels} />
            }
            hasActiveFilters={hasActiveFilters}
            onClear={clearAll}
          />
        )}

        <TransactionalFilterPillsRow
          defaultRange={{
            label: t('common.columns.createdDate'),
            range: filters.createdDateRange,
            presetLabels,
          }}
        >
          {filters.statusFilter.map((sf) => (
            <FilterPill
              key={sf}
              onClose={() => filters.setStatusFilter(filters.statusFilter.filter((v) => v !== sf))}
            >
              {t(findStatus(sf as 'draft' | 'received' | 'cancelled').labelKey)}
            </FilterPill>
          ))}
          {filters.vendorFilter && (
            <FilterPill onClose={() => filters.setVendorFilter(null)}>
              {vendorFilterData.find((v) => v.value === filters.vendorFilter)?.label ??
                filters.vendorFilter}
            </FilterPill>
          )}
          {filters.staffFilter && (
            <FilterPill onClose={() => filters.setStaffFilter(null)}>
              {staffFilterData.find((e) => e.value === filters.staffFilter)?.label ??
                employeeNames.get(filters.staffFilter) ??
                filters.staffFilter}
            </FilterPill>
          )}
          {locationsEnabled && filters.locationFilter && (
            <FilterPill onClose={() => filters.setLocationFilter(null)}>
              {locationFilterData.find((l) => l.value === filters.locationFilter)?.label ??
                filters.locationFilter}
            </FilterPill>
          )}
          {filters.receivedDateRange.preset && (
            <FilterPill onClose={() => filters.setReceivedDateRange(EMPTY_DATE_RANGE)}>
              {t('goodsReceipts.columns.receivedDate')}:{' '}
              {formatDateRangeLabel(filters.receivedDateRange, presetLabels)}
            </FilterPill>
          )}
        </TransactionalFilterPillsRow>
      </StickyListChrome>

      {isMobile ? (
        <GoodsReceiptCardList
          receipts={paginated}
          isLoading={loading && !initialized}
          onShowItems={setItemsReceipt}
        />
      ) : (
        <GoodsReceiptDataTable
          receipts={paginated}
          isLoading={loading && !initialized}
          viewportRef={scrollViewportRef}
          onShowItems={setItemsReceipt}
        />
      )}

      <ListPagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Drawer
        opened={itemsReceipt !== null}
        onClose={() => setItemsReceipt(null)}
        position="bottom"
        size={isMobile ? '85%' : '60%'}
        title={
          itemsReceipt && (
            <Group gap="xs" wrap="nowrap">
              <Text fw={700}>{t('goodsReceipts.detail.itemsTitle')}</Text>
              <Text fw={500}>{itemsReceipt.receiptNumber}</Text>
              <Text c="dimmed">{itemsReceipt.vendorName}</Text>
            </Group>
          )
        }
      >
        {itemsReceipt &&
          (isMobile ? (
            <GoodsReceiptItemsListMobile
              items={itemsReceipt.items}
              unitLabels={unitLabels}
              products={products}
            />
          ) : (
            <GoodsReceiptItemsTableDesktop
              items={itemsReceipt.items}
              unitLabels={unitLabels}
              products={products}
            />
          ))}
      </Drawer>
    </Stack>
  );
}
