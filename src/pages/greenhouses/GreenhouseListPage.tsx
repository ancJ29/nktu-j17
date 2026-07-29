import { Stack, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBuildingWarehouse } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useGreenhouseStore } from '@/stores/useGreenhouseStore';
import { useCropStore } from '@/stores/useCropStores';
import { ListPagination } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { DesktopFilterBar } from '@/components/DesktopFilterBar';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { MobileFilterBar } from '@/components/MobileFilterBar';
import { perms } from '@/utils/permission';

import { GreenhouseCardList } from './GreenhouseCardList';
import { GreenhouseDataTable } from './GreenhouseDataTable';

const isMobile = device.isMobile;
const canCreate = perms.greenhouse.canCreate();
const canViewCrops = perms.crop.canView();

type FilterStatus = 'all' | 'active' | 'inactive';

type GreenhouseFilters = { status: FilterStatus; search: string; page: number };
const FILTER_DEFAULTS: GreenhouseFilters = { status: 'active', search: '', page: 1 };

export function GreenhouseListPage() {
  const { t } = useTranslation();

  const {
    items: allGreenhouses,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useGreenhouseStore();

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:greenhouse-list-filters', FILTER_DEFAULTS);
  const filter = filterState.status;
  const setFilter = useCallback((v: FilterStatus) => updateState({ status: v }), [updateState]);
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(allGreenhouses, {
      filters: { status: filter },
      filterFn: (item, f) => {
        if (f.status === 'active' && !item.isActive) return false;
        if (f.status === 'inactive' && item.isActive) return false;
        return true;
      },
      searchFields: (item) => [item.name, item.code, item.description],
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  const hasActiveFilters = !!search || filter !== FILTER_DEFAULTS.status;

  const allCrops = useCropStore((s) => s.items);
  const cropsInitialized = useCropStore((s) => s.initialized);
  const loadCrops = useCropStore((s) => s.loadAll);
  useEffect(() => {
    if (canViewCrops && !cropsInitialized) loadCrops();
  }, [cropsInitialized, loadCrops]);

  const cropCodesByGreenhouse = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!canViewCrops) return map;
    for (const crop of allCrops) {
      const codes = map.get(crop.greenhouseCode);
      if (codes) codes.push(crop.code);
      else map.set(crop.greenhouseCode, [crop.code]);
    }
    return map;
  }, [allCrops]);

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('greenhouses.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const handleForceRefresh = useCallback(() => forceRefresh(), [forceRefresh]);

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('greenhouses.title')}
          icon={
            <ThemeIcon size={38} radius="md" variant="light" color="primary">
              <IconBuildingWarehouse size={20} stroke={1.75} />
            </ThemeIcon>
          }
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={handleForceRefresh}
          createCta={{
            to: ROUTES.GREENHOUSES.NEW,
            label: t('greenhouses.addItem'),
            enabled: canCreate,
          }}
        />

        {isMobile ? (
          <MobileFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('greenhouses.searchPlaceholder')}
            status={filter}
            onStatusChange={setFilter}
            statusTitle={t('__new__.01-common.labels.status')}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('__new__.01-common.labels.active'),
              inactive: t('__new__.01-common.labels.inactive'),
            }}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
            labelChips
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('greenhouses.searchPlaceholder')}
            status={filter}
            onStatusChange={setFilter}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('__new__.01-common.labels.active'),
              inactive: t('__new__.01-common.labels.inactive'),
            }}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />
        )}
      </StickyListChrome>

      {isMobile ? (
        <GreenhouseCardList
          greenhouses={paginated}
          isLoading={loading && !initialized}
          cropCodesByGreenhouse={canViewCrops ? cropCodesByGreenhouse : undefined}
        />
      ) : (
        <GreenhouseDataTable
          greenhouses={paginated}
          isLoading={loading && !initialized}
          cropCodesByGreenhouse={canViewCrops ? cropCodesByGreenhouse : undefined}
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
