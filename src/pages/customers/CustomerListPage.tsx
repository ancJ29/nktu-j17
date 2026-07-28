import { Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { ListPagination } from '@/components/custom/ListPagination';
import { device } from '@credo/base-ui/utils';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { DesktopFilterBar } from '@/components/DesktopFilterBar';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { MobileFilterBar } from '@/components/MobileFilterBar';
import { perms } from '@/utils/permission';

import { useListScrollRestoration } from '@/hooks';
import { CustomerCardList } from './CustomerCardList';
import { CustomerDataTable } from './CustomerDataTable';

const isMobile = device.isMobile;
const canCreate = perms.customer.canCreate();

type FilterStatus = 'all' | 'active' | 'inactive';

type CustomerFilters = {
  status: FilterStatus;
  search: string;
  page: number;
};
const FILTER_DEFAULTS: CustomerFilters = { status: 'all', search: '', page: 1 };

export function CustomerListPage() {
  const { t } = useTranslation();
  const scrollViewportRef = useListScrollRestoration(ROUTES.CUSTOMERS.LIST);
  const {
    items: allCustomers,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useCustomerStore();

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:customer-list-filters', FILTER_DEFAULTS);
  const filter = filterState.status;
  const setFilter = useCallback((v: FilterStatus) => updateState({ status: v }), [updateState]);
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);

  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(allCustomers, {
      filters: { status: filter },
      filterFn: (item, f) => {
        if (item.extra?.isDeleted) return false;
        if (f.status === 'active' && !item.isActive) return false;
        if (f.status === 'inactive' && item.isActive) return false;
        return true;
      },
      searchFields: (item) => [
        item.name,
        item.code,
        item.extra?.shortName,
        item.phone,
        item.contactPerson,
        item.address,
      ],
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (error)
      notifications.show({
        color: 'red',
        title: t('customers.notifications.fetchError'),
        message: '',
      });
  }, [error, t]);

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('common.labels.customer')}
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={forceRefresh}
          createCta={{
            to: ROUTES.CUSTOMERS.NEW,
            label: t('customers.addItem'),
            enabled: canCreate,
            mobileVariant: 'icon',
          }}
        />

        {isMobile ? (
          <MobileFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.customers.list.searchPlaceholder')}
            status={filter}
            onStatusChange={setFilter}
            statusTitle={t('__new__.01-common.labels.status')}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('common.filters.active'),
              inactive: t('common.filters.inactive'),
            }}
            onClear={clearFilters}
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.customers.list.searchPlaceholder')}
            status={filter}
            onStatusChange={setFilter}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('common.filters.active'),
              inactive: t('common.filters.inactive'),
            }}
            onClear={clearFilters}
          />
        )}
      </StickyListChrome>

      {isMobile ? (
        <CustomerCardList customers={paginated} isLoading={loading && !initialized} />
      ) : (
        <CustomerDataTable
          customers={paginated}
          isLoading={loading && !initialized}
          viewportRef={scrollViewportRef}
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
