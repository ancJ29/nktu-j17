import { Group, Stack, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { ListPagination } from '@/components/custom/ListPagination';
import { DesktopFilterBar, type SelectFilter } from '@/components/DesktopFilterBar';
import { DesktopFilterMorePopover } from '@/components/DesktopFilterMorePopover';
import { MobileFilterBar, type MobileFilterDef } from '@/components/MobileFilterBar';
import { allOptionFilter } from '@/components/mobileFilterDefs';
import { MobileFilterMoreDrawer } from '@/components/MobileFilterMoreDrawer';
import { FilterPill } from '@/components/FilterPill';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useListFilter } from '@/hooks/useListFilter';
import {
  EMPTY_DATE_RANGE,
  type DateRangePreset,
  type DateRangeValue,
  type MoreFilterDef,
} from '@/types/date-range';
import {
  defaultLastNDaysRange,
  formatDateRangeLabel,
  isDefaultLastNDaysRange,
} from '@/utils/listFilterDateRange';
import { WarehouseDocDataTable } from './WarehouseDocDataTable';
import { WarehouseDocCardList } from './WarehouseDocCardList';
import { bundleFor, type WarehouseDocKind } from './kinds';

const isMobile = device.isMobile;
const RANGE_DAYS = 14;

export function WarehouseDocList({ kind }: { kind: WarehouseDocKind }) {
  const { t } = useTranslation();
  const bundle = bundleFor(kind);
  const canCreate = kind.perms.canCreate();
  const postEnabled = kind.postInventoryEnabled();

  const {
    items: docs,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = bundle.useStore();

  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    defaultLastNDaysRange(RANGE_DAYS),
  );
  const [searchState, setSearchState] = useState('');
  const [picFilter, setPicFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const employees = useEmployeeStore((s) => s.items);
  const employeesInitialized = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);
  useEffect(() => {
    if (!employeesInitialized) loadEmployees();
  }, [employeesInitialized, loadEmployees]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('warehouseDoc.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const applyDateRange = useCallback(
    (next: DateRangeValue) => {
      const effective = next.from && next.to ? next : defaultLastNDaysRange(RANGE_DAYS);
      setDateRange(effective);
      bundle.setRange(effective.from, effective.to);
      forceRefresh();
    },
    [bundle, forceRefresh],
  );

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(docs, {
      filters: { assignedTo: picFilter, status: statusFilter },
      filterFn: (d, f) =>
        !d.extra?.isDeleted &&
        (!f.assignedTo || d.extra.assignedTo === f.assignedTo) &&
        (!f.status || (d.extra.status ?? 'draft') === f.status),
      searchFields: (d) => [d.extra.code, d.extra.reference ?? '', d.extra.note ?? ''],
      search: searchState,
      onSearchChange: setSearchState,
    });

  const picData = useMemo(
    () =>
      employees
        .filter((e) => e.isActive && !e.extra?.isDeleted)
        .map((e) => ({ value: e.id, label: e.name })),
    [employees],
  );
  const picLabel = (id: string) => employees.find((e) => e.id === id)?.name ?? id;

  const statusData = [
    { value: 'draft', label: t('warehouseDoc.status.draft') },
    { value: 'confirmed', label: t('warehouseDoc.status.confirmed') },
  ];

  const presetLabels: Partial<Record<DateRangePreset, string>> = {
    today: t('common.datePreset.today'),
    yesterday: t('common.datePreset.yesterday'),
    thisWeek: t('common.datePreset.thisWeek'),
    lastWeek: t('common.datePreset.lastWeek'),
    thisMonth: t('common.datePreset.thisMonth'),
    lastMonth: t('common.datePreset.lastMonth'),
    custom: t('common.datePreset.custom'),
  };

  const dateIsDefault = isDefaultLastNDaysRange(dateRange, RANGE_DAYS);

  const desktopFilters: SelectFilter[] = [
    ...(postEnabled
      ? [
          {
            value: statusFilter || null,
            onChange: (v: string | null) => setStatusFilter(v ?? ''),
            data: statusData,
            placeholder: t('__new__.01-common.labels.status'),
            w: 160,
          } satisfies SelectFilter,
        ]
      : []),
    {
      value: picFilter || null,
      onChange: (v: string | null) => setPicFilter(v ?? ''),
      data: picData,
      placeholder: t('common.labels.assignedTo'),
      visible: picData.length > 0,
      searchable: true,
      w: 220,
    },
  ];

  const allLabel = t('__new__.01-common.filters.all');

  const mobileFilters: MobileFilterDef[] = [
    ...(postEnabled
      ? [
          allOptionFilter({
            title: t('__new__.01-common.labels.status'),
            value: statusFilter,
            options: statusData,
            onChange: setStatusFilter,
            allLabel,
            emptyValue: '',
          }),
        ]
      : []),
    allOptionFilter({
      title: t('common.labels.assignedTo'),
      value: picFilter,
      options: picData,
      onChange: setPicFilter,
      allLabel,
      emptyValue: '',
      visible: picData.length > 0,
    }),
  ];

  const dateFilter: MoreFilterDef[] = [
    {
      type: 'dateRange',
      key: 'recordDate',
      title: t('warehouseDoc.columns.date'),
      value: dateRange,
      onChange: applyDateRange,
    },
  ];

  const clearAll = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setPicFilter('');
    applyDateRange(EMPTY_DATE_RANGE);
  }, [setSearch, applyDateRange]);

  const hasActiveFilters = !!search || !!statusFilter || !!picFilter || !dateIsDefault;

  const showSelectPills = !isMobile;
  const hasPills = (showSelectPills && (!!statusFilter || !!picFilter)) || !dateIsDefault;

  const handleForceRefresh = useCallback(() => forceRefresh(), [forceRefresh]);

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t(`${kind.i18nPrefix}.title`)}
          icon={
            <ThemeIcon size={38} radius="md" variant="light" color="primary">
              <kind.icon size={20} stroke={1.75} />
            </ThemeIcon>
          }
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={handleForceRefresh}
          createCta={{
            to: kind.routes.NEW,
            label: t('warehouseDoc.addItem'),
            enabled: canCreate,
            // The form is desktop-only (mobile redirects to the list), so hide
            // the create CTA on mobile rather than dead-end into a bounce.
          }}
        />

        {isMobile ? (
          <MobileFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('warehouseDoc.searchPlaceholder')}
            hideStatus
            filters={mobileFilters}
            moreSection={
              <MobileFilterMoreDrawer
                filters={dateFilter}
                drawerTitle={t('common.filters.more')}
                applyLabel={t('common.filters.apply')}
                presetLabels={presetLabels}
              />
            }
            hasActiveFilters={hasActiveFilters}
            onClear={clearAll}
            labelChips
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('warehouseDoc.searchPlaceholder')}
            hideStatus
            filters={desktopFilters}
            moreSection={
              <DesktopFilterMorePopover filters={dateFilter} presetLabels={presetLabels} />
            }
            hasActiveFilters={hasActiveFilters}
            onClear={clearAll}
          />
        )}

        {hasPills && (
          <Group gap="xs">
            {showSelectPills && statusFilter && (
              <FilterPill onClose={() => setStatusFilter('')}>
                {t('__new__.01-common.labels.status')}:{' '}
                {statusData.find((s) => s.value === statusFilter)?.label ?? statusFilter}
              </FilterPill>
            )}
            {showSelectPills && picFilter && (
              <FilterPill onClose={() => setPicFilter('')}>
                {t('common.labels.assignedTo')}: {picLabel(picFilter)}
              </FilterPill>
            )}
            {!dateIsDefault && (
              <FilterPill onClose={() => applyDateRange(EMPTY_DATE_RANGE)}>
                {t('warehouseDoc.columns.date')}: {formatDateRangeLabel(dateRange, presetLabels)}
              </FilterPill>
            )}
          </Group>
        )}
      </StickyListChrome>

      {isMobile ? (
        <WarehouseDocCardList
          docs={paginated}
          isLoading={loading && !initialized}
          detailRoute={kind.routes.DETAIL}
          showStatus={postEnabled}
        />
      ) : (
        <WarehouseDocDataTable
          docs={paginated}
          isLoading={loading && !initialized}
          detailRoute={kind.routes.DETAIL}
          showStatus={postEnabled}
        />
      )}

      <ListPagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </Stack>
  );
}
