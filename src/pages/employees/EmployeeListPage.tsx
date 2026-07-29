import { Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import {
  hasEmailForEmployees,
  hasDepartmentForEmployees,
  hasPositionForEmployees,
  perms,
} from '@/utils/permission';
import { ListPagination } from '@/components/custom/ListPagination';
import { device } from '@credo/base-ui/utils';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import {
  MobileFilterBar,
  type MobileFilterDef,
  type MobileMultiFilterDef,
} from '@/components/MobileFilterBar';
import { allOptionFilter } from '@/components/mobileFilterDefs';

import { EmployeeCardList } from './EmployeeCardList';
import { EmployeeDataTable } from './EmployeeDataTable';
import { DesktopFilterBar, type SelectFilter } from '@/components/DesktopFilterBar';
import { useEmployeeFieldOptions } from './useEmployeeFieldOptions';

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

export function EmployeeListPage() {
  const { t } = useTranslation();
  const { departmentOptions, positionOptions, resolveDepartment, resolvePosition } =
    useEmployeeFieldOptions();

  const {
    items: allEmployees,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useEmployeeStore();

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:employee-list-filters', FILTER_DEFAULTS);
  const filter = filterState.status;
  const departmentFilter = filterState.department;
  const positionFilter = filterState.position;
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

  const filters = { status: filter, department: departmentFilter, position: positionFilter };

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(allEmployees, {
      filters,
      filterFn: (e, f) => {
        if (e.extra?.isDeleted) return false;
        if (f.status === 'active' && !e.isActive) return false;
        if (f.status === 'inactive' && e.isActive) return false;
        if (f.department && e.department !== f.department) return false;
        if (f.position && e.position !== f.position) return false;
        return true;
      },

      searchFields: (e) => [
        e.name,
        e.code,
        ...(hasEmail ? [e.email] : []),
        e.position,
        resolvePosition(e.position),
        e.department,
        resolveDepartment(e.department),
      ],
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  useEffect(() => {
    if (!initialized && !error) {
      loadAll();
    }
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

  const handleForceRefresh = useCallback(() => {
    forceRefresh();
  }, [forceRefresh]);

  const desktopFilters: SelectFilter[] = useMemo(
    () => [
      ...(hasDepartment && departmentOptions.length > 0
        ? [
            {
              value: departmentFilter,
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
              value: positionFilter,
              onChange: setPositionFilter,
              data: positionOptions,
              placeholder: t('employees.filterPositionAll'),
              w: 200,
            },
          ]
        : []),
    ],
    [
      departmentFilter,
      setDepartmentFilter,
      departmentOptions,
      positionFilter,
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
              value: departmentFilter,
              options: departmentOptions,
              onChange: setDepartmentFilter,
              allLabel: t('__new__.01-common.filters.all'),
              emptyValue: null,
            }),
          ]
        : []),
      ...(hasPosition && positionOptions.length > 0
        ? [
            allOptionFilter({
              title: t('common.labels.position'),
              value: positionFilter,
              options: positionOptions,
              onChange: setPositionFilter,
              allLabel: t('__new__.01-common.filters.all'),
              emptyValue: null,
            }),
          ]
        : []),
    ],
    [
      departmentFilter,
      setDepartmentFilter,
      departmentOptions,
      positionFilter,
      setPositionFilter,
      positionOptions,
      t,
    ],
  );

  return (
    <>
      <Stack gap={isMobile ? 'md' : 'lg'}>
        <StickyListChrome>
          <ListPageHeader
            title={t('__new__.07-entities.employees.title')}
            cachedAt={cachedAt}
            loading={loading}
            onRefresh={handleForceRefresh}
            createCta={{
              to: ROUTES.EMPLOYEES.NEW,
              label: t('employees.addEmployee'),
              enabled: canCreate,
              // Hidden on mobile: the form page redirects mobile users straight
              // back to this list, so the "+" was a dead tap that only showed a
              // spinner. Creating an employee is desktop/tablet data entry.
            }}
          />

          {isMobile ? (
            <MobileFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('__new__.07-entities.employees.list.searchPlaceholder')}
              status={filter}
              onStatusChange={setFilter}
              statusTitle={t('__new__.01-common.labels.status')}
              statusLabels={{
                all: t('__new__.01-common.filters.all'),
                active: t('__new__.01-common.labels.active'),
                inactive: t('__new__.07-entities.employees.filter.inactive'),
              }}
              filters={mobileFilters.length > 0 ? mobileFilters : undefined}
              onClear={clearFilters}

              labelChips
            />
          ) : (
            <DesktopFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('__new__.07-entities.employees.list.searchPlaceholder')}
              status={filter}
              onStatusChange={setFilter}
              statusLabels={{
                all: t('__new__.01-common.filters.all'),
                active: t('__new__.01-common.labels.active'),
                inactive: t('__new__.07-entities.employees.filter.inactive'),
              }}
              filters={desktopFilters.length > 0 ? desktopFilters : undefined}
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
    </>
  );
}
