import { Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useVendorStore } from '@/stores/useVendorStore';
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
import { VendorCardList } from './VendorCardList';
import { VendorDataTable } from './VendorDataTable';
import type { VendorListVariant } from './vendorListVariant';

const isMobile = device.isMobile;
const canCreate = perms.vendor.canCreate();

type FilterStatus = 'all' | 'active' | 'inactive';

type OriginFilter = 'all' | 'domestic' | 'overseas';

const LEGACY_ORIGIN_TOKENS: Partial<Record<string, OriginFilter>> = {
  vn: 'domestic',
  cn: 'overseas',
};

type VendorFilters = {
  status: FilterStatus;
  origin: OriginFilter;
  search: string;
  page: number;
};
const FILTER_DEFAULTS: VendorFilters = { status: 'all', origin: 'all', search: '', page: 1 };

type VendorListProps = {
  readonly variant: VendorListVariant;
};

export function VendorList({ variant }: VendorListProps) {
  const { t } = useTranslation();
  const scrollViewportRef = useListScrollRestoration(ROUTES.VENDORS.LIST);
  const {
    items: allVendors,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useVendorStore();

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:vendor-list-filters', FILTER_DEFAULTS);
  const filter = filterState.status;
  const originFilter = LEGACY_ORIGIN_TOKENS[filterState.origin] ?? filterState.origin;
  const setFilter = useCallback((v: FilterStatus) => updateState({ status: v }), [updateState]);
  const setOrigin = useCallback((v: OriginFilter) => updateState({ origin: v }), [updateState]);
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(allVendors, {
      filters: { status: filter, origin: originFilter },
      filterFn: (item, f) => {
        if (item.extra?.isDeleted) return false;
        if (f.status === 'active' && !item.isActive) return false;
        if (f.status === 'inactive' && item.isActive) return false;

        const isDomestic = item.extra?.isDomestic ?? true;
        if (f.origin === 'domestic' && !isDomestic) return false;
        if (f.origin === 'overseas' && isDomestic) return false;
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
        title: t('vendors.notifications.fetchError'),
        message: '',
      });
  }, [error, t]);

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('common.labels.vendor')}
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={forceRefresh}
          createCta={{
            to: ROUTES.VENDORS.NEW,
            label: t('vendors.addItem'),
            enabled: canCreate,

            mobileVariant: 'hidden',
          }}
        />

        {isMobile ? (
          <MobileFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.vendors.list.searchPlaceholder')}
            status={filter}
            onStatusChange={setFilter}
            statusTitle={t('__new__.01-common.labels.status')}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('common.filters.active'),
              inactive: t('common.filters.inactive'),
            }}
            filters={
              variant.origin
                ? [
                    {
                      title: t('vendors.form.originLabel'),
                      value: originFilter,
                      options: [
                        { value: 'all', label: t('__new__.01-common.filters.all') },
                        { value: 'domestic', label: t(variant.origin.domestic) },
                        { value: 'overseas', label: t(variant.origin.overseas) },
                      ],
                      onChange: (v) => setOrigin(v as OriginFilter),
                    },
                  ]
                : undefined
            }
            onClear={clearFilters}
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.vendors.list.searchPlaceholder')}
            status={filter}
            onStatusChange={setFilter}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('common.filters.active'),
              inactive: t('common.filters.inactive'),
            }}
            filters={
              variant.origin
                ? [
                    {
                      value: originFilter === 'all' ? null : originFilter,
                      onChange: (v) => setOrigin((v ?? 'all') as OriginFilter),
                      data: [
                        { value: 'domestic', label: t(variant.origin.domestic) },
                        { value: 'overseas', label: t(variant.origin.overseas) },
                      ],
                      placeholder: t('vendors.form.originLabel'),
                    },
                  ]
                : undefined
            }
            onClear={clearFilters}
          />
        )}
      </StickyListChrome>

      {isMobile ? (
        <VendorCardList
          vendors={paginated}
          isLoading={loading && !initialized}
          origin={variant.origin}
        />
      ) : (
        <VendorDataTable
          vendors={paginated}
          isLoading={loading && !initialized}
          origin={variant.origin}
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
