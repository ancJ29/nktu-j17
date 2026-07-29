import { Badge, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMapPin } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useLocationStore } from '@/stores/useLocationStore';
import { ListPagination } from '@/components/custom/ListPagination';
import { device } from '@credo/base-ui/utils';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { DesktopFilterBar } from '@/components/DesktopFilterBar';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { MobileFilterBar } from '@/components/MobileFilterBar';
import { perms } from '@/utils/permission';

import { LocationCardList } from './LocationCardList';
import { LocationDataTable } from './LocationDataTable';

const isMobile = device.isMobile;
const canCreate = perms.location.canCreate();

type FilterStatus = 'all' | 'active' | 'inactive';

type LocationFilters = { status: FilterStatus; search: string; page: number };
const FILTER_DEFAULTS: LocationFilters = { status: 'all', search: '', page: 1 };

export function LocationListPage() {
  const { t } = useTranslation();

  const {
    items: allLocations,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useLocationStore();

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:location-list-filters', FILTER_DEFAULTS);
  const filter = filterState.status;
  const setFilter = useCallback((v: FilterStatus) => updateState({ status: v }), [updateState]);
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(allLocations, {
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
        item.description,
        item.address,
        item.extra?.kind ?? '',
      ],
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  const { totalCount, inactiveCount } = useMemo(() => {
    let inactive = 0;
    for (const l of allLocations) if (!l.isActive) inactive++;
    return { totalCount: allLocations.length, inactiveCount: inactive };
  }, [allLocations]);

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('locations.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const handleForceRefresh = useCallback(() => forceRefresh(), [forceRefresh]);

  return (
    <>
      <Stack gap={isMobile ? 'md' : 'lg'}>
        <StickyListChrome>
          <ListPageHeader
            title={t('locations.title')}
            icon={
              <ThemeIcon size={38} radius="md" variant="light" color="primary">
                <IconMapPin size={20} stroke={1.75} />
              </ThemeIcon>
            }
            subtitle={
              initialized && totalCount > 0 ? (
                <Group gap={6} wrap="nowrap">
                  <Text size="xs" c="dimmed">
                    {t('locations.summary.total', { count: totalCount })}
                  </Text>
                  {inactiveCount > 0 && (
                    <Badge size="xs" variant="light" color="gray" radius="sm" tt="lowercase">
                      {inactiveCount} {t('__new__.01-common.labels.inactive')}
                    </Badge>
                  )}
                </Group>
              ) : undefined
            }
            cachedAt={cachedAt}
            loading={loading}
            onRefresh={handleForceRefresh}
            createCta={{
              to: ROUTES.LOCATIONS.NEW,
              label: t('locations.addItem'),
              enabled: canCreate,
            }}
          />

          {isMobile ? (
            <MobileFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('__new__.07-entities.locations.list.searchPlaceholder')}
              status={filter}
              onStatusChange={setFilter}
              statusTitle={t('__new__.01-common.labels.status')}
              statusLabels={{
                all: t('__new__.01-common.filters.all'),
                active: t('__new__.01-common.labels.active'),
                inactive: t('__new__.01-common.labels.inactive'),
              }}
              onClear={clearFilters}
              labelChips
            />
          ) : (
            <DesktopFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('__new__.07-entities.locations.list.searchPlaceholder')}
              status={filter}
              onStatusChange={setFilter}
              statusLabels={{
                all: t('__new__.01-common.filters.all'),
                active: t('__new__.01-common.labels.active'),
                inactive: t('__new__.01-common.labels.inactive'),
              }}
              onClear={clearFilters}
            />
          )}
        </StickyListChrome>

        {isMobile ? (
          <LocationCardList locations={paginated} isLoading={loading && !initialized} />
        ) : (
          <LocationDataTable locations={paginated} isLoading={loading && !initialized} />
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
