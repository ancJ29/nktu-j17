import { Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { DesktopFilterBar, type SelectFilter } from '@/components/DesktopFilterBar';
import { ListPageHeader } from '@/components/ListPageHeader';
import { ListPagination } from '@/components/custom/ListPagination';
import {
  MobileFilterBar,
  type MobileFilterDef,
  type MobileMultiFilterDef,
} from '@/components/MobileFilterBar';
import { allOptionFilter } from '@/components/mobileFilterDefs';
import { QuickFilterChips, type QuickFilterChip } from '@/components/QuickFilterChips';
import { StickyListChrome } from '@/components/StickyListChrome';
import {
  LIST_LAZY_RENDER_CHUNK,
  LIST_PAGE_SIZE,
  LIST_PAGINATION_DEFAULT,
  LIST_PAGINATION_MIN_ROWS,
} from '@/config/listDefaults';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import {
  hasEmailForEmployees,
  hasDepartmentForEmployees,
  hasPositionForEmployees,
  perms,
} from '@/utils/permission';

import { EmployeeCardList } from '@/pages/employees/EmployeeCardList';
import { EmployeeDataTable } from '@/pages/employees/EmployeeDataTable';
import { useEmployeeFieldOptions } from '@/pages/employees/useEmployeeFieldOptions';

const hasEmail = hasEmailForEmployees();
const hasDepartment = hasDepartmentForEmployees();
const hasPosition = hasPositionForEmployees();
const isMobile = device.isMobile;
const canCreate = perms.employee.canCreate();

type FilterStatus = 'all' | 'active' | 'inactive';

type EmployeeFilters = {
  status: FilterStatus;
  department: string | null;
  position: string | null;
  search: string;
  page: number;
};

const FILTER_DEFAULTS: EmployeeFilters = {
  status: 'all',
  department: null,
  position: null,
  search: '',
  page: 1,
};

const FILTER_CACHE_KEY = 'cmngt:employee-v2-list-filters';

export function EmployeeV2ListPage() {
  const { t } = useTranslation();
  const scrollViewportRef = useListScrollRestoration(ROUTES.EMPLOYEES.LIST);
  const { departmentOptions, positionOptions, resolveDepartment, resolvePosition } =
    useEmployeeFieldOptions();

  const { items, loading, initialized, error, cachedAt, loadAll, forceRefresh } =
    useEmployeeStore();

  useEffect(() => {
    if (!initialized && !error) void loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('employees.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const live = useMemo(() => items.filter((e) => !e.extra?.isDeleted), [items]);

  const shouldPagination = LIST_PAGINATION_DEFAULT && live.length >= LIST_PAGINATION_MIN_ROWS;

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters(FILTER_CACHE_KEY, FILTER_DEFAULTS);

  const setFilter = useCallback((v: FilterStatus) => updateState({ status: v }), [updateState]);
  const setDepartmentFilter = useCallback(
    (v: string | null) => updateState({ department: v }),
    [updateState],
  );
  const setPositionFilter = useCallback(
    (v: string | null) => updateState({ position: v }),
    [updateState],
  );
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  const filters = useMemo(
    () => ({
      status: filterState.status,
      department: filterState.department,
      position: filterState.position,
    }),
    [filterState.status, filterState.department, filterState.position],
  );

  const searchFields = useCallback(
    (e: (typeof live)[number]) => [
      e.name,
      e.code,
      ...(hasEmail ? [e.email] : []),
      e.position,
      resolvePosition(e.position),
      e.department,
      resolveDepartment(e.department),
    ],
    [resolvePosition, resolveDepartment],
  );

  const {
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    paginated,
    totalPages,
    totalItems,
    hasMore,
    loadMore,
  } = useListFilter(live, {
    shouldPagination,
    pageSize: LIST_PAGE_SIZE,
    filters,
    filterFn: (e, f) => {
      if (f.status === 'active' && !e.isActive) return false;
      if (f.status === 'inactive' && e.isActive) return false;
      if (f.department && e.department !== f.department) return false;
      if (f.position && e.position !== f.position) return false;
      return true;
    },

    searchFields,
    search: filterState.search,
    onSearchChange,
    page: filterState.page,
    onPageChange,

    lazyKey: ROUTES.EMPLOYEES.LIST,
  });

  const hasActiveFilters =
    !!search ||
    filterState.status !== FILTER_DEFAULTS.status ||
    filterState.department !== null ||
    filterState.position !== null;

  const inactiveCount = useMemo(() => live.filter((e) => !e.isActive).length, [live]);
  const chips = useMemo<QuickFilterChip[]>(() => {
    const showing = filterState.status === 'inactive';
    if (inactiveCount === 0 && !showing) return [];
    return [
      {
        key: 'inactive',
        label: t('__new__.07-entities.employees.filter.inactive'),
        active: showing,
        color: 'orange',
        onClick: () => setFilter(showing ? 'all' : 'inactive'),
      },
    ];
  }, [inactiveCount, filterState.status, setFilter, t]);

  const desktopFilters: SelectFilter[] = useMemo(
    () => [
      ...(hasDepartment && departmentOptions.length > 0
        ? [
            {
              value: filterState.department,
              onChange: setDepartmentFilter,
              data: departmentOptions,
              placeholder: t('employees.filterDepartmentAll'),
              w: 200,
            },
          ]
        : []),
      ...(hasPosition && positionOptions.length > 0
        ? [
            {
              value: filterState.position,
              onChange: setPositionFilter,
              data: positionOptions,
              placeholder: t('employees.filterPositionAll'),
              w: 200,
            },
          ]
        : []),
    ],
    [
      filterState.department,
      setDepartmentFilter,
      departmentOptions,
      filterState.position,
      setPositionFilter,
      positionOptions,
      t,
    ],
  );

  const mobileFilters: (MobileFilterDef | MobileMultiFilterDef)[] = useMemo(
    () => [
      ...(hasDepartment && departmentOptions.length > 0
        ? [
            allOptionFilter({
              title: t('common.labels.department'),
              value: filterState.department,
              options: departmentOptions,
              onChange: setDepartmentFilter,
              allLabel: t('common.filters.all'),
              emptyValue: null,
            }),
          ]
        : []),
      ...(hasPosition && positionOptions.length > 0
        ? [
            allOptionFilter({
              title: t('common.labels.position'),
              value: filterState.position,
              options: positionOptions,
              onChange: setPositionFilter,
              allLabel: t('common.filters.all'),
              emptyValue: null,
            }),
          ]
        : []),
    ],
    [
      filterState.department,
      setDepartmentFilter,
      departmentOptions,
      filterState.position,
      setPositionFilter,
      positionOptions,
      t,
    ],
  );

  const loadingMoreLabel = t('__new__.01-common.list.loadingMore', {
    chunk: Math.min(totalItems - paginated.length, LIST_LAZY_RENDER_CHUNK),
    total: totalItems,
  });

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('__new__.07-entities.employees.title')}
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={forceRefresh}
          createCta={{
            to: ROUTES.EMPLOYEES.NEW,
            label: t('employees.addEmployee'),
            enabled: canCreate,
          }}
        />
        {/* Between the header and the bar (filter-pattern § 11), on both
            viewports — `QuickFilterChips` is viewport-agnostic and renders
            nothing when there is no chip to draw. */}
        <QuickFilterChips chips={chips} />
        {isMobile ? (
          <MobileFilterBar
            recordCount={live.length}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.employees.list.searchPlaceholder')}
            status={filterState.status}
            onStatusChange={setFilter}
            statusTitle={t('__new__.01-common.labels.status')}
            statusLabels={{
              all: t('common.filters.all'),
              active: t('__new__.01-common.labels.active'),
              inactive: t('__new__.07-entities.employees.filter.inactive'),
            }}
            filters={mobileFilters.length > 0 ? mobileFilters : undefined}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
            labelChips
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.employees.list.searchPlaceholder')}
            status={filterState.status}
            onStatusChange={setFilter}
            statusLabels={{
              all: t('common.filters.all'),
              active: t('__new__.01-common.labels.active'),
              inactive: t('__new__.07-entities.employees.filter.inactive'),
            }}
            filters={desktopFilters.length > 0 ? desktopFilters : undefined}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />
        )}
      </StickyListChrome>

      {isMobile ? (
        <EmployeeCardList
          employees={paginated}
          isLoading={loading && !initialized}
          resolveDepartment={resolveDepartment}
          resolvePosition={resolvePosition}
        />
      ) : (
        <EmployeeDataTable
          employees={paginated}
          isLoading={loading && !initialized}
          resolveDepartment={resolveDepartment}
          resolvePosition={resolvePosition}
          viewportRef={scrollViewportRef}
          hasMore={hasMore}
          onLoadMore={loadMore}
          loadingMoreLabel={loadingMoreLabel}
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
